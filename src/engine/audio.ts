// Minimal ZzFX implementation — generates chiptune SFX from parameter arrays.
// Based on ZzFX by Frank Force (MIT). https://github.com/KilledByAPixel/ZzFX
// Parameters: [volume, randomness, frequency, attack, sustain, release,
//              shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime,
//              repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo]

let actx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!actx) actx = new AudioContext()
  if (actx.state === 'suspended') actx.resume()
  return actx
}

function zzfx(...p: number[]) {
  const [
    volume = 1, randomness = 0.05, frequency = 220,
    attack = 0, sustain = 0, release = 0.1,
    shape = 0, _shapeCurve = 1, slide = 0, deltaSlide = 0,
    pitchJump = 0, pitchJumpTime = 0, repeatTime = 0,
    noise = 0, modulation = 0, bitCrush = 0,
    delay = 0, sustainVolume = 1, decay = 0, tremolo = 0,
  ] = p

  const ac = getCtx()
  const sampleRate = ac.sampleRate
  const totalTime = attack + decay + sustain + release + delay
  const length = sampleRate * totalTime + 9
  const buffer = ac.createBuffer(1, length | 0, sampleRate)
  const data = buffer.getChannelData(0)

  let freq = frequency * (1 + randomness * (Math.random() * 2 - 1))
  let b = 0, j = 1, t = 0, tm = 0, i = 0, n = 0
  const startFreq = freq

  for (let k = 0; k < length; k++) {
    const e = k / sampleRate
    const p2 = e < attack
      ? e / attack
      : e < attack + decay
        ? 1 - (e - attack) / decay * (1 - sustainVolume)
        : e < attack + decay + sustain
          ? sustainVolume
          : e < totalTime - delay
            ? sustainVolume * (1 - (e - attack - decay - sustain) / release)
            : 0

    if (pitchJumpTime && e > pitchJumpTime * (j + 1)) {
      freq += pitchJump
      j++
    }

    const slideFreq = startFreq * Math.pow(2, slide * e + deltaSlide * e * e)
    b += (slideFreq + freq - startFreq) / sampleRate

    if (repeatTime && e % repeatTime < 1 / sampleRate) { b = 0; freq = startFreq }

    if (noise) t += Math.random() - 0.5
    const s = Math.sin(b * Math.PI * 2)

    let sample: number
    switch (shape) {
      case 0: sample = s; break
      case 1: sample = s > 0 ? 1 : -1; break  // square
      case 2: sample = 1 - 2 * (b % 1); break  // sawtooth
      case 3: sample = Math.abs(1 - 2 * (b % 1)) * 2 - 1; break  // triangle
      default: sample = s
    }

    if (modulation) sample = sample * Math.cos(t * modulation * Math.PI * 2)
    if (tremolo) sample *= 1 - tremolo * (Math.sin(e * Math.PI * 2 / tremolo) * 0.5 + 0.5)
    if (bitCrush) sample = Math.round(sample * bitCrush) / bitCrush
    if (noise) sample += t * noise

    data[k] = Math.max(-1, Math.min(1, sample * p2 * volume))
    n++
    if (n >= sampleRate / 60) { n = 0; tm++ }
    i++
  }

  const source = ac.createBufferSource()
  source.buffer = buffer
  source.connect(ac.destination)
  source.start()
}

// Soccer SFX presets
const SFX: Record<string, number[]> = {
  kick:    [0.6, 0,  100, 0,    0,    0.08, 1, 0.5,  10,  0,    0, 0, 0, 0.2, 0, 0, 0, 1, 0.02],
  bounce:  [0.3, 0,  80,  0,    0,    0.06, 1, 0.5,  5,   0,    0, 0, 0, 0.1, 0, 0, 0, 1, 0.01],
  tackle:  [0.5, 0.1, 60, 0,    0.02, 0.10, 1, 0.3,  0,   0,    0, 0, 0, 0.4, 0, 2, 0, 1, 0.02],
  dodge:   [0.4, 0.05, 380, 0,  0.03, 0.10, 0, 1.6, -18,  0,    0, 0, 0, 0.3, 0, 0, 0, 1, 0.02],
  goal:    [0.8, 0,  440, 0.05, 0.3,  0.4,  0, 1,    5,   0,    0, 0, 0, 0,   0, 0, 0, 1, 0],
  whistle: [0.6, 0.02, 880, 0,  0.15, 0.25, 0, 2,    0,   0,    20, 0.1, 0, 0, 10, 0, 0, 1, 0, 0.3],
}

let muted = true

export function playSfx(name: keyof typeof SFX) {
  if (muted) return
  try { zzfx(...SFX[name]) } catch { /* audio not ready */ }
}

export function toggleMute(): boolean {
  muted = !muted
  return muted
}

export function isMuted(): boolean { return muted }

export function unlockAudio() {
  getCtx()
}
