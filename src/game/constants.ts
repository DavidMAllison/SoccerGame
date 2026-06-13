// Pitch dimensions (internal game units — wider than screen for scrolling)
export const PITCH_W = 512
export const PITCH_H = 200
export const PITCH_X = 0   // left edge in world space
export const PITCH_Y = 28  // top edge (room for HUD + controls row)

// Goal dimensions
export const GOAL_WIDTH  = 40
export const GOAL_DEPTH  = 12
export const GOAL_Y      = PITCH_Y + (PITCH_H - GOAL_WIDTH) / 2
export const CROSSBAR_H  = 24  // max ball z for a valid goal

// Player tuning
export const PLAYER_RADIUS     = 7
export const PLAYER_SPEED      = 80   // px/s at full run
export const PLAYER_ACCEL      = 400
export const PLAYER_FRICTION   = 0.85 // velocity multiplier per tick
export const SLIDE_SPEED       = 130
export const SLIDE_DURATION    = 0.35 // seconds

// Ball tuning
export const BALL_RADIUS       = 4
export const BALL_FRICTION     = 0.97  // per tick
export const BALL_BOUNCE       = 0.55  // wall restitution
export const KICK_POWER        = 200   // px/s base kick
export const SHOOT_POWER       = 320
export const SHOOT_LOFT        = 80    // vz for a full shot
export const POSSESSION_RADIUS = 14   // capture distance

// Match
export const DEFAULT_HALF_LENGTH = 45   // 45 seconds in seconds
export const GOAL_CELEBRATION_TIME = 3  // seconds

// Kick cooldown prevents double-kicks
export const KICK_COOLDOWN = 0.3  // seconds
