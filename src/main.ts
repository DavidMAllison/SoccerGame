import { createLoop } from './engine/loop.js'
import { createRenderer } from './engine/renderer.js'
import { SceneManager } from './engine/scene.js'
import { initInput, initTouchControls, readP1 } from './engine/input.js'
import { unlockAudio, toggleMute } from './engine/audio.js'
import { TitleScene } from './game/scenes/titleScene.js'
import { MatchScene } from './game/scenes/matchScene.js'
import { PreMatchScene } from './game/scenes/preMatchScene.js'
import { LobbyScene } from './game/scenes/lobbyScene.js'
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
    playerName: 'SIMULATION',
    matchId: params.get('match'),
    returnUrl: params.get('return'),
    simulate: params.get('mode') === 'sim',
  }
}

const params = new URLSearchParams(window.location.search)
const mode = params.get('mode')   // 'sim' | 'multi' | null
const matchConfig = parseMatchConfig()

function startMatch(config: MatchConfig) {
  unlockAudio()
  scenes.transition(new MatchScene(config))
}

function startMulti(config: MatchConfig) {
  unlockAudio()
  const lobby = new LobbyScene(
    config,
    canvas,
    (role, channel) => {
      const match = new MatchScene(config)
      match.initMulti(role, channel)
      scenes.transition(match)
    },
    () => startMatch(config),
  )
  scenes.transition(lobby)
}

if (mode === 'multi') {
  // ?room= lets a standalone guest join a specific host room
  const roomParam = params.get('room')
  const config: MatchConfig = matchConfig ?? {
    teams: [getCountry('RED', 0), getCountry('BLU', 1)],
    playerName: '', matchId: roomParam, returnUrl: null,
  }
  startMulti(config)
} else if (matchConfig) {
  if (matchConfig.simulate) {
    // Simulation mode: skip pre-match, go straight to headless match
    scenes.transition(new MatchScene(matchConfig))
  } else {
    // Pool-site mode: go straight to pre-match name entry, skip title screen
    const pre = new PreMatchScene(matchConfig, canvas, (playerName) => {
      startMatch({ ...matchConfig, playerName })
    })
    scenes.transition(pre)
  }
} else {
  // Standalone mode: title screen → match or multiplayer
  const defaultConfig: MatchConfig = { teams: [getCountry('RED', 0), getCountry('BLU', 1)], playerName: '', matchId: null, returnUrl: null }
  class BootTitleScene extends TitleScene {
    private aLast = false
    private bLast = false
    private upLast = false
    private downLast = false
    tick(dt: number) {
      super.tick(dt)
      const p1 = readP1()
      const upJust  = p1.dy < 0 && !this.upLast
      const downJust = p1.dy > 0 && !this.downLast
      if (upJust || downJust) {
        this.menuIndex = this.menuIndex === 0 ? 1 : 0
        this.blink = 0; this.showPress = true  // reset blink so player sees prompt
      }
      if (p1.a && !this.aLast) {
        if (this.menuIndex === 0) startMatch(defaultConfig)
        else startMulti(defaultConfig)
      }
      // X / SHOOT also cycles menu on mobile
      if (p1.b && !this.bLast) {
        this.menuIndex = this.menuIndex === 0 ? 1 : 0
      }
      this.aLast = p1.a; this.bLast = p1.b
      this.upLast = p1.dy < 0; this.downLast = p1.dy > 0
    }
  }
  scenes.transition(new BootTitleScene(scenes))
}

initInput()
initTouchControls()
renderer.resize(window.innerWidth, window.innerHeight)
window.addEventListener('resize', () => {
  renderer.resize(window.innerWidth, window.innerHeight)
  updateOrientationOverlay()
})

// ── Portrait lock (phones only — iPads are excluded by screen size check) ─────
// Phones have a minimum screen dimension ≤ 600 CSS px; tablets/iPads are wider.
const IS_PHONE = navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) <= 600

let orientationOverlay: HTMLElement | null = null

function updateOrientationOverlay() {
  if (!IS_PHONE) return
  const isPortrait = window.innerWidth <= window.innerHeight
  if (isPortrait) {
    if (!orientationOverlay) {
      const el = document.createElement('div')
      el.id = 'orientation-overlay'
      Object.assign(el.style, {
        position: 'fixed', inset: '0',
        background: '#000',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: '999',
        fontFamily: 'monospace', color: '#fff',
        textAlign: 'center', pointerEvents: 'none',
        userSelect: 'none',
      })
      el.innerHTML = [
        '<div style="font-size:56px;line-height:1;margin-bottom:20px">&#8635;</div>',
        '<div style="font-size:15px;font-weight:bold;letter-spacing:3px">ROTATE YOUR PHONE</div>',
        '<div style="font-size:11px;opacity:0.5;margin-top:10px;letter-spacing:1px">LANDSCAPE PLAYS BEST</div>',
      ].join('')
      document.body.appendChild(el)
      orientationOverlay = el
    }
    orientationOverlay.style.display = 'flex'
  } else if (orientationOverlay) {
    orientationOverlay.style.display = 'none'
  }
}

updateOrientationOverlay()

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
