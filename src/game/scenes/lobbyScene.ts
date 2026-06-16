import type { Scene } from '../../engine/scene.js'
import { GAME_W, GAME_H } from '../../engine/renderer.js'
import { writeRoom, readRoom } from '../../net/rooms.js'
import { listGames, addGame, removeGame, type GameEntry } from '../../net/lobby.js'
import type { MatchConfig } from '../types.js'

const STUN_ONLY: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
}

async function getIceConfig(): Promise<RTCConfiguration> {
  try {
    const res = await fetch('/api/turn', { method: 'POST' })
    if (res.ok) {
      const data = await res.json() as { iceServers?: RTCIceServer[] }
      if (data.iceServers?.length) {
        return { iceServers: [...(STUN_ONLY.iceServers ?? []), ...data.iceServers] }
      }
    }
  } catch { /* fall through */ }
  console.warn('[ice] TURN fetch failed, using STUN only')
  return STUN_ONLY
}
const POLL_MS       = 1500
const GUEST_TIMEOUT = 30_000
const HOST_TIMEOUT  = 120_000
const HEARTBEAT     = 25_000

type Phase = 'choose' | 'hosting' | 'joining' | 'connecting' | 'connected' | 'error'

export class LobbyScene implements Scene {
  private phase: Phase = 'choose'
  private games: GameEntry[] = []
  private detail = ''
  private dots = ''
  private dotTimer = 0
  private myRoom: string
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private overlayEl: HTMLElement | null = null
  private listEl: HTMLElement | null = null
  private _listRefreshTimer = 0

  constructor(
    private matchConfig: MatchConfig,
    _canvas: HTMLCanvasElement,
    private onConnected: (role: 'host' | 'guest', channel: RTCDataChannel) => void,
    private onCpu: () => void,
  ) {
    this.myRoom = matchConfig.matchId ?? randomId()
  }

  onEnter() {
    this.buildOverlay()
    if (this.matchConfig.matchId) {
      this.renderPoolSite()
    } else {
      this.refreshList()
    }
  }

