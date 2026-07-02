import type { Scene } from '../../engine/scene.js'
import type { MatchState, MatchConfig, Player, ControllerState, PowerUp, Explosion } from '../types.js'
import { readP1, readP2 } from '../../engine/input.js'
import { playSfx } from '../../engine/audio.js'
import { submitScore } from '../../net/leaderboard.js'
import { submitSimulation } from '../../net/simulations.js'
import { GAME_W, GAME_H } from '../../engine/renderer.js'
import { PITCH_W, PITCH_H, PITCH_X, PITCH_Y, DEFAULT_HALF_LENGTH, PLAYER_RADIUS } from '../constants.js'
import { getCountry } from '../countries.js'
import { applyControl, tryKick, trySlide, tryDodge, tryFireMissile, MUSHROOM_DURATION, BOMB_KNOCKBACK, BOMB_STUN_DURATION, PIE_STUN_DURATION, MISSILE_BLAST_R, MISSILE_KNOCKBACK, MISSILE_STUN, SLIME_DURATION } from '../systems/playerControl.js'
import { createCamera, updateCameraForMatch, type Camera } from '../systems/camera.js'
import { tickBall } from '../systems/ballPhysics.js'
import { lockBallToOwner, checkPossession } from '../systems/collisions.js'
import { onGoal, tickRules, startPlay } from '../systems/rules.js'
import { drawPitch } from '../render/pitch.js'
import { drawPlayer, drawBall, drawPowerUp, drawMissile, drawExplosion, drawDemogorgon } from '../render/sprites.js'
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
    skin: Math.floor(Math.random() * 22),
    speedBoost: 0, hasBomb: false, hasMissile: false, stunTimer: 0, pieTimer: 0, slowTimer: 0,
    dodgeTimer: 0, dodgeCooldown: 0,
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
    powerUps: [], powerUpSpawnTimer: 5, nextPowerUpId: 0,
    missiles: [], explosions: [], nextMissileId: 0,
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

  // Multiplayer
  private multiRole: 'host' | 'guest' | null = null
  private netChannel: RTCDataChannel | null = null
  private remoteInput: ControllerState = { dx: 0, dy: 0, a: false, b: false }
  private sendTimer = 0
  private stadiumTheme = Math.floor(Math.random() * 5)

  // Demogorgon chaos event
  private demogorgon: { pos: { x: number; y: number }; vel: { x: number; y: number }; lifetime: number; stunCooldowns: Map<number, number> } | null = null
  private demogorgonSpawnTimer = 18 + Math.random() * 12

  constructor(private matchConfig: MatchConfig = DEFAULT_CONFIG) {}

  initMulti(role: 'host' | 'guest', channel: RTCDataChannel) {
    this.multiRole = role
    this.netChannel = channel
    this.cpu = null  // no AI teams in multiplayer
    channel.onmessage = (e: MessageEvent) => this.onNetMessage(e.data as string)
  }

  private onNetMessage(data: string) {
    try {
      if (this.multiRole === 'host') {
        this.remoteInput = JSON.parse(data) as ControllerState
      } else {
        this.applySnapshot(JSON.parse(data))
      }
    } catch { /* ignore malformed */ }
  }

  private applySnapshot(snap: {
    score: [number, number]; phase: string; matchTimer: number; half: number
    phaseTimer: number; activePlayer: [number, number]; ball: MatchState['ball']
    players: Array<{ id: number; pos: {x:number;y:number}; vel: {x:number;y:number}; facing: {x:number;y:number}; hasBall: boolean; isActive: boolean; slideTimer: number; kickCooldown: number; skin?: number; speedBoost?: number; hasBomb?: boolean; hasMissile?: boolean; stunTimer?: number; pieTimer?: number; slowTimer?: number; dodgeTimer?: number }>
    powerUps?: MatchState['powerUps']
    missiles?: MatchState['missiles']
    explosions?: MatchState['explosions']
    demogorgon?: { pos: {x:number;y:number}; vel: {x:number;y:number}; lifetime: number } | null
  }) {
    const { state } = this
    state.score = snap.score
    state.phase = snap.phase as MatchState['phase']
    state.matchTimer = snap.matchTimer
    state.half = snap.half as 1 | 2
    state.phaseTimer = snap.phaseTimer
    state.activePlayer = snap.activePlayer
    state.ball = snap.ball
    for (const sp of snap.players) {
      const p = state.players.find(q => q.id === sp.id)
      if (!p) continue
      p.pos = sp.pos; p.vel = sp.vel; p.facing = sp.facing
      p.hasBall = sp.hasBall; p.isActive = sp.isActive
      p.slideTimer = sp.slideTimer; p.kickCooldown = sp.kickCooldown
      if (sp.skin !== undefined) p.skin = sp.skin
      if (sp.speedBoost !== undefined) p.speedBoost = sp.speedBoost
      if (sp.hasBomb !== undefined) p.hasBomb = sp.hasBomb
      if (sp.hasMissile !== undefined) p.hasMissile = sp.hasMissile
      if (sp.stunTimer !== undefined) p.stunTimer = sp.stunTimer
      if (sp.pieTimer !== undefined) p.pieTimer = sp.pieTimer
      if (sp.slowTimer !== undefined) p.slowTimer = sp.slowTimer
      if (sp.dodgeTimer !== undefined) p.dodgeTimer = sp.dodgeTimer
    }
    if (snap.powerUps) state.powerUps = snap.powerUps
    if (snap.missiles) state.missiles = snap.missiles
    if (snap.explosions) state.explosions = snap.explosions
    if (snap.demogorgon !== undefined) {
      if (snap.demogorgon === null) {
        this.demogorgon = null
      } else {
        const d = snap.demogorgon
        if (!this.demogorgon) {
          this.demogorgon = { pos: d.pos, vel: d.vel, lifetime: d.lifetime, stunCooldowns: new Map() }
        } else {
          this.demogorgon.pos = d.pos
          this.demogorgon.vel = d.vel
          this.demogorgon.lifetime = d.lifetime
        }
      }
    }
  }

  private sendState() {
    if (!this.netChannel || this.netChannel.readyState !== 'open') return
    const { state } = this
    const dg = this.demogorgon
    this.netChannel.send(JSON.stringify({
      score: state.score, phase: state.phase,
      matchTimer: state.matchTimer, half: state.half,
      phaseTimer: state.phaseTimer, activePlayer: state.activePlayer,
      ball: state.ball,
      players: state.players.map(p => ({
        id: p.id, pos: p.pos, vel: p.vel, facing: p.facing,
        hasBall: p.hasBall, isActive: p.isActive,
        slideTimer: p.slideTimer, kickCooldown: p.kickCooldown,
        skin: p.skin,
        speedBoost: p.speedBoost, hasBomb: p.hasBomb, hasMissile: p.hasMissile,
        stunTimer: p.stunTimer, pieTimer: p.pieTimer, slowTimer: p.slowTimer,
        dodgeTimer: p.dodgeTimer,
      })),
      powerUps: state.powerUps,
      missiles: state.missiles,
      explosions: state.explosions,
      demogorgon: dg ? { pos: dg.pos, vel: dg.vel, lifetime: dg.lifetime } : null,
    }))
  }

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

    // Guest: forward input to host then wait for state snapshots
    // Use readP1 because touch controls and keyboard arrows feed P1 state
    if (this.multiRole === 'guest') {
      const inp = readP1()
      if (this.netChannel?.readyState === 'open') {
        this.netChannel.send(JSON.stringify(inp))
      }
      const activeP1 = this.state.players.find(p => p.id === this.state.activePlayer[0])!
      updateCameraForMatch(this.cam, this.state.ball.pos.x, activeP1.pos.x, this.state.ball.owner !== null)
      return
    }

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
    // In host mode, team 1 is controlled by the remote guest
    const p2 = this.multiRole === 'host' ? this.remoteInput : readP2()

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

      const fired = tryFireMissile(p, ctrl)
      if (fired) { state.missiles.push(fired); playSfx('shoot') }

      if (!p.hasBall && !fired && trySlide(p, ctrl)) playSfx('tackle')

      if (tryDodge(p, ctrl)) playSfx('dodge')

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
      this.tickPowerUps(state, dt)
      this.tickMissiles(state, dt)
      this.tickDemogorgon(state, dt)
      // Auto-switch human team to whoever just picked up the ball
      this.autoSwitchToBallCarrier()
    }

    tickRules(state, dt)

    if (state.phase === 'play') {
      state.matchTimer = Math.max(0, state.matchTimer - dt)
    }

    const activeP1 = state.players.find(p => p.id === state.activePlayer[0])!
    updateCameraForMatch(this.cam, state.ball.pos.x, activeP1.pos.x, state.ball.owner !== null)

    // Host: broadcast state to guest at ~20Hz (every 3 ticks)
    if (this.multiRole === 'host') {
      this.sendTimer++
      if (this.sendTimer >= 3) { this.sendTimer = 0; this.sendState() }
    }
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
    for (const p of state.players) {
      if (p.slideTimer <= 0) continue
      const ballOwner = state.ball.owner !== null
        ? state.players.find(q => q.id === state.ball.owner)
        : null
      // Can only tackle an opponent, not a teammate
      if (ballOwner && ballOwner.team === p.team) continue
      // Dodging carrier is immune to slide tackles
      if (ballOwner && ballOwner.dodgeTimer > 0) continue
      const tx = ballOwner ? ballOwner.pos.x : state.ball.pos.x
      const ty = ballOwner ? ballOwner.pos.y : state.ball.pos.y
      const dx = p.pos.x - tx
      const dy = p.pos.y - ty
      if (Math.sqrt(dx * dx + dy * dy) < PLAYER_RADIUS + 6) {
        if (ballOwner) {
          ballOwner.hasBall = false
          ballOwner.kickCooldown = 0.4
        }
        for (const q of state.players) q.hasBall = false
        state.ball.owner = p.id
        state.ball.pos.x = p.pos.x
        state.ball.pos.y = p.pos.y
        p.hasBall = true
        p.kickCooldown = 0.2
        break
      }
    }
  }

  private tickPowerUps(state: MatchState, dt: number) {
    if (state.phase !== 'play') return

    // Advance timers on existing power-ups
    for (const pu of state.powerUps) pu.spawnTimer += dt

    // Spawn new power-up every ~8s, max 3 on field
    state.powerUpSpawnTimer -= dt
    if (state.powerUpSpawnTimer <= 0 && state.powerUps.length < 3) {
      const r = Math.random()
      const type: PowerUp['type'] = r < 0.22 ? 'turbo' : r < 0.40 ? 'mushroom' : r < 0.55 ? 'missile' : r < 0.68 ? 'slime' : r < 0.82 ? 'bomb' : 'pie'
      const margin = 30
      state.powerUps.push({
        id: state.nextPowerUpId++,
        type,
        pos: {
          x: PITCH_X + margin + Math.random() * (PITCH_W - margin * 2),
          y: PITCH_Y + margin + Math.random() * (PITCH_H - margin * 2),
        },
        spawnTimer: 0,
      })
      state.powerUpSpawnTimer = 7 + Math.random() * 5
    }

    // Check player-pickup collisions
    const PICKUP_R = 10
    for (let i = state.powerUps.length - 1; i >= 0; i--) {
      const pu = state.powerUps[i]
      for (const p of state.players) {
        if (p.stunTimer > 0) continue
        const dx = p.pos.x - pu.pos.x
        const dy = p.pos.y - pu.pos.y
        if (Math.sqrt(dx * dx + dy * dy) > PICKUP_R) continue
        // Picked up!
        if (pu.type === 'slime') {
          p.slowTimer = SLIME_DURATION
          playSfx('tackle')
        } else if (pu.type === 'turbo') {
          p.speedBoost = 3
          playSfx('kick')
        } else if (pu.type === 'mushroom') {
          p.speedBoost = MUSHROOM_DURATION
          playSfx('kick')
        } else if (pu.type === 'bomb') {
          p.hasBomb = true
          playSfx('tackle')
        } else if (pu.type === 'missile') {
          p.hasMissile = true
          playSfx('kick')
        } else {
          // PIE IN THE FACE
          p.stunTimer = PIE_STUN_DURATION
          p.pieTimer = PIE_STUN_DURATION
          p.vel.x = (Math.random() - 0.5) * 60
          p.vel.y = (Math.random() - 0.5) * 60
          if (state.ball.owner === p.id) {
            p.hasBall = false
            state.ball.owner = null
          }
          playSfx('goal')
        }
        state.powerUps.splice(i, 1)
        break
      }
    }

    // Check bomb explosions: bomb carrier touches opponent
    const BOMB_R = 12
    for (const carrier of state.players) {
      if (!carrier.hasBomb) continue
      for (const victim of state.players) {
        if (victim.id === carrier.id) continue
        if (victim.team === carrier.team) continue
        if (victim.stunTimer > 0) continue
        const dx = carrier.pos.x - victim.pos.x
        const dy = carrier.pos.y - victim.pos.y
        if (Math.sqrt(dx * dx + dy * dy) > BOMB_R) continue
        // BOOM
        carrier.hasBomb = false
        victim.stunTimer = BOMB_STUN_DURATION
        // Knock victim away from carrier
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        victim.vel.x = -(dx / len) * BOMB_KNOCKBACK
        victim.vel.y = -(dy / len) * BOMB_KNOCKBACK
        // Drop ball if victim had it
        if (state.ball.owner === victim.id) {
          victim.hasBall = false
          state.ball.owner = null
        }
        playSfx('goal')
      }
    }
  }

  private tickMissiles(state: MatchState, dt: number) {
    // Advance explosion timers
    for (let i = state.explosions.length - 1; i >= 0; i--) {
      state.explosions[i].timer -= dt
      if (state.explosions[i].timer <= 0) state.explosions.splice(i, 1)
    }

    if (state.missiles.length === 0) return

    const HIT_R = 8
    for (let i = state.missiles.length - 1; i >= 0; i--) {
      const m = state.missiles[i]
      m.lifetime -= dt
      m.pos.x += m.vel.x * dt
      m.pos.y += m.vel.y * dt

      let exploded = m.lifetime <= 0

      if (!exploded) {
        for (const p of state.players) {
          if (p.id === m.ownerId) continue
          if (p.team === m.ownerTeam) continue
          const dx = p.pos.x - m.pos.x
          const dy = p.pos.y - m.pos.y
          if (Math.sqrt(dx * dx + dy * dy) < HIT_R + 6) {
            exploded = true
            break
          }
        }
      }

      if (exploded) {
        state.missiles.splice(i, 1)

        const ex: Explosion = { id: state.nextMissileId++, pos: { ...m.pos }, timer: 0.65, maxTimer: 0.65 }
        state.explosions.push(ex)
        playSfx('goal')

        // Blast all nearby players
        for (const p of state.players) {
          if (p.id === m.ownerId) continue
          const dx = p.pos.x - m.pos.x
          const dy = p.pos.y - m.pos.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > MISSILE_BLAST_R) continue
          const falloff = 1 - dist / MISSILE_BLAST_R
          const len = dist || 1
          p.stunTimer = MISSILE_STUN * falloff + 0.5
          p.vel.x = (dx / len) * MISSILE_KNOCKBACK * falloff
          p.vel.y = (dy / len) * MISSILE_KNOCKBACK * falloff
          if (state.ball.owner === p.id) {
            p.hasBall = false
            state.ball.owner = null
          }
        }
      }
    }
  }

  private tickDemogorgon(state: MatchState, dt: number) {
    if (state.phase !== 'play') return

    // Countdown to next spawn
    if (!this.demogorgon) {
      this.demogorgonSpawnTimer -= dt
      if (this.demogorgonSpawnTimer > 0) return

      // Spawn on a random pitch edge
      const side = Math.floor(Math.random() * 4)
      let sx: number, sy: number
      if (side === 0)      { sx = PITCH_X + Math.random() * PITCH_W; sy = PITCH_Y }
      else if (side === 1) { sx = PITCH_X + Math.random() * PITCH_W; sy = PITCH_Y + PITCH_H }
      else if (side === 2) { sx = PITCH_X;          sy = PITCH_Y + Math.random() * PITCH_H }
      else                 { sx = PITCH_X + PITCH_W; sy = PITCH_Y + Math.random() * PITCH_H }

      this.demogorgon = { pos: { x: sx, y: sy }, vel: { x: 0, y: 0 }, lifetime: 9, stunCooldowns: new Map() }
      playSfx('goal')
      return
    }

    const dg = this.demogorgon
    dg.lifetime -= dt

    if (dg.lifetime <= 0) {
      this.demogorgon = null
      this.demogorgonSpawnTimer = 30 + Math.random() * 20
      return
    }

    // Tick per-player stun cooldowns
    for (const [id, t] of dg.stunCooldowns) {
      const newT = t - dt
      if (newT <= 0) dg.stunCooldowns.delete(id)
      else dg.stunCooldowns.set(id, newT)
    }

    // Chase: prioritise ball carrier, else nearest player
    let target = state.players.find(p => p.id === state.ball.owner) ?? null
    if (!target) {
      let best = Infinity
      for (const p of state.players) {
        const dx = p.pos.x - dg.pos.x; const dy = p.pos.y - dg.pos.y
        const d = dx * dx + dy * dy
        if (d < best) { best = d; target = p }
      }
    }

    if (target) {
      const dx = target.pos.x - dg.pos.x
      const dy = target.pos.y - dg.pos.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const speed = 90 + Math.sin(dg.lifetime * 4) * 20  // speed pulsates
      dg.vel.x = (dx / len) * speed
      dg.vel.y = (dy / len) * speed
    }
    dg.pos.x += dg.vel.x * dt
    dg.pos.y += dg.vel.y * dt

    // Clamp to pitch
    dg.pos.x = Math.max(PITCH_X + 8, Math.min(PITCH_X + PITCH_W - 8, dg.pos.x))
    dg.pos.y = Math.max(PITCH_Y + 8, Math.min(PITCH_Y + PITCH_H - 8, dg.pos.y))

    // Contact — stun any player within range
    const CONTACT_R = 14
    for (const p of state.players) {
      if (dg.stunCooldowns.has(p.id)) continue
      const dx = p.pos.x - dg.pos.x; const dy = p.pos.y - dg.pos.y
      if (Math.sqrt(dx * dx + dy * dy) > CONTACT_R) continue

      p.stunTimer = 2.5
      const angle = Math.random() * Math.PI * 2
      p.vel.x = Math.cos(angle) * 180
      p.vel.y = Math.sin(angle) * 180
      if (state.ball.owner === p.id) {
        p.hasBall = false
        state.ball.owner = null
        state.ball.vel.x = Math.cos(angle + Math.PI) * 200
        state.ball.vel.y = Math.sin(angle + Math.PI) * 200
      }
      dg.stunCooldowns.set(p.id, 2)
      playSfx('goal')
    }
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number) {
    const { state, cam } = this

    if (this.matchConfig.simulate) {
      drawSimOverlay(ctx, state)
      return
    }

    drawPitch(ctx, cam.x, this.stadiumTheme)

    for (const pu of state.powerUps) drawPowerUp(ctx, pu, cam)

    const sorted = [...state.players].sort((a, b) => a.pos.y - b.pos.y)
    for (const p of sorted) drawPlayer(ctx, p, cam, state.config.teams)

    for (const m of state.missiles) drawMissile(ctx, m, cam)
    for (const ex of state.explosions) drawExplosion(ctx, ex, cam)
    if (this.demogorgon) drawDemogorgon(ctx, this.demogorgon.pos, this.demogorgon.lifetime, cam)

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
