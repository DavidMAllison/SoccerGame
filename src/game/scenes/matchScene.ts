import type { Scene } from '../../engine/scene.js'
import type { MatchState, MatchConfig, Player, ControllerState } from '../types.js'
import { readP1, readP2 } from '../../engine/input.js'
import { playSfx } from '../../engine/audio.js'
import { submitScore } from '../../net/leaderboard.js'
import { submitSimulation } from '../../net/simulations.js'
import { GAME_W, GAME_H } from '../../engine/renderer.js'
import { PITCH_W, PITCH_H, PITCH_Y, DEFAULT_HALF_LENGTH, PLAYER_RADIUS } from '../constants.js'
import { getCountry } from '../countries.js'
import { applyControl, tryKick, trySlide } from '../systems/playerControl.js'
import { createCamera, updateCameraForMatch, type Camera } from '../systems/camera.js'
import { tickBall } from '../systems/ballPhysics.js'
import { lockBallToOwner, checkPossession } from '../systems/collisions.js'
import { onGoal, tickRules, startPlay } from '../systems/rules.js'
import { drawPitch } from '../render/pitch.js'
import { drawPlayer, drawBall } from '../render/sprites.js'
import { drawHud } from '../render/hud.js'
import { assignRoles, type RoleMap } from '../ai/coordinator.js'
import { keeperControl } from '../ai/goalkeeper.js'
import { fieldPlayerControl } from '../ai/fieldPlayer.js'

interface AIContext {
  roles: [RoleMap, RoleMap]  // [team0, team1]
  ticksSinceUpdate: number
}

const COORDINATOR_INTERVAL = 6  // re-assign roles every 6 ticks (~10Hz)

const DEFAULT_CONFIG: MatchConfig = {
  teams: [getCountry('RED', 0), getCountry('BLU', 1)],
  playerName: '',
  matchId: null,
  returnUrl: null,
}

function initState(config: MatchConfig = DEFAULT_CONFIG): MatchState {
  const cy = PITCH_Y + PITCH_H / 2
  const cx = PITCH_W / 2

  const mk = (id: number, team: 0 | 1, x: number, y: number, isKeeper = false): Player => ({
    id, team,
    pos: { x, y },
    vel: { x: 0, y: 0 },
    facing: { x: team === 0 ? 1 : -1, y: 0 },
    hasBall: false, isActive: false, isKeeper,
    slideTimer: 0, kickCooldown: 0,
    skin: Math.floor(Math.random() * 8),
  })

  const players: Player[] = [
    mk(0, 0, 16,            cy,          true),
    mk(1, 0, 80,            PITCH_Y + 55),
    mk(2, 0, 80,            PITCH_Y + 145),
    mk(3, 0, cx - 30,       PITCH_Y + 70),
    mk(4, 0, cx - 30,       PITCH_Y + 130),
    mk(5, 1, PITCH_W - 16,  cy,          true),
    mk(6, 1, PITCH_W - 80,  PITCH_Y + 55),
    mk(7, 1, PITCH_W - 80,  PITCH_Y + 145),
    mk(8, 1, cx + 30,       PITCH_Y + 70),
    mk(9, 1, cx + 30,       PITCH_Y + 130),
  ]
  players[3].isActive = true
  players[8].isActive = true

  return {
    phase: 'kickoff', phaseTimer: 0,
    half: 1, matchTimer: DEFAULT_HALF_LENGTH,
    score: [0, 0], players,
    ball: { pos: { x: cx, y: cy }, vel: { x: 0, y: 0 }, z: 0, vz: 0, owner: null },
    activePlayer: [3, 8],
    halfLength: DEFAULT_HALF_LENGTH, difficulty: 1,
    config,
  }
}

function nearestTeammate(state: MatchState, team: 0 | 1, excludeId: number): number {
  let bestId = excludeId
  let bestDist = Infinity
  for (const p of state.players) {
    if (p.team !== team || p.id === excludeId) continue
    const dx = p.pos.x - state.ball.pos.x
    const dy = p.pos.y - state.ball.pos.y
    const d = dx * dx + dy * dy
    if (d < bestDist) { bestDist = d; bestId = p.id }
  }
  return bestId
}

