export interface ControllerState {
  dx: number   // -1, 0, 1
  dy: number   // -1, 0, 1
  a: boolean   // kick / pass / switch player
  b: boolean   // shoot / slide
}

export const EMPTY_CONTROLLER: ControllerState = { dx: 0, dy: 0, a: false, b: false }

// ── Keyboard ──────────────────────────────────────────────────────────────────
const held = new Set<string>()

export function initInput() {
  window.addEventListener('keydown', e => { held.add(e.code); e.preventDefault() })
  window.addEventListener('keyup',   e => held.delete(e.code))
}

export function readP1(): ControllerState {
  return {
    dx: (held.has('ArrowRight') ? 1 : 0) - (held.has('ArrowLeft') ? 1 : 0) || touch.dx,
    dy: (held.has('ArrowDown')  ? 1 : 0) - (held.has('ArrowUp')   ? 1 : 0) || touch.dy,
    a:  held.has('KeyZ') || touch.a,
    b:  held.has('KeyX') || touch.b,
  }
}

export function readP2(): ControllerState {
  return {
    dx: (held.has('KeyD') ? 1 : 0) - (held.has('KeyA') ? 1 : 0),
    dy: (held.has('KeyS') ? 1 : 0) - (held.has('KeyW') ? 1 : 0),
    a:  held.has('KeyG'),
    b:  held.has('KeyH'),
  }
}

// ── Touch state ───────────────────────────────────────────────────────────────
const touch = { dx: 0, dy: 0, a: false, b: false }

// ── Touch overlay ─────────────────────────────────────────────────────────────
export function initTouchControls(): void {
  if (navigator.maxTouchPoints === 0) return  // desktop — skip

  // Prevent page scroll/zoom during play
  document.documentElement.style.overflow  = 'hidden'
  document.documentElement.style.touchAction = 'none'

  const overlay = el('div', {
    position: 'fixed', inset: '0',
    pointerEvents: 'none',
    zIndex: '50',
    userSelect: 'none', webkitUserSelect: 'none',
  })

  // ── D-pad ──────────────────────────────────────────────────────────────────
  const dpadSize = 114
  const dpad = el('div', {
    position: 'fixed',
    bottom: '14px', left: '14px',
    width: dpadSize + 'px', height: dpadSize + 'px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.13)',
    border: '2px solid rgba(255,255,255,0.28)',
    pointerEvents: 'auto',
    touchAction: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  })

  // Knob inside d-pad that shows current direction
  const knob = el('div', {
    width: '36px', height: '36px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.35)',
    transition: 'transform 0.05s',
    pointerEvents: 'none',
  })
  dpad.appendChild(knob)

  // Direction arrows (decorative)
  ;[
    ['▲', 'top:4px;left:50%;transform:translateX(-50%)'],
    ['▼', 'bottom:4px;left:50%;transform:translateX(-50%)'],
    ['◀', 'left:4px;top:50%;transform:translateY(-50%)'],
    ['▶', 'right:4px;top:50%;transform:translateY(-50%)'],
  ].forEach(([char, pos]) => {
    const a = el('div', {
      position: 'absolute', fontSize: '11px',
      color: 'rgba(255,255,255,0.4)', lineHeight: '1',
    })
    a.setAttribute('style', a.getAttribute('style')! + pos)
    a.textContent = char as string
    dpad.appendChild(a)
  })

  let dpadTouchId = -1
  const DEAD = 16
  const half = dpadSize / 2

  dpad.addEventListener('touchstart', e => {
    e.preventDefault()
    const t = e.changedTouches[0]
    dpadTouchId = t.identifier
    updateDpad(t, dpad, knob, half, DEAD)
  }, { passive: false })

  dpad.addEventListener('touchmove', e => {
    e.preventDefault()
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === dpadTouchId) {
        updateDpad(e.changedTouches[i], dpad, knob, half, DEAD)
      }
    }
  }, { passive: false })

  const resetDpad = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === dpadTouchId) {
        touch.dx = 0; touch.dy = 0
        dpadTouchId = -1
        knob.style.transform = ''
      }
    }
  }
  dpad.addEventListener('touchend',    resetDpad)
  dpad.addEventListener('touchcancel', resetDpad)

  // ── Buttons ────────────────────────────────────────────────────────────────
  const btnA = makeButton('KICK',  '#c42020', 'rgba(196,32,32,0.75)', 'bottom:80px;right:16px')
  const btnB = makeButton('SHOOT', '#1a30b8', 'rgba(26,48,184,0.75)', 'bottom:14px;right:16px')

  wireButton(btnA, 'a')
  wireButton(btnB, 'b')

  overlay.appendChild(dpad)
  overlay.appendChild(btnA)
  overlay.appendChild(btnB)
  document.body.appendChild(overlay)
}

function updateDpad(
  touch_: Touch,
  dpad: HTMLElement,
  knob: HTMLElement,
  half: number,
  dead: number,
) {
  const rect = dpad.getBoundingClientRect()
  const dx = touch_.clientX - (rect.left + half)
  const dy = touch_.clientY - (rect.top  + half)
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist < dead) {
    touch.dx = 0; touch.dy = 0
    knob.style.transform = ''
    return
  }

  // 8-way directional input
  const adx = Math.abs(dx), ady = Math.abs(dy)
  touch.dx = adx > ady * 0.4 ? Math.sign(dx) : 0
  touch.dy = ady > adx * 0.4 ? Math.sign(dy) : 0

  // Move knob visually (clamped to d-pad radius)
  const clampR = Math.min(dist, half - 18)
  const nx = dx / dist, ny = dy / dist
  knob.style.transform = `translate(${nx * clampR}px, ${ny * clampR}px)`
}

function wireButton(btn: HTMLElement, key: 'a' | 'b') {
  btn.addEventListener('touchstart', e => {
    e.preventDefault()
    touch[key] = true
    btn.style.transform = 'scale(0.88)'
  }, { passive: false })
  const release = () => {
    touch[key] = false
    btn.style.transform = ''
  }
  btn.addEventListener('touchend',    release)
  btn.addEventListener('touchcancel', release)
}

function makeButton(label: string, border: string, bg: string, pos: string): HTMLElement {
  const btn = el('div', {
    position: 'fixed',
    width: '64px', height: '64px',
    borderRadius: '50%',
    background: bg,
    border: `2.5px solid ${border}`,
    pointerEvents: 'auto',
    touchAction: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'column',
    fontFamily: 'monospace', fontWeight: 'bold',
    fontSize: '11px', color: '#ffffff',
    lineHeight: '1.2',
    transition: 'transform 0.05s',
    boxShadow: `0 2px 8px rgba(0,0,0,0.5)`,
  })
  btn.setAttribute('style', btn.getAttribute('style')! + pos)
  btn.textContent = label
  return btn
}

// Typed subset of CSSStyleDeclaration for our use
type Styles = Partial<Record<keyof CSSStyleDeclaration, string>>

function el(tag: string, styles: Styles): HTMLElement {
  const e = document.createElement(tag)
  Object.assign(e.style, styles)
  return e
}
