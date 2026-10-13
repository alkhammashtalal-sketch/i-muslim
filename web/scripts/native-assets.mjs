// The app's icon and launch screen for iOS and Android (reply 0033 §ب4), with @capacitor/assets, from the approved
// icon web/public/icons/icon-1024.png as it is (CLAUDE.md §8, images rule): nothing is drawn. Each platform's sizes are
// the icon scaled down; the iOS App Store icon (1024×1024) is then put back byte for byte from the source, so it is not
// even re-encoded. The launch screen is the «سماء» sky (the first stop of the --sky token in tokens.css, day and night)
// with the icon at its centre; the Android adaptive icon's background is the icon's own ground colour.
//
//   cd web && node scripts/native-assets.mjs        (after `npx cap add ios` / `npx cap add android`)
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = path.join(WEB, 'public/icons/icon-1024.png')
const STAGE = 'native-assets' // relative to web/: @capacitor/assets joins it to the project root
const IOS_ICON = path.join(WEB, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
// On the 2732×2732 launch image the icon is 600 px wide: about 200 points on a 3× iPhone. Scaled down, never up.
const SPLASH_ICON_WIDTH = 600

/** The first colour stop of --sky in the day block (:root) and in the night block of tokens.css. */
export function skyColours(css) {
  const stops = [...css.matchAll(/--sky:\s*linear-gradient\(\s*180deg\s*,\s*(#[0-9a-f]{6})\b/gi)].map((m) => m[1].toLowerCase())
  if (stops.length < 2) throw new Error('tokens.css: expected --sky in the day and night blocks')
  return { day: stops[0], night: stops[1] }
}

const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex')

async function main() {
  const meta = await sharp(SOURCE).metadata()
  if (meta.width !== 1024 || meta.height !== 1024 || meta.hasAlpha) throw new Error('icon-1024.png must be 1024×1024 without alpha (App Store icon)')
  const { data } = await sharp(SOURCE).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true })
  const ground = '#' + [...data.subarray(0, 3)].map((b) => b.toString(16).padStart(2, '0')).join('')
  const sky = skyColours(fs.readFileSync(path.join(WEB, 'src/styles/tokens.css'), 'utf8'))

  const stage = path.join(WEB, STAGE)
  fs.rmSync(stage, { recursive: true, force: true })
  fs.mkdirSync(stage)
  // "logo" is @capacitor/assets' single-source mode: icons and launch screens from one image and the colours.
  fs.copyFileSync(SOURCE, path.join(stage, 'logo.png'))
  try {
    const args = ['generate', '--ios', '--android', '--assetPath', STAGE,
      '--iconBackgroundColor', ground, '--iconBackgroundColorDark', ground,
      '--splashBackgroundColor', sky.day, '--splashBackgroundColorDark', sky.night,
      '--logoSplashTargetWidth', String(SPLASH_ICON_WIDTH)]
    console.log(`capacitor-assets ${args.join(' ')}`)
    execFileSync(path.join(WEB, 'node_modules/.bin/capacitor-assets'), args, { cwd: WEB, stdio: 'inherit' })
  } finally {
    fs.rmSync(stage, { recursive: true, force: true })
  }

  // The templates' own pictures, now referenced by nothing: Capacitor's placeholder launch image on iOS, and its vector
  // logo and white ground for the Android launcher icon. Nothing of theirs ships.
  const leftovers = [
    'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png',
    'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png',
    'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png',
    'android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml',
    'android/app/src/main/res/drawable/ic_launcher_background.xml',
    'android/app/src/main/res/values/ic_launcher_background.xml',
  ]
  for (const f of leftovers) fs.rmSync(path.join(WEB, f), { force: true })
  try {
    fs.rmdirSync(path.join(WEB, 'android/app/src/main/res/drawable-v24')) // only when empty
  } catch {}

  // The App Store icon: the approved file itself.
  fs.copyFileSync(SOURCE, IOS_ICON)
  if (sha(IOS_ICON) !== sha(SOURCE)) throw new Error('iOS icon differs from the source')
  console.log(`iOS AppIcon = icon-1024.png (sha256 ${sha(SOURCE).slice(0, 12)}…); sky ${sky.day} / ${sky.night}; ground ${ground}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
