import { expect, test, type Browser } from '@playwright/test'

// Reply 0043-add7 (Talal, 13 October): the first version is day only. With the phone on dark, the main pages are the
// day pages pixel for pixel. One context per setting, warmed once so the fonts and pictures are cached, a fixed clock
// and reduced motion: the two captures of a page then differ only by the phone's setting.
test.use({ serviceWorkers: 'block' })
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
const PAGES = ['/?lang=ar', '/?lang=en', '/today?lang=ar', '/today/qibla?lang=ar', '/today/times?lang=ar', '/sources?lang=ar', '/language?lang=ar', '/quran?lang=ar']

async function captureAll(browser: Browser, baseURL: string, colorScheme: 'light' | 'dark') {
  const ctx = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme, reducedMotion: 'reduce', serviceWorkers: 'block' })
  await ctx.addInitScript((p) => localStorage.setItem('muslim.place.v1', JSON.stringify(p)), RIYADH)
  const shots: { theme: string | null; png: Buffer }[] = []
  for (const url of ['/?lang=ar', ...PAGES]) {
    const page = await ctx.newPage()
    await page.clock.setFixedTime(new Date('2026-10-13T20:00:00Z'))
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(800)
    shots.push({ theme: await page.locator('html').getAttribute('data-theme'), png: await page.screenshot() })
    await page.close()
  }
  await ctx.close()
  return shots.slice(1)
}

// Pixels that differ, and by how much at most (of 255), measured in a canvas.
const measure = async ([a, b]: [string, string]) => {
  const load = (x: string) => new Promise<HTMLImageElement>((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + x })
  const px = (img: HTMLImageElement) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d')!; g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data }
  const [da, db] = (await Promise.all([load(a), load(b)])).map(px)
  let n = 0, m = 0
  for (let i = 0; i < da.length; i += 4) {
    const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]))
    if (d) { n++; m = Math.max(m, d) }
  }
  return [n, m]
}

test('the phone on dark: the main pages are the day pages, pixel for pixel', async ({ browser, baseURL, page }) => {
  test.skip(test.info().project.name !== 'mobile', 'one viewport is enough')
  test.setTimeout(240_000)
  const day = await captureAll(browser, baseURL!, 'light')
  const night = await captureAll(browser, baseURL!, 'dark')
  for (const [i, url] of PAGES.entries()) {
    expect([day[i].theme, night[i].theme], url).toEqual(['light', 'light'])
    if (night[i].png.equals(day[i].png)) continue
    // Not byte-identical: the gradients, the grain filters (the compass's sky) and the soft shadows raster in tiles that
    // can come out a few levels apart from one capture to another (seen 13 Oct: at most 21 of 255, only in those areas,
    // on a different page each run; solid colours and text never). The night tokens were about 230 levels from the day
    // (#0a1330 against #f6f4ef): 32 separates the two.
    const [n, m] = await page.evaluate(measure, [day[i].png.toString('base64'), night[i].png.toString('base64')] as [string, string])
    test.info().annotations.push({ type: 'raster noise', description: `${url}: ${n} pixels, at most ${m} of 255` })
    expect(m, `${url}: ${n} pixels differ, at most ${m} of 255`).toBeLessThanOrEqual(32)
  }
})
