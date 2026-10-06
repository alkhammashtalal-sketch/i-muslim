// The demo video (≤ 2:00) in one command (command: reviewer's reply 0017). Records the nine scenes of
// docs/DEMO_SCRIPT.md in order, on a 390×844 phone, from the live link by default: one continuous browser take with
// Playwright (recordVideo), slow typing and calm scrolling, and the script's line for each scene written on screen in
// the app's own self-hosted font (IBM Plex Sans Arabic), on a half-transparent paper strip at the bottom. An opening
// card «مسلم» and a closing card with the link. No synthetic voice and no music; --voiceover adds a recording made by
// a person. ffmpeg trims, encodes H.264 and checks the length: the script fails if the video is longer than 1:58.
//
//   node scripts/video/record-demo.mjs [--base https://…] [--out out/demo.mp4] [--voiceover file.m4a] [--hd]
//   node scripts/video/record-demo.mjs --hd --voiceover-dir <folder>      → out/demo-hd-voice.mp4
//
// --voiceover-dir: one recorded clip per scene, named 1 … 9 in any audio format (1.m4a from the iPhone's Voice Memos,
// …). Each clip is trimmed of silence at both ends (silenceremove) and evened to -16 LUFS (loudnorm), then measured
// (ffprobe, or ffmpeg when ffprobe is missing); its scene lasts max(the scene's time, the clip + 0.6 s). If the nine
// scenes with the opening and closing cards pass 1:58, the script stops before recording and prints the longest clips
// and how much must go. Each clip starts with its scene; AAC 128k. The written lines stay; the video without the
// voice-over (out/demo-hd.mp4) is left as it is.
//
// The picture: Playwright records the page at its CSS size (390×844); ffmpeg scales it to 780×1688 (lanczos). With
// --hd the take is captured instead through the DevTools screencast at the phone's real density (deviceScaleFactor 2,
// 780×1688 pixels, no scaling) and written to out/demo-hd.mp4; it is a separate take, because recordVideo uses the
// same screencast. Either way the script fails if a quarter of a sampled frame is the plain gray of an empty canvas
// (reply 0022: the first takes showed the page in the top-left quarter only).
//
// Needs Google Chrome and ffmpeg (on PATH, or FFMPEG_PATH=…). The scene durations and lines are read from
// docs/DEMO_SCRIPT.md, so editing the script changes the video. Scenes 2 and 8 need the live model (in mock mode the
// answer card says so); a mock run is for checking the tool only.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const { chromium } = createRequire(path.join(ROOT, 'web/package.json'))('@playwright/test')
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
)
const BASE = (args.base ?? 'https://i-muslim.alkhammashtalal.workers.dev').replace(/\/$/, '')
const HD = process.argv.includes('--hd')
const VO_DIR = args['voiceover-dir'] ? path.resolve(args['voiceover-dir']) : null
if (VO_DIR && args.voiceover) throw new Error('--voiceover and --voiceover-dir: choose one')
const OUT = path.resolve(ROOT, args.out ?? (HD ? (VO_DIR ? 'out/demo-hd-voice.mp4' : 'out/demo-hd.mp4') : VO_DIR ? 'out/demo-voice.mp4' : 'out/demo.mp4'))
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg'
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe'
const MAX_SECONDS = 118
const OPENING = 3
const CLOSING = 4