function switchActive(state: MatchState, team: 0 | 1) {
  const current = state.activePlayer[team]
  if (state.ball.owner === current) return
  const next = nearestTeammate(state, team, current)
  if (next === current) return
  state.players.find(p => p.id === current)!.isActive = false
  state.players.find(p => p.id === next)!.isActive = true
  state.activePlayer[team] = next
}

// Arcade name-entry: 3 alphanumeric chars
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

interface NameEntry {
  chars: [number, number, number]  // indices into CHARS
  cursor: number                   // 0-2
  submitted: boolean
  blink: number
}

export class MatchScene implements Scene {
  private state!: MatchState
  private cam: Camera = createCamera()
  private p1APrev = false
  private p2APrev = false
  private switchCooldown = [0, 0]
  private cpu: 0 | 1 | null = 1
  private aiCtx: AIContext = { roles: [new Map(), new Map()], ticksSinceUpdate: 0 }
  private nameEntry: NameEntry | null = null
  private simSubmitted = false

  constructor(private matchConfig: MatchConfig = DEFAULT_CONFIG) {}

  onEnter() {
    this.state = initState(this.matchConfig)
    this.cam = createCamera()
    this.cam.x = PITCH_W / 2 - 128
    this.p1APrev = false
    this.p2APrev = false
    this.switchCooldown = [0, 0]
    this.aiCtx = { roles: [new Map(), new Map()], ticksSinceUpdate: 0 }
    this.nameEntry = null
    this.simSubmitted = false

    if (this.matchConfig.simulate) this.runSimulation()
  }

  private runSimulation() {
    const { state } = this
    const DT = 1 / 60

    let ticks = 0
    while (state.phase !== 'fulltime' && ticks++ < 30000) {
      // Auto-start kickoff phases (both halves)
      if (state.phase === 'kickoff') startPlay(state)

      if (state.phase === 'goal_celebration') {
        tickRules(state, DT)
        continue
      }

      // Coordinator at 10Hz
      this.aiCtx.ticksSinceUpdate++
      if (this.aiCtx.ticksSinceUpdate >= COORDINATOR_INTERVAL) {
        this.aiCtx.roles[0] = assignRoles(state, 0)
        this.aiCtx.roles[1] = assignRoles(state, 1)
        this.aiCtx.ticksSinceUpdate = 0
      }

      // All players: full AI including kicks
      for (const p of state.players) {
        const ctrl = this.getCpuControl(p)
        tryKick(p, state.ball, ctrl)
        if (!p.hasBall) trySlide(p, ctrl)
        applyControl(p, ctrl, DT)
      }

      lockBallToOwner(state)
      const goalEvent = tickBall(state, DT)
      if (goalEvent) {
        onGoal(state, goalEvent)
      } else {
        checkPossession(state)
      }

      tickRules(state, DT)

      if (state.phase === 'play') {
        state.matchTimer = Math.max(0, state.matchTimer - DT)
      }
    }

    // Submit result
    const { matchId, teams, returnUrl } = this.matchConfig
    if (matchId && !this.simSubmitted) {
      this.simSubmitted = true
      submitSimulation({
        playerName: 'SIMULATION',
        matchId,
        team0: teams[0].code,
        team1: teams[1].code,
        score0: state.score[0],
        score1: state.score[1],
        playedAs: 0,
        ts: Date.now(),
      }).catch(() => {})
    }

    // Redirect after a brief pause so the result is visible
    if (returnUrl) {
      setTimeout(() => { window.location.href = returnUrl }, 1500)
    }
  }

  private getCpuControl(player: Player): ControllerState {
    const { state } = this
    if (player.isKeeper) {
      return keeperControl(player, state, state.difficulty)
    }
    const role = this.aiCtx.roles[player.team].get(player.id) ?? 'support'
    return fieldPlayerControl(player, role, state, state.difficulty)
  }