  onExit() {
    this.overlayEl?.remove()
    this.overlayEl = null
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer!); this.heartbeatTimer = null }
  }

  // ─── Pool-site flow (explicit HOST / JOIN choice) ─────────────────────────

  private renderPoolSite() {
    if (!this.listEl) return
    const { matchConfig } = this
    const teamLabel = matchConfig.teams
      ? `${matchConfig.teams[0].flag} ${matchConfig.teams[0].code}  vs  ${matchConfig.teams[1].code} ${matchConfig.teams[1].flag}`
      : `Match ${this.myRoom}`

    this.listEl.innerHTML = `
      <div style="text-align:center;font-family:monospace;margin-top:30px">
        <div style="font-size:11px;color:#888;margin-bottom:6px">MATCH ${this.myRoom}</div>
        <div style="font-size:15px;color:#fff;font-weight:bold;margin-bottom:24px">${teamLabel}</div>
        <div style="font-size:11px;color:#aaa;margin-bottom:20px;line-height:1.6">
          First player tap <b style="color:#ccffcc">HOST</b><br>
          Second player tap <b style="color:#aaaaff">JOIN</b>
        </div>
        <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
          <button id="btn-host"
            style="padding:14px 24px;font-family:monospace;font-weight:bold;font-size:14px;
                   cursor:pointer;background:rgba(20,80,20,0.95);color:#ccffcc;
                   border:2px solid rgba(100,220,100,0.5);border-radius:8px;min-width:110px">
            HOST GAME
          </button>
          <button id="btn-join"
            style="padding:14px 24px;font-family:monospace;font-weight:bold;font-size:14px;
                   cursor:pointer;background:rgba(20,20,80,0.95);color:#aaaaff;
                   border:2px solid rgba(100,100,220,0.5);border-radius:8px;min-width:110px">
            JOIN GAME
          </button>
        </div>
        <div style="margin-top:20px">
          <button id="btn-cpu"
            style="padding:8px 18px;font-family:monospace;font-size:11px;cursor:pointer;
                   background:rgba(30,30,30,0.9);color:#888;
                   border:1px solid #444;border-radius:6px">
            PLAY vs CPU
          </button>
        </div>
      </div>`

    document.getElementById('btn-host')?.addEventListener('click', () => this.startHosting())
    document.getElementById('btn-join')?.addEventListener('click', () => this.startJoining())
    document.getElementById('btn-cpu')?.addEventListener('click', () => this.onCpu())
  }

  private startJoining() {
    this.phase = 'joining'
    this.detail = 'joining game...'
    this.showConnecting()
    this.runGuest(this.myRoom)
  }

  // ─── Standalone lobby list flow ───────────────────────────────────────────

  private async refreshList() {
    const games = await listGames()
    this.games = games
    this.renderList()
  }

  private renderList() {
    if (!this.listEl) return
    const { matchConfig } = this
    const games = this.games

    const rows = games.map(g => `
      <div style="display:flex;align-items:center;justify-content:space-between;
                  padding:8px 12px;margin-bottom:6px;
                  background:rgba(255,255,255,0.07);border-radius:6px;
                  font-family:monospace;color:#fff;font-size:13px">
        <span>${g.flag0} ${g.team0} &nbsp;vs&nbsp; ${g.team1} ${g.flag1}</span>
        <button data-room="${g.room}"
          style="margin-left:12px;padding:5px 14px;font-family:monospace;
                 font-weight:bold;font-size:12px;cursor:pointer;
                 background:#1a4a1a;color:#aaffaa;border:1px solid #4a8a4a;
                 border-radius:4px">JOIN</button>
      </div>`).join('')

    const startLabel = matchConfig.teams
      ? `${matchConfig.teams[0].flag} ${matchConfig.teams[0].code} vs ${matchConfig.teams[1].code} ${matchConfig.teams[1].flag}`
      : 'START GAME'

    this.listEl.innerHTML = `
      <div style="margin-bottom:14px;font-family:monospace;font-size:10px;color:#888;text-align:center">
        ${games.length === 0 ? 'No games waiting' : `${games.length} game${games.length > 1 ? 's' : ''} waiting`}
      </div>
      ${rows}
      <div style="display:flex;gap:10px;margin-top:14px;justify-content:center">
        <button id="lobby-start"
          style="padding:10px 18px;font-family:monospace;font-weight:bold;font-size:12px;
                 cursor:pointer;background:rgba(30,80,30,0.9);color:#ccffcc;
                 border:1px solid rgba(100,200,100,0.4);border-radius:6px">
          WAIT FOR OPPONENT<br><span style="font-size:10px;color:#88aa88">${startLabel}</span>
        </button>
        <button id="lobby-cpu"
          style="padding:10px 18px;font-family:monospace;font-weight:bold;font-size:12px;
                 cursor:pointer;background:rgba(30,30,60,0.9);color:#aaaacc;
                 border:1px solid rgba(100,100,200,0.3);border-radius:6px">
          PLAY vs CPU
        </button>
      </div>`

    this.listEl.querySelector('#lobby-start')?.addEventListener('click', () => this.startHosting())
    this.listEl.querySelector('#lobby-cpu')?.addEventListener('click', () => this.onCpu())
    this.listEl.querySelectorAll('button[data-room]').forEach(btn => {
      const room = (btn as HTMLElement).dataset.room!
      const game = games.find(g => g.room === room)
      if (game) btn.addEventListener('click', () => this.joinFromList(game))
    })
  }

  private async joinFromList(entry: GameEntry) {
    this.phase = 'joining'; this.detail = 'joining game...'
    this.showConnecting()
    await removeGame(entry.room)
    await this.runGuest(entry.room)
  }

  // ─── Host flow ─────────────────────────────────────────────────────────────

  private async startHosting() {
    const { myRoom, matchConfig } = this
    this.phase = 'hosting'
    this.detail = 'waiting for opponent...'
    this.showConnecting()

    const entry: GameEntry = {
      room: myRoom,
      team0: matchConfig.teams?.[0].code ?? 'RED',
      flag0: matchConfig.teams?.[0].flag ?? '🟥',
      team1: matchConfig.teams?.[1].code ?? 'BLU',
      flag1: matchConfig.teams?.[1].flag ?? '🟦',
      ts: Date.now(),
    }
    await addGame(entry)

    this.heartbeatTimer = setInterval(async () => {
      if (this.phase !== 'hosting') { clearInterval(this.heartbeatTimer!); return }
      entry.ts = Date.now()
      await addGame(entry).catch(() => {})
    }, HEARTBEAT)

    await this.runHost(myRoom)
  }

  private async runHost(room: string) {
    try {
      const pc = new RTCPeerConnection(await getIceConfig())
      const dc = pc.createDataChannel('game', { ordered: false, maxRetransmits: 0 })
      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState
        console.log('[host] ICE:', s)
        if (this.phase === 'connecting') this.detail = 'ICE: ' + s
      }

      // Clear any stale offer/answer from previous sessions before writing fresh ones
      this.detail = '1/4 clearing stale session...'
      await Promise.all([writeRoom(room, 'offer', ''), writeRoom(room, 'answer', '')]).catch(() => {})
      await sleep(400)

      this.detail = '2/4 creating offer...'
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      this.detail = '3/4 gathering ICE...'
      await waitForIce(pc)

      const offerPayload = JSON.stringify({ sdp: pc.localDescription, ts: Date.now() })
      await writeRoom(room, 'offer', offerPayload)
      console.log('[host] offer written, room:', room)

      this.detail = '4/4 waiting for player to join...'
      const answer = await pollRoom(room, 'answer', HOST_TIMEOUT)
      if (!answer) {
        await this.cleanupHost(room)
        this.showError('No one joined within 2 minutes')
        return
      }

      this.phase = 'connecting'; this.detail = 'connecting P2P...'
      await pc.setRemoteDescription(JSON.parse(answer))
      await waitForOpen(dc, 25_000)

      await this.cleanupHost(room)
      this.phase = 'connected'; this.detail = ''
      await sleep(400)
      this.onConnected('host', dc)
    } catch (err) {
      console.error('[host]', err)
      await this.cleanupHost(room)
      this.showError(String(err).slice(0, 80))
    }
  }

  private async cleanupHost(room: string) {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer!); this.heartbeatTimer = null }
    await Promise.all([
      removeGame(room),
      writeRoom(room, 'offer', ''),
      writeRoom(room, 'answer', ''),
    ]).catch(() => {})
  }

  // ─── Guest flow ─────────────────────────────────────────────────────────────

  private async runGuest(room: string) {
    try {
      const pc = new RTCPeerConnection(await getIceConfig())

      const dcReady = new Promise<RTCDataChannel>((resolve, reject) => {
        pc.ondatachannel = e => { console.log('[guest] datachannel received'); resolve(e.channel) }
        pc.oniceconnectionstatechange = () => {
          const s = pc.iceConnectionState
          console.log('[guest] ICE:', s)
          this.detail = 'ICE: ' + s
          if (s === 'failed') reject(new Error('ICE failed'))
        }
      })

      this.detail = '1/5 reading host offer...'
      const offerJson = await pollRoom(room, 'offer', GUEST_TIMEOUT)
      if (!offerJson) {
        this.showError('Host offer not found — make sure host tapped HOST GAME first')
        return
      }

      this.phase = 'connecting'; this.detail = '2/5 parsing offer...'
      let offerSdp: RTCSessionDescriptionInit
      try {
        const payload = JSON.parse(offerJson) as { sdp?: RTCSessionDescriptionInit; ts?: number }
        // New format: {sdp, ts}. Old format fallback: the SDP directly.
        offerSdp = payload.sdp ?? (payload as unknown as RTCSessionDescriptionInit)
        if (payload.ts && Date.now() - payload.ts > 120_000) {
          this.showError('Host offer is stale — have host tap HOST GAME again')
          return
        }
      } catch {
        this.showError('Could not parse host offer')
        return
      }
      await pc.setRemoteDescription(offerSdp)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      this.detail = '3/5 gathering ICE...'
      await waitForIce(pc)

      await writeRoom(room, 'answer', JSON.stringify(pc.localDescription))
      console.log('[guest] answer written, room:', room)

      this.detail = '4/5 waiting for host P2P...'
      let channel: RTCDataChannel
      try {
        channel = await Promise.race([
          dcReady,
          sleep(35_000).then(() => { throw new Error('no datachannel in 35s') }),
        ])
      } catch (err) {
        this.showError('P2P failed: ' + String(err).slice(0, 60))
        return
      }

      this.detail = '5/5 opening channel...'
      try { await waitForOpen(channel, 25_000) } catch {
        this.showError('Channel did not open — try moving closer to router')
        return
      }

      this.phase = 'connected'; this.detail = ''
      await sleep(400)
      this.onConnected('guest', channel)
    } catch (err) {
      console.error('[guest]', err)
      this.showError(String(err).slice(0, 80))
    }
  }

  // ─── Canvas render ─────────────────────────────────────────────────────────

  tick(dt: number) {
    this.dotTimer += dt
    if (this.dotTimer > 0.5) { this.dotTimer = 0; this.dots = this.dots.length >= 3 ? '' : this.dots + '.' }

    if (this.phase === 'choose' && !this.matchConfig.matchId) {
      this._listRefreshTimer += dt
      if (this._listRefreshTimer > 5) { this._listRefreshTimer = 0; this.refreshList() }
    }
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number) {
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, GAME_W, GAME_H)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 11px monospace'
    ctx.shadowColor = '#000'; ctx.shadowBlur = 6
    ctx.fillText('FIND A MATCH', GAME_W / 2, 22)
    ctx.shadowBlur = 0

    if (this.phase !== 'choose') {
      const label = this.phase === 'connected'  ? 'CONNECTED!'
                  : this.phase === 'error'      ? 'FAILED'
                  : this.phase === 'connecting' ? 'CONNECTING' + this.dots
                  : this.phase === 'hosting'    ? 'WAITING' + this.dots
                  : 'JOINING' + this.dots

      ctx.fillStyle = this.phase === 'connected' ? '#aaffaa' : this.phase === 'error' ? '#ff8888' : '#ffffff'
      ctx.font = 'bold 9px monospace'
      ctx.fillText(label, GAME_W / 2, 110)

      if (this.detail) {
        ctx.fillStyle = '#888888'
        ctx.font = '7px monospace'
        ctx.fillText(this.detail, GAME_W / 2, 124)
      }
    }
  }

  // ─── HTML overlay ──────────────────────────────────────────────────────────

  private buildOverlay() {
    const overlay = document.createElement('div')
    overlay.id = 'lobby-overlay'
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0',
      display: 'flex', flexDirection: 'column',
      alignItems: 'stretch', justifyContent: 'flex-start',
      padding: '32px 20px 20px', boxSizing: 'border-box',
      zIndex: '60',
      overflowY: 'auto',
      background: 'rgba(10,10,20,0.92)',
    })
    const list = document.createElement('div')
    list.id = 'lobby-list'
    overlay.appendChild(list)
    document.body.appendChild(overlay)
    this.overlayEl = overlay
    this.listEl = list
  }

  private showConnecting() {
    if (!this.listEl) return
    this.listEl.innerHTML = `
      <div style="text-align:center;margin-top:80px;font-family:monospace;color:#aaa;font-size:12px">
        Connecting...
      </div>
      <div style="text-align:center;margin-top:20px">
        <button id="lobby-cancel"
          style="padding:8px 20px;font-family:monospace;font-size:12px;cursor:pointer;
                 background:rgba(60,20,20,0.9);color:#ffaaaa;
                 border:1px solid rgba(200,100,100,0.4);border-radius:6px">
          CANCEL → PLAY vs CPU
        </button>
      </div>`
    document.getElementById('lobby-cancel')?.addEventListener('click', () => this.onCpu())
  }

  private showError(msg: string) {
    this.phase = 'error'
    this.detail = msg.slice(0, 60)
    if (!this.listEl) return
    this.listEl.innerHTML = `
      <div style="text-align:center;margin-top:60px;font-family:monospace;color:#ff8888;
                  font-size:13px;font-weight:bold">CONNECTION FAILED</div>
      <div style="text-align:center;margin-top:10px;font-family:monospace;color:#aaa;
                  font-size:11px;padding:0 16px;line-height:1.5">${msg}</div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:20px">
        <button id="lobby-retry"
          style="padding:8px 18px;font-family:monospace;font-size:12px;cursor:pointer;
                 background:rgba(20,60,20,0.9);color:#aaffaa;
                 border:1px solid rgba(100,200,100,0.4);border-radius:6px">
          RETRY
        </button>
        <button id="lobby-cpu-err"
          style="padding:8px 18px;font-family:monospace;font-size:12px;cursor:pointer;
                 background:rgba(30,30,60,0.9);color:#aaaacc;
                 border:1px solid rgba(100,100,200,0.3);border-radius:6px">
          PLAY vs CPU
        </button>
      </div>`
    document.getElementById('lobby-retry')?.addEventListener('click', () => {
      this.phase = 'choose'
      if (this.matchConfig.matchId) this.renderPoolSite()
      else this.refreshList()
    })
    document.getElementById('lobby-cpu-err')?.addEventListener('click', () => this.onCpu())
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

async function waitForIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return
  return new Promise<void>(resolve => {
    const check = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', check)
        resolve()
      }
    }
    pc.addEventListener('icegatheringstatechange', check)
    setTimeout(resolve, 5000)
  })
}

async function waitForOpen(dc: RTCDataChannel, timeoutMs: number): Promise<void> {
  if (dc.readyState === 'open') return
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => {
      clearInterval(poll)
      if (dc.readyState === 'open') { resolve(); return }
      reject(new Error('channel open timeout'))
    }, timeoutMs)
    const poll = setInterval(() => {
      if (dc.readyState === 'open') { clearTimeout(t); clearInterval(poll); resolve() }
    }, 300)
    dc.addEventListener('open', () => { clearTimeout(t); clearInterval(poll); resolve() }, { once: true })
    dc.addEventListener('error', () => { clearTimeout(t); clearInterval(poll); reject(new Error('channel error')) }, { once: true })
  })
}

async function pollRoom(room: string, key: string, timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const val = await readRoom(room, key)
    if (val) return val
    await sleep(POLL_MS)
  }
  return null
}