// ---------- The script: durations and lines from docs/DEMO_SCRIPT.md ----------
const md = fs.readFileSync(path.join(ROOT, 'docs/DEMO_SCRIPT.md'), 'utf8')
const table = [...md.matchAll(/^\| (\d) \| ([^|]+) \| (\d+) ث \|/gm)].map((m) => ({ n: Number(m[1]), title: m[2].trim(), seconds: Number(m[3]) }))
const lines = [...md.matchAll(/^## (\d)\. [^\n]*\n[\s\S]*?\*\*النص:\*\* «([\s\S]*?)»\s*$/gm)].map((m) => ({ n: Number(m[1]), text: m[2].replace(/‹/g, '«').replace(/›/g, '»') }))
if (table.length !== 9 || lines.length !== 9) throw new Error(`DEMO_SCRIPT.md: expected 9 scenes, found ${table.length} durations and ${lines.length} lines`)
// The nine scenes are timed to 2:00 exactly; with the two cards the whole must stay under MAX_SECONDS.
const scale = (MAX_SECONDS - 2 - OPENING - CLOSING) / table.reduce((s, x) => s + x.seconds, 0)
const scenes = table.map((x) => ({ ...x, ms: Math.round(x.seconds * scale * 1000), text: lines.find((l) => l.n === x.n).text }))

fs.mkdirSync(path.dirname(OUT), { recursive: true })
const tmp = fs.mkdtempSync(path.join(path.dirname(OUT), '.rec-'))

// ---------- Voice-over clips (--voiceover-dir): trim, even the loudness, measure, fit the scenes ----------
/** Seconds of an audio or video file: ffprobe, or the Duration line of ffmpeg when ffprobe is not installed. */
function duration(file) {
  try {
    return Number(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim())
  } catch {
    let err = ''
    try {
      execFileSync(FFMPEG, ['-hide_banner', '-i', file], { stdio: 'pipe' })
    } catch (e) {
      err = String(e.stderr)
    }
    const d = err.match(/Duration: (\d+):(\d+):(\d+\.\d+)/)
    if (!d) throw new Error(`no duration for ${file}`)
    return Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3])
  }
}
const voice = {}
if (VO_DIR) {
  const files = fs.readdirSync(VO_DIR)
  const missing = []
  for (const s of scenes) {
    const f = files.find((x) => new RegExp(`^${s.n}\\.[a-z0-9]+$`, 'i').test(x))
    if (!f) {
      missing.push(s.n)
      continue
    }
    const wav = path.join(tmp, `voice-${s.n}.wav`)
    const trim = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05'
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', path.join(VO_DIR, f), '-af', `${trim},areverse,${trim},areverse,loudnorm=I=-16:TP=-1.5:LRA=11`, '-ar', '48000', '-ac', '1', wav])
    voice[s.n] = { file: f, wav, seconds: duration(wav) }
    s.ms = Math.max(s.ms, Math.round((voice[s.n].seconds + 0.6) * 1000))
  }
  if (missing.length) throw new Error(`--voiceover-dir: no clip for scene(s) ${missing.join(', ')} in ${VO_DIR}`)
  const total = OPENING + CLOSING + scenes.reduce((n, s) => n + s.ms, 0) / 1000
  console.log('scene | clip (trimmed) | scene length')
  for (const s of scenes) console.log(`${s.n} ${s.title} | ${voice[s.n].seconds.toFixed(1)} s | ${(s.ms / 1000).toFixed(1)} s`)
  console.log(`total with the cards: ${total.toFixed(1)} s (limit ${MAX_SECONDS} s)`)
  if (total > MAX_SECONDS) {
    const longest = [...scenes].sort((a, b) => voice[b.n].seconds - voice[a.n].seconds).slice(0, 4)
    console.error(`FAILED: the voice-over makes the video ${total.toFixed(1)} s, ${(total - MAX_SECONDS).toFixed(1)} s over ${MAX_SECONDS} s. Shorten the clips by that much in all; the longest:`)
    for (const s of longest) console.error(`  scene ${s.n} (${s.title}): clip ${voice[s.n].seconds.toFixed(1)} s, its scene ${(s.ms / 1000).toFixed(1)} s`)
    fs.rmSync(tmp, { recursive: true, force: true })
    process.exit(1)
  }
}

// ---------- Recording ----------
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'ar',
  colorScheme: 'light',
  serviceWorkers: 'block',
  // At the viewport's own size: a larger size only pads the page with gray (it is not scaled up).
  ...(HD ? {} : { recordVideo: { dir: tmp, size: { width: 390, height: 844 } } }),
})
const page = await context.newPage()
const t0 = Date.now()
// --hd: every painted frame at device pixels, with its time, for ffmpeg's concat demuxer.
const shots = []
const cdp = HD ? await context.newCDPSession(page) : null
if (cdp) {
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = path.join(tmp, `${String(shots.length).padStart(6, '0')}.jpg`)
    fs.writeFileSync(file, Buffer.from(data, 'base64'))
    shots.push({ file, t: metadata.timestamp })
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 })
}
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)))

/** Full-screen card on top of the app (opening and closing), in the app's fonts. Styles are set through the DOM:
 *  the page's Content-Security-Policy (style-src 'self') rejects inline style attributes. */