  tick(_dt: number) {
    if (this.matchConfig.simulate) return  // sim ran synchronously in onEnter

    const dt = _dt
    const { state } = this

    // Name entry at fulltime
    if (state.phase === 'fulltime') {
      this.tickNameEntry(dt)
      return
    }

    // During goal celebration: only tick the countdown, freeze everything else.
    // Skipping tickBall here prevents the ball (still past the goal line) from
    // firing a new goal event every tick for the full celebration duration.
    if (state.phase === 'goal_celebration') {
      tickRules(state, dt)
      return
    }

    const p1 = readP1()
    const p2 = readP2()

    // Kickoff start
    if (state.phase === 'kickoff' && (p1.a || p1.b || p2.a || p2.b)) {
      startPlay(state)
    }

    // Update coordinator at 10Hz
    this.aiCtx.ticksSinceUpdate++
    if (this.aiCtx.ticksSinceUpdate >= COORDINATOR_INTERVAL) {
      this.aiCtx.roles[0] = assignRoles(state, 0)
      this.aiCtx.roles[1] = assignRoles(state, 1)
      this.aiCtx.ticksSinceUpdate = 0
    }

    // Switch cooldowns
    if (this.switchCooldown[0] > 0) this.switchCooldown[0] -= dt
    if (this.switchCooldown[1] > 0) this.switchCooldown[1] -= dt

    // Human player switching (rising edge on A)
    const p1AJust = p1.a && !this.p1APrev
    const p2AJust = p2.a && !this.p2APrev

    if (this.cpu !== 0 && p1AJust && state.ball.owner !== state.activePlayer[0] && this.switchCooldown[0] <= 0) {
      switchActive(state, 0)
      this.switchCooldown[0] = 0.25
    }
    if (this.cpu !== 1 && p2AJust && state.ball.owner !== state.activePlayer[1] && this.switchCooldown[1] <= 0) {
      switchActive(state, 1)
      this.switchCooldown[1] = 0.25
    }
    this.p1APrev = p1.a
    this.p2APrev = p2.a

    // Per-player tick
    for (const p of state.players) {
      let ctrl: ControllerState

      if (p.team === this.cpu) {
        // CPU-controlled team: all players get AI input
        ctrl = this.getCpuControl(p)
      } else {
        // Human team: active player gets human input;
        // non-active players use AI positioning (movement only, never kick)
        if (p.id === state.activePlayer[p.team]) {
          ctrl = p.team === 0 ? p1 : p2
        } else {
          const aiCtrl = this.getCpuControl(p)
          ctrl = { dx: aiCtrl.dx, dy: aiCtrl.dy, a: false, b: false }
        }
      }

      const kicked = tryKick(p, state.ball, ctrl)
      if (kicked) playSfx('kick')

      if (!p.hasBall && trySlide(p, ctrl)) playSfx('tackle')

      applyControl(p, ctrl, dt)
    }

    // Ball
    lockBallToOwner(state)
    const goalEvent = tickBall(state, dt)

    if (goalEvent) {
      playSfx('goal')
      onGoal(state, goalEvent)
    } else {
      checkPossession(state)
      this.checkSlideTackle(state)
      // Auto-switch human team to whoever just picked up the ball
      this.autoSwitchToBallCarrier()
    }

    tickRules(state, dt)

    if (state.phase === 'play') {
      state.matchTimer = Math.max(0, state.matchTimer - dt)
    }

    const activeP1 = state.players.find(p => p.id === state.activePlayer[0])!
    updateCameraForMatch(this.cam, state.ball.pos.x, activeP1.pos.x, state.ball.owner !== null)
  }

