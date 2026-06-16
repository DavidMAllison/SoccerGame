import type { ControllerState } from '../engine/input.js'
import type { CountryKit } from './countries.js'

export type { CountryKit }

export type TeamId = 0 | 1

export interface Vec2 {
  x: number
  y: number
}

export interface Player {
  id: number
  team: TeamId
  pos: Vec2
  vel: Vec2
  facing: Vec2       // normalized direction for sprite selection
  hasBall: boolean
  isActive: boolean  // currently controlled by human input
  isKeeper: boolean
  slideTimer: number // > 0 while sliding
  kickCooldown: number
  skin: number       // 0-18, assigned randomly at match start
  speedBoost: number // seconds remaining on mushroom boost
  hasBomb: boolean   // carrying a bomb
  hasMissile: boolean // carrying a missile launcher
  stunTimer: number  // > 0 while stunned from explosion
  pieTimer: number   // > 0 while pie-faced (cream splat visual)
  slowTimer: number  // > 0 while slimed (half speed)
}

export type PowerUpType = 'mushroom' | 'bomb' | 'pie' | 'missile' | 'turbo' | 'slime'

export interface PowerUp {
  id: number
  type: PowerUpType
  pos: Vec2
  spawnTimer: number  // counts up; used for bobbing animation
}

export interface Missile {
  id: number
  pos: Vec2
  vel: Vec2
  ownerId: number
  ownerTeam: TeamId
  lifetime: number  // counts down; removed at 0
}

export interface Explosion {
  id: number
  pos: Vec2
  timer: number     // counts down from maxTimer
  maxTimer: number
}

export interface Ball {
  pos: Vec2
  vel: Vec2
  z: number          // height above ground (for lofted shots)
  vz: number         // vertical velocity
  owner: number | null // player id, null if loose
}

export type MatchPhase =
  | 'kickoff'
  | 'play'
  | 'goal_celebration'
  | 'halftime'
  | 'fulltime'

export interface MatchConfig {
  teams: [CountryKit, CountryKit]
  playerName: string
  matchId: string | null
  returnUrl: string | null
  simulate?: boolean  // CPU vs CPU tight-loop, no rendering
}

export interface MatchState {
  phase: MatchPhase
  phaseTimer: number   // seconds remaining in current phase
  half: 1 | 2
  matchTimer: number   // seconds remaining in current half
  score: [number, number]
  players: Player[]
  ball: Ball
  activePlayer: [number, number] // player id for each team's human control
  halfLength: number   // configurable, default 3 minutes
  difficulty: 1 | 2 | 3
  config: MatchConfig
  powerUps: PowerUp[]
  powerUpSpawnTimer: number  // counts down to next spawn
  nextPowerUpId: number
  missiles: Missile[]
  explosions: Explosion[]
  nextMissileId: number
}

export { ControllerState }