async function card(lines2) {
  await page.evaluate((ls) => {
    document.getElementById('demo-card')?.remove()
    const el = document.createElement('div')
    el.id = 'demo-card'
    el.setAttribute('aria-hidden', 'true')
    el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#F5EDD9;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center'
    ls.forEach((l, i) => {
      const d = document.createElement('div')
      d.textContent = l
      d.style.cssText =
        i === 0
          ? "font-family:'Amiri Arabic',serif;font-weight:700;font-size:72px;line-height:1.3;color:#1E3A6B"
          : "font-family:'IBM Plex Sans Arabic',sans-serif;font-size:17px;line-height:1.6;color:#5A4A36"
      el.appendChild(d)
    })
    document.body.appendChild(el)
  }, lines2)
}
const uncard = () => page.evaluate(() => document.getElementById('demo-card')?.remove())

/** The scene's line on an opaque paper strip with a thin gold edge, just above the question box (or the bottom of the
 *  frame). Opaque: nothing of the text under it may show through (reply 0023). */
async function caption(text) {
  await page.evaluate((t) => {
    let el = document.getElementById('demo-caption')
    if (!el) {
      el = document.createElement('div')
      el.id = 'demo-caption'
      el.setAttribute('aria-hidden', 'true')
    }
    // An open sheet is a modal dialog in the top layer, above any z-index: the strip goes inside it then, also when
    // a sheet opens while a line is showing.
    const sheet = document.querySelector('dialog[open]')
    ;(sheet ?? document.body).appendChild(el)
    if (!window.__demoFollow)
      window.__demoFollow = setInterval(() => {
        const c = document.getElementById('demo-caption')
        const d = document.querySelector('dialog[open]')
        if (c && d && c.parentElement !== d) {
          c.style.bottom = '40px'
          d.appendChild(c)
        } else if (c && !d && c.parentElement !== document.body) document.body.appendChild(c)
      }, 200)
    const composer = document.querySelector('.composer')
    const bottom = !sheet && composer && composer.getBoundingClientRect().top > 0 ? innerHeight - composer.getBoundingClientRect().top + 6 : 40
    el.style.cssText = `position:fixed;left:40px;right:40px;bottom:${bottom}px;z-index:2147483646;background:#F5EDD9;opacity:1;border:1px solid #B08D3C;border-radius:10px;padding:8px 12px;font-family:'IBM Plex Sans Arabic',sans-serif;font-size:13.5px;line-height:1.7;color:#2A1E14;text-align:center;direction:rtl;pointer-events:none`
    el.textContent = t
    const cs = getComputedStyle(el)
    return { background: cs.backgroundColor, opacity: cs.opacity }
  }, text).then((cs) => {
    if (cs.background !== 'rgb(245, 237, 217)' || cs.opacity !== '1') throw new Error(`caption strip is not opaque: ${JSON.stringify(cs)}`)
  })
}
const uncaption = () => page.evaluate(() => document.getElementById('demo-caption')?.remove())

/** Before the take (trimmed from the video): the strip over the welcome text, its own letters made transparent, must be
 *  one flat paper colour; and the same area without the strip must hold something (so the test means something). */
async function captionPreflight() {
  await caption('سطر للفحص: لا يظهر شيء من النص الذي تحته.')
  const clip = await page.evaluate(() => {
    const el = document.getElementById('demo-caption')
    el.style.bottom = `${Math.round(innerHeight * 0.45)}px`
    el.style.color = 'transparent'
    const r = el.getBoundingClientRect()
    return { x: r.x + 4, y: r.y + 4, width: r.width - 8, height: r.height - 8 }
  })
  const offPaper = async () => {
    const px = execFileSync(FFMPEG, ['-loglevel', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: await page.screenshot({ clip }), maxBuffer: 1 << 26 })
    let off = 0
    for (let i = 0; i < px.length; i += 3) if (Math.abs(px[i] - 245) + Math.abs(px[i + 1] - 237) + Math.abs(px[i + 2] - 217) > 12) off++
    return off / (px.length / 3)
  }
  const withStrip = await offPaper()
  await page.evaluate(() => (document.getElementById('demo-caption').style.visibility = 'hidden'))
  const without = await offPaper()
  await uncaption()
  console.log(`caption strip: ${(withStrip * 100).toFixed(2)}% of its area differs from the paper colour (the area under it without the strip: ${(without * 100).toFixed(1)}%)`)
  if (without < 0.05) throw new Error('caption check: nothing under the strip to test against')
  if (withStrip > 0.002) throw new Error(`caption strip lets ${(withStrip * 100).toFixed(1)}% of what is under it show through`)
}

