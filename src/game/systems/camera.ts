import { PITCH_X, PITCH_W } from '../constants.js'
import { GAME_W } from '../../engine/renderer.js'

export interface Camera { x: number }

export function createCamera(): Camera { return { x: 0 } }

export function updateCamera(cam: Camera, targetX: number) {
  const desired = targetX - GAME_W / 2
  cam.x += (desired - cam.x) * 0.10  // smooth follow
  cam.x = Math.max(PITCH_X, Math.min(PITCH_W - GAME_W, cam.x))
}

// Follow ball when loose, blend toward active player when possessed
export function updateCameraForMatch(
  cam: Camera,
  ballX: number,
  activePlayerX: number,
  ballOwned: boolean,
) {
  const targetX = ballOwned ? (ballX * 0.4 + activePlayerX * 0.6) : ballX
  updateCamera(cam, targetX)
}

export function worldToScreen(worldX: number, cam: Camera): number {
  return worldX - cam.x
}