  private autoSwitchToBallCarrier() {
    const { state } = this
    if (state.ball.owner === null) return
    const owner = state.players.find(p => p.id === state.ball.owner)
    if (!owner || owner.team === this.cpu) return  // CPU team — no switch
    const team = owner.team
    if (owner.id === state.activePlayer[team]) return  // already active
    state.players.find(p => p.id === state.activePlayer[team])!.isActive = false
    owner.isActive = true
    state.activePlayer[team] = owner.id
  }

  private checkSlideTackle(state: MatchState) {
    if (state.ball.owner !== null) return
    for (const p of state.players) {
      if (p.slideTimer <= 0) continue
      const dx = p.pos.x - state.ball.pos.x
      const dy = p.pos.y - state.ball.pos.y
      if (Math.sqrt(dx * dx + dy * dy) < PLAYER_RADIUS + 6) {
        for (const q of state.players) q.hasBall = false
        state.ball.owner = p.id
        p.hasBall = true
        p.kickCooldown = 0.2
        break
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number) {
    const { state, cam } = this

    if (this.matchConfig.simulate) {
      drawSimOverlay(ctx, state)
      return
    }

    drawPitch(ctx, cam.x)

    const sorted = [...state.players].sort((a, b) => a.pos.y - b.pos.y)
    for (const p of sorted) drawPlayer(ctx, p, cam, state.config.teams)

    drawBall(ctx, state.ball, cam)
    drawHud(ctx, state)

    if (state.phase === 'goal_celebration') drawGoalOverlay(ctx, state)
    else if (state.phase === 'fulltime')    drawFulltimeOverlay(ctx, state, this.nameEntry)
  }

  private tickNameEntry(dt: number) {
    const { state } = this
    const { matchId, playerName, returnUrl, teams } = state.config

    if (matchId) {
      // Auto-submit once on first fulltime tick
      if (!this.simSubmitted) {
        this.simSubmitted = true
        submitSimulation({
          playerName: playerName || 'ANON',
          matchId,
          team0: teams[0].code,
          team1: teams[1].code,
          score0: state.score[0],
          score1: state.score[1],
          playedAs: 0,
          ts: Date.now(),
        }).catch(() => {})
      }
      // Z to return to pool site
      const p1 = readP1()
      if (p1.a && !this.p1APrev && returnUrl) {
        window.location.href = returnUrl
      }
      this.p1APrev = p1.a
      return
    }

    // Standalone mode: arcade name entry
    if (!this.nameEntry) {
      this.nameEntry = { chars: [0, 0, 0], cursor: 0, submitted: false, blink: 0 }
    }
    const ne = this.nameEntry
    if (ne.submitted) {
      const p1 = readP1()
      // Z to play again
      if (p1.a && !this.p1APrev && returnUrl) {
        window.location.href = returnUrl
      }
      this.p1APrev = p1.a
      return
    }

    ne.blink += dt

    const p1 = readP1()

    if (ne.blink > 0.12) {
      ne.blink = 0
      if (p1.dy < 0) ne.chars[ne.cursor] = (ne.chars[ne.cursor] - 1 + CHARS.length) % CHARS.length
      if (p1.dy > 0) ne.chars[ne.cursor] = (ne.chars[ne.cursor] + 1) % CHARS.length
    }

    if (p1.a && !this.p1APrev) {
      if (ne.cursor < 2) {
        ne.cursor++
      } else {
        ne.submitted = true
        const name = ne.chars.map(i => CHARS[i]).join('')
        submitScore(name, state.score[0], state.score[1]).catch(() => {})
      }
    }
    this.p1APrev = p1.a
  }
}

function drawSimOverlay(ctx: CanvasRenderingContext2D, state: MatchState) {
  ctx.fillStyle = '#0a0a1a'
  ctx.fillRect(0, 0, GAME_W, GAME_H)
  ctx.textAlign = 'center'

  ctx.fillStyle = '#888888'
  ctx.font = '8px monospace'
  ctx.fillText('SIMULATION', GAME_W / 2, 70)

  const [t0, t1] = state.config.teams
  ctx.fillStyle = '#ffffff'
  ctx.font = '10px monospace'
  ctx.fillText(`${t0.code}  vs  ${t1.code}`, GAME_W / 2, 90)

  ctx.fillStyle = '#ffff00'
  ctx.font = '28px monospace'
  ctx.fillText(`${state.score[0]}  -  ${state.score[1]}`, GAME_W / 2, 126)

  const winner = state.score[0] > state.score[1] ? `${t0.code} WIN`
               : state.score[1] > state.score[0] ? `${t1.code} WIN` : 'DRAW'
  ctx.fillStyle = '#aaffaa'
  ctx.font = '10px monospace'
  ctx.fillText(winner, GAME_W / 2, 148)

  ctx.fillStyle = '#444466'
  ctx.font = '7px monospace'
  ctx.fillText('redirecting...', GAME_W / 2, 180)
}

function drawGoalOverlay(ctx: CanvasRenderingContext2D, state: MatchState) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(0, 76, GAME_W, 68)
  ctx.fillStyle = '#ffff00'
  ctx.font = 'bold 20px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('GOAL!', GAME_W / 2, 108)
  ctx.fillStyle = '#ffffff'
  ctx.font = '10px monospace'
  ctx.fillText(`${state.score[0]}  -  ${state.score[1]}`, GAME_W / 2, 126)
}

function drawFulltimeOverlay(
  ctx: CanvasRenderingContext2D,
  state: MatchState,
  nameEntry: { chars: [number, number, number]; cursor: number; submitted: boolean; blink: number } | null,
) {
  ctx.fillStyle = 'rgba(0,0,0,0.80)'
  ctx.fillRect(0, 0, GAME_W, GAME_H)
  ctx.textAlign = 'center'

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 14px monospace'
  ctx.fillText('FULL TIME', GAME_W / 2, 50)

  const [t0, t1] = state.config.teams
  ctx.font = '22px monospace'
  ctx.fillStyle = '#ffff00'
  ctx.fillText(`${state.score[0]}  -  ${state.score[1]}`, GAME_W / 2, 80)

  const winner = state.score[0] > state.score[1] ? `${t0.flag} ${t0.code} WINS`
               : state.score[1] > state.score[0] ? `${t1.flag} ${t1.code} WINS` : 'DRAW'
  ctx.fillStyle = '#aaffaa'
  ctx.font = '10px monospace'
  ctx.fillText(winner, GAME_W / 2, 98)

  if (state.config.returnUrl) {
    ctx.fillStyle = '#888888'
    ctx.font = '7px monospace'
    ctx.fillText('PRESS Z TO RETURN TO MATCH CENTRE', GAME_W / 2, 170)
  }

  if (nameEntry && !nameEntry.submitted) {
    // Name entry UI
    ctx.fillStyle = '#ffffff'
    ctx.font = '8px monospace'
    ctx.fillText('ENTER YOUR NAME', GAME_W / 2, 120)

    const startX = GAME_W / 2 - 22
    for (let i = 0; i < 3; i++) {
      const cx = startX + i * 22
      const active = nameEntry.cursor === i
      // Box
      ctx.fillStyle = active ? '#ffff00' : '#444466'
      ctx.fillRect(cx - 8, 128, 16, 18)
      // Letter
      ctx.fillStyle = active ? '#000000' : '#ffffff'
      ctx.font = 'bold 12px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(CHARS[nameEntry.chars[i]], cx, 142)
    }

    ctx.textAlign = 'center'
    ctx.fillStyle = '#888888'
    ctx.font = '7px monospace'
    ctx.fillText('UP/DOWN = CHANGE  Z = CONFIRM', GAME_W / 2, 162)
  } else if (nameEntry?.submitted) {
    ctx.fillStyle = '#aaffaa'
    ctx.font = '8px monospace'
    ctx.fillText('SCORE SAVED!', GAME_W / 2, 128)
    ctx.fillStyle = '#666688'
    ctx.font = '8px monospace'
    ctx.fillText('PRESS Z TO PLAY AGAIN', GAME_W / 2, 148)
  }

}