/** Shows the scene's line in sentence-sized parts across the scene, while `act` plays; the scene lasts `ms`. */
const sceneStart = {}
async function scene(s, act) {
  const start = Date.now()
  sceneStart[s.n] = (start - t0) / 1000 - startAt // seconds into the video (it starts at the opening card)
  const parts = s.text.match(/[^.؟!]+[.؟!]?/g).map((x) => x.trim()).filter(Boolean)
  const total = parts.reduce((n, p) => n + p.length, 0)
  const captions = (async () => {
    for (const p of parts) {
      await caption(p)
      await sleep((s.ms * p.length) / total)
    }
  })()
  await act()
  const spent = Date.now() - start
  if (spent > s.ms) console.warn(`scene ${s.n} ran ${spent} ms, planned ${s.ms} ms`)
  await sleep(s.ms - spent)
  await captions
  await uncaption()
}

const type = async (text) => {
  await page.locator('#q').click()
  await page.locator('#q').pressSequentially(text, { delay: 70 })
  await sleep(400)
  await page.locator('.composer button.send').click()
}
const calmScroll = async (selector, px, steps = 12) => {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(([sel, d]) => document.querySelector(sel)?.scrollBy({ top: d }), [selector, px / steps])
    await sleep(120)
  }
}
const lastTurn = '.turn:last-child article.card'

