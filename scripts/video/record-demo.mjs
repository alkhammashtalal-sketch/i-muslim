// The demo video (≤ 2:00) in one command (command: reviewer's reply 0017). Records the nine scenes of
// docs/DEMO_SCRIPT.md in order, on a 390×844 phone, from the live link by default: one continuous browser take with
// Playwright (recordVideo), slow typing and calm scrolling, and the script's line for each scene written on screen in
// the app's own self-hosted font (IBM Plex Sans Arabic), on a half-transparent paper strip at the bottom. An opening
// card «مسلم» and a closing card with the link. No synthetic voice and no music; --voiceover adds a recording made by
// a person. ffmpeg trims, encodes H.264 and checks the length: the script fails if the video is longer than 1:58.
//
//   node scripts/video/record-demo.mjs [--base https://…] [--out out/demo.mp4] [--voiceover file.m4a]
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
const OUT = path.resolve(ROOT, args.out ?? 'out/demo.mp4')
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg'
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

// ---------- Recording ----------
fs.mkdirSync(path.dirname(OUT), { recursive: true })
const tmp = fs.mkdtempSync(path.join(path.dirname(OUT), '.rec-'))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'ar',
  colorScheme: 'light',
  serviceWorkers: 'block',
  recordVideo: { dir: tmp, size: { width: 780, height: 1688 } },
})
const page = await context.newPage()
const t0 = Date.now()
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

/** The scene's line on a half-transparent paper strip, just above the question box (or the bottom of the frame). */
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
    el.style.cssText = `position:fixed;left:40px;right:40px;bottom:${bottom}px;z-index:2147483646;background:rgba(245,237,217,0.93);border:1px solid #B08D3C;border-radius:10px;padding:8px 12px;font-family:'IBM Plex Sans Arabic',sans-serif;font-size:13.5px;line-height:1.7;color:#2A1E14;text-align:center;direction:rtl;pointer-events:none`
    el.textContent = t
  }, text)
}
const uncaption = () => page.evaluate(() => document.getElementById('demo-caption')?.remove())

/** Shows the scene's line in sentence-sized parts across the scene, while `act` plays; the scene lasts `ms`. */
async function scene(s, act) {
  const start = Date.now()
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
// 6. «Explain in my language», in English.
await scene(S[6], async () => {
  await page.keyboard.press('Escape')
  await page.locator('.topbar .pill').first().click()
  await page.locator('dialog[open] .lang-btn', { hasText: 'English' }).click()
  await sleep(600)
  await page.goto(`${BASE}/quran/2/255?lang=en&theme=light`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('dialog.sheet[open]', { timeout: 20000 })
  await sleep(1800)
  const btn = page.locator('dialog.sheet[open] button.explain-btn')
  await btn.scrollIntoViewIfNeeded()
  await sleep(800)
  await btn.click()
  await page.waitForSelector('dialog.sheet[open] .explain-box', { timeout: 30000 })
  await page.locator('dialog.sheet[open] .explain-box').scrollIntoViewIfNeeded()
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
await card(['مسلم', BASE.replace(/^https?:\/\//, '')])
await sleep(CLOSING * 1000)
const endAt = (Date.now() - t0) / 1000
const raw = await page.video().path()
await context.close()
await browser.close()

// ---------- Encoding: trim to the opening card, H.264, optional voice-over, length check ----------
const length = Math.min(endAt - startAt, MAX_SECONDS)
const ff = ['-y', '-loglevel', 'error', '-ss', startAt.toFixed(2), '-i', raw]
if (args.voiceover) ff.push('-i', path.resolve(args.voiceover))
ff.push('-t', length.toFixed(2), '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-movflags', '+faststart')
if (args.voiceover) ff.push('-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '128k', '-shortest')
else ff.push('-an')
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
if (!(seconds <= MAX_SECONDS)) {
  console.error(`FAILED: the video is ${seconds.toFixed(1)} s, longer than ${MAX_SECONDS} s`)
  process.exit(1)
}
