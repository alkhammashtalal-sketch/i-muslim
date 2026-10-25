// The Android launcher icon «المورّقة» (add-ons 0072-add31 §3, 0072-add32; web/scripts/android-launcher-icon.mjs): the
// approved files as they are in web/android/icon/; the whole painting in the middle 68 dp of the 108 dp foreground at every density,
// opaque there and transparent around it, so the launcher's mask is the only cut and the crescent and the sun stay in
// the 66 dp safe zone; the painting's own lapis behind it; icon-tinted.png as the themed icon's mask; the launch screen
// and the status-bar icon untouched (frozen, add-on 0072-add28); no alternate icons on Android (activity-alias, relay/
// w1/0072-icon-choice/README.md).
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../..')
const RES = 'web/android/app/src/main/res'
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')
const md5 = (f: string) => createHash('md5').update(fs.readFileSync(path.join(ROOT, f))).digest('hex')
const DENSITIES = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 } as const

/** A non-interlaced 8-bit RGB or RGBA PNG, decoded to RGBA. */
function decode(f: string) {
  const b = fs.readFileSync(path.join(ROOT, f))
  const w = b.readUInt32BE(16)
  const h = b.readUInt32BE(20)
  const [depth, type, , , interlace] = [b[24], b[25], b[26], b[27], b[28]]
  expect([depth, interlace], f).toEqual([8, 0])
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 0
  expect(bpp, f).toBeGreaterThan(0)
  const idat: Buffer[] = []
  for (let i = 8; i < b.length; ) {
    const len = b.readUInt32BE(i)
    if (b.subarray(i + 4, i + 8).toString('latin1') === 'IDAT') idat.push(b.subarray(i + 8, i + 8 + len))
    i += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * bpp
  const px = Buffer.alloc(h * stride)
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)]
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x]
      const a = x >= bpp ? px[y * stride + x - bpp] : 0
      const up = y > 0 ? px[(y - 1) * stride + x] : 0
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0
      const p = a + up - c
      const pr = Math.abs(p - a) <= Math.abs(p - up) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - up) <= Math.abs(p - c) ? up : c
      px[y * stride + x] = (v + [0, a, up, (a + up) >> 1, pr][ft]) & 255
    }
  }
  const alpha = (x: number, y: number) => (bpp === 4 ? px[(y * w + x) * 4 + 3] : 255)
  const rgb = (x: number, y: number) => [0, 1, 2].map((k) => px[(y * w + x) * bpp + k])
  return { w, h, alpha, rgb }
}

