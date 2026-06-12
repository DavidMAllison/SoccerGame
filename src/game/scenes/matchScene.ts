import type { Scene } from '../../engine/scene.js'
import type { MatchState, Player, ControllerState } from '../types.js'
import { readP1, readP2, EMPTY_CONTROLLER } from '../../engine/input.js'
import { playSfx } from '../../engine/audio.js'
import { submitScore } from '../../net/leaderboard.js'
import { GAME_W, GAME_H } from '../../engine/renderer.js'
import { PITCH_W, PITCH_H, PITCH_Y, DEFAULT_HALF_LENGTH, PLAYER_RADIUS } from '../constants.js'
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
  roles: RoleMap
  ticksSinceUpdate: number
}

const COORDINATOR_INTERVAL = 6  // re-assign roles every 6 ticks (~10Hz)

function initState(): MatchState {
  const cy = PITCH_Y + PITCH_H / 2
  const cx = PITCH_W / 2

  const mk = (id: number, team: 0 | 1, x: number, y: number, isKeeper = false): Player => ({
    id, team,
    pos: { x, y },
    vel: { x: 0, y: 0 },
    facing: { x: team === 0 ? 1 : -1, y: 0 },
    hasBall: false, isActive: false, isKeeper,
    slideTimer: 0, kickCooldown: 0,
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
  private state: MatchState = initState()
  private cam: Camera = createCamera()
  private p1APrev = false
  private p2APrev = false
  private switchCooldown = [0, 0]
  private cpu: 0 | 1 | null = 1
  private aiCtx: AIContext = { roles: new Map(), ticksSinceUpdate: 0 }
  private nameEntry: NameEntry | null = null

  onEnter() {
    this.state = initState()
    this.cam = createCamera()
    this.cam.x = PITCH_W / 2 - 128
    this.p1APrev = false
    this.p2APrev = false
    this.switchCooldown = [0, 0]
    this.aiCtx = { roles: new Map(), ticksSinceUpdate: 0 }
    this.nameEntry = null
  }

  private getCpuControl(player: Player): ControllerState {
    const { state } = this
    if (player.isKeeper) {
      return keeperControl(player, state, state.difficulty)
    }
    const role = this.aiCtx.roles.get(player.id) ?? 'support'
    return fieldPlayerControl(player, role, state, state.difficulty)
  }

  tick(dt: number) {
    const { state } = this

    // Name entry at fulltime
    if (state.phase === 'fulltime') {
      this.tickNameEntry(dt)
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
      if (this.cpu !== null) {
        this.aiCtx.roles = assignRoles(state, this.cpu)
      }
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
        // Human team: only active player responds to input
        const humanCtrl = p.team === 0 ? p1 : p2
        ctrl = p.id === state.activePlayer[p.team] ? humanCtrl : EMPTY_CONTROLLER
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
    }

    tickRules(state, dt)

    if (state.phase === 'play') {
      state.matchTimer = Math.max(0, state.matchTimer - dt)
    }

    const activeP1 = state.players.find(p => p.id === state.activePlayer[0])!
    updateCameraForMatch(this.cam, state.ball.pos.x, activeP1.pos.x, state.ball.owner !== null)
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

    drawPitch(ctx, cam.x)

    const sorted = [...state.players].sort((a, b) => a.pos.y - b.pos.y)
    for (const p of sorted) drawPlayer(ctx, p, cam)

    drawBall(ctx, state.ball, cam)
    drawHud(ctx, state)

    if (state.phase === 'goal_celebration') drawGoalOverlay(ctx, state)
    else if (state.phase === 'fulltime')    drawFulltimeOverlay(ctx, state, this.nameEntry)
  }

  private tickNameEntry(dt: number) {
    const { state } = this

    // Initialise name entry once on first fulltime tick
    if (!this.nameEntry) {
      this.nameEntry = { chars: [0, 0, 0], cursor: 0, submitted: false, blink: 0 }
    }
    const ne = this.nameEntry
    if (ne.submitted) return

    ne.blink += dt

    const p1 = readP1()

    // Up/down scroll the current char (using dy)
    if (ne.blink > 0.12) {
      ne.blink = 0
      // Read held direction once per interval to allow scrolling
      if (p1.dy < 0) ne.chars[ne.cursor] = (ne.chars[ne.cursor] - 1 + CHARS.length) % CHARS.length
      if (p1.dy > 0) ne.chars[ne.cursor] = (ne.chars[ne.cursor] + 1) % CHARS.length
    }

    // A = advance cursor / confirm
    if (p1.a && !this.p1APrev) {
      if (ne.cursor < 2) {
        ne.cursor++
      } else {
        // Submit
        ne.submitted = true
        const name = ne.chars.map(i => CHARS[i]).join('')
        submitScore(name, state.score[0], state.score[1]).catch(() => {})
      }
    }
    this.p1APrev = p1.a
  }
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

  ctx.font = '22px monospace'
  ctx.fillStyle = '#ffff00'
  ctx.fillText(`${state.score[0]}  -  ${state.score[1]}`, GAME_W / 2, 80)

  const winner = state.score[0] > state.score[1] ? 'RED WINS'
               : state.score[1] > state.score[0] ? 'BLUE WINS' : 'DRAW'
  ctx.fillStyle = '#aaffaa'
  ctx.font = '10px monospace'
  ctx.fillText(winner, GAME_W / 2, 98)

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
