import type { MatchState } from '../types.js'
import { PITCH_W, PITCH_H, PITCH_Y, GOAL_CELEBRATION_TIME } from '../constants.js'

function resetFormation(state: MatchState) {
  const cy = PITCH_Y + PITCH_H / 2
  const cx = PITCH_W / 2

  const positions: [number, number, number][] = [
    // id, x, y
    [0, 16,            cy],
    [1, 80,            PITCH_Y + 55],
    [2, 80,            PITCH_Y + 145],
    [3, cx - 30,       PITCH_Y + 70],
    [4, cx - 30,       PITCH_Y + 130],
    [5, PITCH_W - 16,  cy],
    [6, PITCH_W - 80,  PITCH_Y + 55],
    [7, PITCH_W - 80,  PITCH_Y + 145],
    [8, cx + 30,       PITCH_Y + 70],
    [9, cx + 30,       PITCH_Y + 130],
  ]

  for (const p of state.players) {
    const pos = positions.find(([id]) => id === p.id)
    if (!pos) continue
    p.pos.x = pos[1]
    p.pos.y = pos[2]
    p.vel.x = 0
    p.vel.y = 0
    p.hasBall = false
    p.kickCooldown = 0
    p.slideTimer = 0
    p.facing.x = p.team === 0 ? 1 : -1
    p.facing.y = 0
  }

  state.ball.pos.x = cx
  state.ball.pos.y = cy
  state.ball.vel.x = 0
  state.ball.vel.y = 0
  state.ball.z = 0
  state.ball.vz = 0
  state.ball.owner = null
}

export function onGoal(state: MatchState, event: 'goal0' | 'goal1') {
  const scoringTeam = event === 'goal0' ? 0 : 1
  state.score[scoringTeam]++
  state.phase = 'goal_celebration'
  state.phaseTimer = GOAL_CELEBRATION_TIME
}

export function tickRules(state: MatchState, dt: number) {
  if (state.phase === 'goal_celebration') {
    state.phaseTimer -= dt
    if (state.phaseTimer <= 0) {
      resetFormation(state)
      state.phase = 'play'  // auto-restart; no stuck kickoff waiting for button press
      state.phaseTimer = 0
    }
  }

  if (state.phase === 'play' && state.matchTimer <= 0) {
    if (state.half === 1) {
      state.half = 2
      state.matchTimer = state.halfLength
      resetFormation(state)
      state.phase = 'kickoff'
    } else {
      state.phase = 'fulltime'
    }
  }
}

export function startPlay(state: MatchState) {
  if (state.phase === 'kickoff') {
    state.phase = 'play'
  }
}