describe('the Android launcher icon «المورّقة»', () => {
  it('its sources are the approved files byte for byte (relay/w1/0072-icon-v2/MD5)', () => {
    expect(md5('web/android/icon/icon-default.png')).toBe('9d991f2ffa939529aae8293154a0cd67')
    expect(md5('web/android/icon/icon-tinted.png')).toBe('30ce7e08b6953d6ceaa0980c3c15e1d2')
    expect(fs.existsSync(path.join(ROOT, 'web/android/icon/icon-final.png'))).toBe(false)
  })

  it('the adaptive icon: lapis background, the painting as foreground, the tinted file as the themed icon', () => {
    for (const f of ['ic_launcher', 'ic_launcher_round']) {
      const xml = read(`${RES}/mipmap-anydpi-v26/${f}.xml`)
      expect(xml).toContain('<background android:drawable="@color/ic_launcher_lapis" />')
      expect(xml).toContain('<foreground android:drawable="@mipmap/ic_launcher_foreground" />')
      expect(xml).toContain('<monochrome android:drawable="@mipmap/ic_launcher_monochrome" />')
      expect(xml).not.toContain('inset')
    }
    // The median of the painting's outer 6 px ring.
    expect(read(`${RES}/values/ic_launcher_lapis.xml`)).toContain('<color name="ic_launcher_lapis">#182D52</color>')
  })

  it('at each density: 108 dp layers, the painting opaque over exactly the middle 68 dp, nothing outside it', () => {
    for (const [dpi, k] of Object.entries(DENSITIES)) {
      const size = Math.round(108 * k)
      const fg = decode(`${RES}/mipmap-${dpi}/ic_launcher_foreground.png`)
      expect([fg.w, fg.h], dpi).toEqual([size, size])
      const lo = 20 * k
      const hi = 88 * k
      // Inside, a pixel's centre one pixel in from the edge: opaque. Outside, one pixel beyond: transparent.
      for (const t of [lo + 1, size / 2, hi - 2]) {
        for (const u of [lo + 1, size / 2, hi - 2]) expect(fg.alpha(Math.floor(t), Math.floor(u)), `${dpi} ${t},${u}`).toBe(255)
      }
      for (const t of [Math.floor(lo) - 2, Math.ceil(hi) + 1]) {
        expect(fg.alpha(t, Math.floor(size / 2)), `${dpi} x ${t}`).toBe(0)
        expect(fg.alpha(Math.floor(size / 2), t), `${dpi} y ${t}`).toBe(0)
      }
      const mono = decode(`${RES}/mipmap-${dpi}/ic_launcher_monochrome.png`)
      expect([mono.w, mono.h], dpi).toEqual([size, size])
      for (const f of ['ic_launcher', 'ic_launcher_round']) {
        const l = decode(`${RES}/mipmap-${dpi}/${f}.png`)
        expect([l.w, l.h], `${dpi} ${f}`).toEqual([Math.round(48 * k), Math.round(48 * k)])
      }
    }
  })

  it('the crescent and the sun inside the 66 dp safe zone (the script measures them on the painting)', () => {
    const s = read('web/scripts/android-launcher-icon.mjs')
    expect(s).toContain('export const ICON_DP = 68')
    expect(s).toContain('export const REACH = { crescent: 463.7, sun: 480.7 }')
    for (const r of [463.7, 480.7]) expect((r / 512) * 34).toBeLessThan(33)
  })

  it('the colours are the painting’s: the foreground’s middle pixel is icon-default.png’s, scaled', () => {
    const src = decode('web/android/icon/icon-default.png')
    const fg = decode(`${RES}/mipmap-xxxhdpi/ic_launcher_foreground.png`)
    // 1024 → 272 px: the 3.76 source pixels around the middle, averaged, within a few levels.
    const avg = [0, 1, 2].map((c) => {
      let s = 0
      for (let y = 510; y < 514; y++) for (let x = 510; x < 514; x++) s += src.rgb(x, y)[c]
      return s / 16
    })
    fg.rgb(216, 216).forEach((v, c) => expect(Math.abs(v - avg[c]), `channel ${c}`).toBeLessThan(12))
  })

  it('the themed icon: white, its opacity the tinted file’s lightness (dark ground transparent)', () => {
    const mono = decode(`${RES}/mipmap-xxxhdpi/ic_launcher_monochrome.png`)
    // Inside the 68 dp square: the black ground of the tinted file transparent (most of it), the gold opaque.
    let clear = 0
    let solid = 0
    for (let y = 80; y < 352; y++)
      for (let x = 80; x < 352; x++) {
        const a = mono.alpha(x, y)
        if (a < 16) clear++
        else if (a > 128) {
          solid++
          expect(Math.min(...mono.rgb(x, y))).toBeGreaterThan(250)
        }
      }
    expect(clear / 272 ** 2).toBeGreaterThan(0.5)
    expect(solid / 272 ** 2).toBeGreaterThan(0.05)
  })

  it('the launch screen and the status-bar icon are not this work’s: unchanged (frozen, add-on 0072-add28)', () => {
    const SPLASH: Record<string, string> = {
      hdpi: 'bd8df93dfc775e72d16688f323f5a95e',
      ldpi: '1ea9db8b3080173a66083f9bba024b66',
      mdpi: 'e8e2fe6ed8ea5aeb5e35ef82f65fbfba',
      xhdpi: 'e1a2123f83d9fbb206218527eecde6d1',
      xxhdpi: 'f602a84a2777e80b877f2d6c33d5c1d7',
      xxxhdpi: 'b89f43f052595a65d7534eb8627320e1',
    }
    for (const [d, sum] of Object.entries(SPLASH)) expect(md5(`${RES}/drawable-${d}/splash_icon.png`), d).toBe(sum)
    const s = read('web/scripts/android-assets.mjs')
    expect(s).not.toContain('ic_launcher_foreground.png`] =')
    expect(read('web/scripts/android-launcher-icon.mjs')).not.toMatch(/splash_icon|ic_stat_muslim/)
  })

  it('no alternate icons on Android: one launcher activity, no activity-alias', () => {
    const manifest = read('web/android/app/src/main/AndroidManifest.xml')
    expect(manifest).not.toContain('<activity-alias')
    expect(manifest.match(/android\.intent\.category\.LAUNCHER/g)).toHaveLength(1)
  })
})
