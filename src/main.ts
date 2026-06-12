import { createLoop } from './engine/loop.js'
import { createRenderer } from './engine/renderer.js'
import { SceneManager } from './engine/scene.js'
import { initInput, initTouchControls, readP1 } from './engine/input.js'
import { unlockAudio, toggleMute } from './engine/audio.js'
import { TitleScene } from './game/scenes/titleScene.js'
import { MatchScene } from './game/scenes/matchScene.js'
import { PreMatchScene } from './game/scenes/preMatchScene.js'
import { getCountry } from './game/countries.js'
import type { MatchConfig } from './game/types.js'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const renderer = createRenderer(canvas)
const scenes = new SceneManager()

// Parse URL params: ?team0=BRA&team1=FRA&match=A1&return=https://...
function parseMatchConfig(): MatchConfig | null {
  const params = new URLSearchParams(window.location.search)
  const t0 = params.get('team0')
  const t1 = params.get('team1')
  if (!t0 || !t1) return null
  return {
    teams: [getCountry(t0, 0), getCountry(t1, 1)],
    playerName: '',
    matchId: params.get('match'),
    returnUrl: params.get('return'),
  }
}

const matchConfig = parseMatchConfig()

function startMatch(config: MatchConfig) {
  unlockAudio()
  scenes.transition(new MatchScene(config))
}

if (matchConfig) {
  // Pool-site mode: go straight to pre-match name entry, skip title screen
  const pre = new PreMatchScene(matchConfig, canvas, (playerName) => {
    startMatch({ ...matchConfig, playerName })
  })
  scenes.transition(pre)
} else {
  // Standalone mode: title screen → match
  class BootTitleScene extends TitleScene {
    private pressedLastTick = false
    tick(dt: number) {
      super.tick(dt)
      const p1 = readP1()
      if (p1.a && !this.pressedLastTick) startMatch({ teams: [getCountry('RED', 0), getCountry('BLU', 1)], playerName: '', matchId: null, returnUrl: null })
      this.pressedLastTick = p1.a
    }
  }
  scenes.transition(new BootTitleScene(scenes))
}

initInput()
initTouchControls()
renderer.resize(window.innerWidth, window.innerHeight)
window.addEventListener('resize', () => renderer.resize(window.innerWidth, window.innerHeight))

// Global mute toggle on M key
window.addEventListener('keydown', e => {
  if (e.code === 'KeyM') showMuteToast(toggleMute())
})

const loop = createLoop(
  (dt) => scenes.tick(dt),
  (alpha) => {
    scenes.render(renderer.backbuffer, alpha)
    renderer.present()
  }
)

loop.start()

function showMuteToast(muted: boolean) {
  let el = document.getElementById('mute-toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'mute-toast'
    Object.assign(el.style, {
      position: 'fixed', top: '8px', right: '8px',
      background: 'rgba(0,0,0,0.75)', color: '#fff',
      font: '12px monospace', padding: '4px 8px',
      borderRadius: '3px', pointerEvents: 'none',
      transition: 'opacity 0.3s',
    })
    document.body.appendChild(el)
  }
  el.textContent = muted ? '🔇 MUTED' : '🔊 SOUND ON'
  el.style.opacity = '1'
  setTimeout(() => { if (el) el.style.opacity = '0' }, 1500)
}
