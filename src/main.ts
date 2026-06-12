import { createLoop } from './engine/loop.js'
import { createRenderer } from './engine/renderer.js'
import { SceneManager } from './engine/scene.js'
import { initInput, initTouchControls, readP1 } from './engine/input.js'
import { unlockAudio, toggleMute } from './engine/audio.js'
import { TitleScene } from './game/scenes/titleScene.js'
import { MatchScene } from './game/scenes/matchScene.js'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const renderer = createRenderer(canvas)
const scenes = new SceneManager()

class BootTitleScene extends TitleScene {
  private pressedLastTick = false

  tick(dt: number) {
    super.tick(dt)
    const p1 = readP1()
    if (p1.a && !this.pressedLastTick) {
      unlockAudio()
      scenes.transition(new MatchScene())
    }
    this.pressedLastTick = p1.a
  }
}

initInput()
initTouchControls()
renderer.resize(window.innerWidth, window.innerHeight)
window.addEventListener('resize', () => renderer.resize(window.innerWidth, window.innerHeight))

// Global mute toggle on M key
window.addEventListener('keydown', e => {
  if (e.code === 'KeyM') {
    const muted = toggleMute()
    showMuteToast(muted)
  }
})

scenes.transition(new BootTitleScene(scenes))

const loop = createLoop(
  (dt) => scenes.tick(dt),
  (alpha) => {
    scenes.render(renderer.backbuffer, alpha)
    renderer.present()
  }
)

loop.start()

// Lightweight toast for mute state — drawn outside the game canvas
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