await page.goto(`${BASE}/?lang=ar&theme=light`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.composer')
await page.evaluate(() => document.fonts.ready)
await captionPreflight()
await sleep(300)
await card(['مسلم', 'مساعد معرفي مقيّد بالمصادر · ليس مفتيًا'])
const startAt = (Date.now() - t0) / 1000
await sleep(OPENING * 1000)
await uncard()

const S = Object.fromEntries(scenes.map((s) => [s.n, s]))
// 1. The problem: the welcome, the shamsa and the suggestions.
await scene(S[1], async () => {
  await sleep(2500)
  await calmScroll('main.scroll', 220)
  await sleep(1500)
  await calmScroll('main.scroll', -220)
})
// 2. An answered question: wudu.
await scene(S[2], async () => {
  await type('كيف أتوضأ؟')
  await page.waitForSelector(lastTurn, { timeout: 30000 })
  await sleep(2500)
  await calmScroll('main.scroll', 260, 16)
  await sleep(2500)
  await calmScroll('main.scroll', 260, 16)
})
// 3. A fatwa question is referred.
await scene(S[3], async () => {
  await type('هل يجوز لي أن أفطر في رمضان لأني مريض بالسكري؟')
  await page.waitForSelector(lastTurn, { timeout: 30000 })
  await page.locator(lastTurn).scrollIntoViewIfNeeded()
})
// 4. An honest apology.
await scene(S[4], async () => {
  await type('من فاز بكأس العالم؟')
  await page.waitForSelector(lastTurn, { timeout: 30000 })
  await page.locator(lastTurn).scrollIntoViewIfNeeded()
})
// 5. The Mushaf and tapping an ayah.
await scene(S[5], async () => {
  const sceneStart = Date.now()
  await page.locator('nav.mode-switch a').last().click()
  await page.waitForSelector('.sura-row', { timeout: 20000 })
  await sleep(1200)
  await page.locator('.sura-row', { hasText: 'البقرة' }).first().click()
  await page.waitForSelector('#a-255', { timeout: 20000 })
  await sleep(1500)
  await page.locator('#a-255').scrollIntoViewIfNeeded()
  await sleep(1200)
  await page.locator('#a-255').click()
  await page.waitForSelector('dialog.sheet[open] .frame-listen', { timeout: 20000 })
  await sleep(1500)
  await calmScroll('dialog.sheet[open] .sheet-body', 300, 14)
  await sleep(1000)
  await calmScroll('dialog.sheet[open] .sheet-body', -300, 10)
  // «استمع للآية» with the scene's last line: the human recitation from mp3quran.net, the frame lit while it plays
  // (command 17). The recording has no sound (Playwright records the picture only); the lit frame and the line show it.
  await sleep(sceneStart + S[5].ms - 4000 - Date.now())
  await page.locator('dialog.sheet[open] .frame-listen .listen-main').click()
  await page.waitForSelector('dialog.sheet[open] .frame.is-reciting', { timeout: 20000 })
  await sleep(2000)
  await page.locator('dialog.sheet[open] .listen-stop').click()
})
// 6. «Explain in my language»: the ayah sheet in the English interface, «Meaning in English · Sahih International»
//    under the ayah, then the reviewed machine translation of al-Muyassar (command 21; «بسّط لي» stays off).
await scene(S[6], async () => {
  await page.keyboard.press('Escape')
  await page.locator('.topbar .pill').first().click()
  await page.locator('dialog[open] .lang-btn', { hasText: 'English' }).click()
  await sleep(600)
  await page.goto(`${BASE}/quran/2/255?lang=en&theme=light`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('dialog.sheet[open] .translation', { timeout: 20000 })
  await sleep(1800)
  await page.locator('dialog.sheet[open] .translation').first().scrollIntoViewIfNeeded()
  await sleep(1800)
  // «Explain in my language» (command 21): the reviewed translation of al-Muyassar, from its published file. Without
  // the file there is no button, and the scene would show nothing of it: stop rather than record that.
  const explain = page.locator('dialog.sheet[open]').getByRole('button', { name: 'Explain in my language' })
  await explain.waitFor({ timeout: 8000 }).catch(() => {
    throw new Error('scene 6: no «Explain in my language» on 2:255 in English (is web/public/explain/en/2_255.json published?)')
  })
  await explain.scrollIntoViewIfNeeded()
  await sleep(900)
  await explain.click()
  await page.locator('dialog.sheet[open] .explain-box').scrollIntoViewIfNeeded()
  await sleep(2500)
  await calmScroll('dialog.sheet[open] .sheet-body', 180, 10)
})
// 7. The path for someone new to Islam.
await scene(S[7], async () => {
  await page.goto(`${BASE}/?lang=ar&theme=light`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.starter-card')
  await sleep(1500)
  await page.locator('.starter-card').click()
  await page.waitForSelector('dialog.sheet[open] .starter-step')
  await sleep(2500)
  await page.locator('dialog.sheet[open] .starter-step', { hasText: 'أركان الإيمان' }).click()
  await page.waitForSelector(lastTurn, { timeout: 30000 })
})
// 8. «How was this answer found?»
await scene(S[8], async () => {
  const link = page.locator('.turn:last-child .how-found-link')
  await link.scrollIntoViewIfNeeded()
  await sleep(1200)
  await link.click()
  await page.waitForSelector('dialog.sheet[open]', { timeout: 20000 })
  await sleep(2000)
  await calmScroll('dialog.sheet[open] .sheet-body', 260, 12)
})
// 9. The close: the sources sheet, then the welcome.
await scene(S[9], async () => {
  await page.keyboard.press('Escape')
  await page.locator('.topbar-actions button').first().click()
  await page.waitForSelector('dialog.sheet[open]')
  await sleep(4000)
  await page.keyboard.press('Escape')
  await page.goto(`${BASE}/?lang=ar&theme=light`, { waitUntil: 'domcontentloaded' })
})
// The closing card: «مسلم» alone (Talal, 6 October; the link is in the submission, not on screen).
await card(['مسلم'])
await sleep(CLOSING * 1000)
const endAt = (Date.now() - t0) / 1000
if (cdp) await cdp.send('Page.stopScreencast')
const raw = HD ? null : await page.video().path()
await context.close()
await browser.close()

// ---------- Encoding: trim to the opening card, H.264, optional voice-over, length check ----------
const length = Math.min(endAt - startAt, MAX_SECONDS)
let ff
if (HD) {
  // Each frame lasts until the next one is painted; the list starts at the opening card.
  const start = t0 / 1000 + startAt
  const from = Math.max(0, shots.findLastIndex((x) => x.t <= start))
  const list = shots.slice(from)
  if (list.length < 2) throw new Error(`--hd: only ${list.length} frames captured`)
  const lines = ['ffconcat version 1.0']
  list.forEach((x, i) => {
    const until = i + 1 < list.length ? list[i + 1].t : t0 / 1000 + endAt
    lines.push(`file '${path.basename(x.file)}'`, `duration ${Math.max(0.001, until - Math.max(x.t, start)).toFixed(4)}`)
  })
  lines.push(`file '${path.basename(list.at(-1).file)}'`)
  fs.writeFileSync(path.join(tmp, 'frames.txt'), lines.join('\n') + '\n')
  ff = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'frames.txt')]
} else {
  ff = ['-y', '-loglevel', 'error', '-ss', startAt.toFixed(2), '-i', raw]
}
const VF = 'fps=30,scale=780:1688:flags=lanczos,format=yuv420p'
if (VO_DIR) {
  // Each clip from its scene's start (adelay), mixed without level changes (the clips never overlap), padded to the end.
  const ns = scenes.map((s) => s.n)
  for (const n of ns) ff.push('-i', voice[n].wav)
  const delays = ns.map((n, i) => `[${i + 1}:a]adelay=${Math.max(0, Math.round(sceneStart[n] * 1000))}:all=1[a${n}]`)
  const graph = [`[0:v]${VF}[v]`, ...delays, `${ns.map((n) => `[a${n}]`).join('')}amix=inputs=${ns.length}:normalize=0:dropout_transition=0,apad[a]`].join(';')
  ff.push('-filter_complex', graph, '-map', '[v]', '-map', '[a]', '-t', length.toFixed(2), '-c:a', 'aac', '-b:a', '128k')
} else {
  if (args.voiceover) ff.push('-i', path.resolve(args.voiceover))
  ff.push('-t', length.toFixed(2), '-vf', VF)
}
ff.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-movflags', '+faststart')
if (args.voiceover) ff.push('-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '128k', '-shortest')
else if (!VO_DIR) ff.push('-an')
ff.push(OUT)
execFileSync(FFMPEG, ff, { stdio: 'inherit' })
fs.rmSync(tmp, { recursive: true, force: true })

const probe = (() => {
  try {
    execFileSync(FFMPEG, ['-hide_banner', '-i', OUT], { stdio: 'pipe' })
  } catch (e) {
    return String(e.stderr)
  }
  return ''
})()
const m = probe.match(/Duration: (\d+):(\d+):(\d+\.\d+)/)
const seconds = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : NaN
console.log(`${path.relative(ROOT, OUT)}: ${seconds.toFixed(1)} s (limit ${MAX_SECONDS} s), from ${BASE}`)
if (VO_DIR) for (const s of scenes) console.log(`scene ${s.n}: starts at ${sceneStart[s.n].toFixed(1)} s, clip ${voice[s.n].seconds.toFixed(1)} s, scene ${(s.ms / 1000).toFixed(1)} s`)
if (!(seconds <= MAX_SECONDS)) {
  console.error(`FAILED: the video is ${seconds.toFixed(1)} s, longer than ${MAX_SECONDS} s`)
  process.exit(1)
}

// The page must fill the frame: sample five frames and fail if a quarter or more of one is neutral gray (the empty
// canvas of a recorder that did not scale the page). The app's own colours are warm (paper, card) or azure and gold.
const grayShare = (t) => {
  const px = execFileSync(FFMPEG, ['-loglevel', 'error', '-ss', t.toFixed(2), '-i', OUT, '-frames:v', '1', '-vf', 'scale=78:169', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 24 })
  let gray = 0
  for (let i = 0; i < px.length; i += 3) {
    const [r, g, b] = [px[i], px[i + 1], px[i + 2]]
    if (Math.max(r, g, b) - Math.min(r, g, b) <= 4 && r >= 100 && r <= 160) gray++
  }
  return gray / (px.length / 3)
}
const samples = [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => ({ t: seconds * f, share: grayShare(seconds * f) }))
const worst = samples.reduce((a, b) => (b.share > a.share ? b : a))
console.log(`frame fill: the most gray of five sampled frames is ${(worst.share * 100).toFixed(1)}% gray (at ${worst.t.toFixed(0)} s)`)
if (worst.share >= 0.25) {
  console.error(`FAILED: ${(worst.share * 100).toFixed(0)}% of the frame at ${worst.t.toFixed(0)} s is plain gray: the page does not fill the video`)
  process.exit(1)
}
