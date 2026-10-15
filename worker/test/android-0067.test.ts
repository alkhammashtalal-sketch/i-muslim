// Reply 0067: the Android app's alternatives to what 0066 hid there, in web/android and web/src/native/android only,
// with the iPhone app as it is: nearby mosques (add-on 0067-add1: the tile opens Google Maps; nothing to our server), «أذكار المواقف»
// opened by itself (the icon's shortcuts, a dhikr pinned to the home screen, an NFC tag's link), replies read aloud by
// Android's own voices, the eight widgets, and the recitation on the lock screen. The emulator runs are in the report
// (relay/w1/0067-report.md); these hold what can be read from the code.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ROOT = path.resolve(__dirname, '../..')
const WEB = path.join(ROOT, 'web')
const RES = path.join(WEB, 'android/app/src/main/res')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const

describe('the rule of reply 0067: the iPhone app as it is', () => {
  it('capacitor.config.ts gives the iPhone exactly its own plugins (Package.swift), so `cap sync ios` never adds an Android one', async () => {
    const { default: config, IOS_PLUGINS } = await import('../../web/capacitor.config')
    expect(config.ios?.includePlugins).toEqual(IOS_PLUGINS)
    const pkg = read('web/ios/App/CapApp-SPM/Package.swift')
    const inSwift = [...pkg.matchAll(/path: "\.\.\/\.\.\/\.\.\/node_modules\/([^"]+)"/g)].map((m) => m[1]).sort()
    expect([...IOS_PLUGINS].sort()).toEqual(inSwift)
    expect(IOS_PLUGINS).not.toContain('@capacitor-community/text-to-speech')
    expect(pkg).not.toMatch(/text-to-speech|TextToSpeech/)
    expect(read('web/ios/App/App/capacitor.config.json')).not.toMatch(/TextToSpeech/)
  })

  it('the Android plugin is pinned and Android-only in its use; the shared code reaches Android through isAndroid()', () => {
    const pkg = JSON.parse(read('web/package.json')) as { dependencies: Record<string, string> }
    expect(pkg.dependencies['@capacitor-community/text-to-speech']).toBe('8.0.2')
    expect(read('web/android/capacitor.settings.gradle')).toContain("project(':capacitor-community-text-to-speech')")
    expect(read('web/src/native/boot.ts')).toContain("if (isAndroid()) void import('./android/speech').then((m) => m.installAndroidSpeech())")
    // Every Android module of web/src is in its own folder, and imported only behind the switch or by Android files.
    const dir = path.join(WEB, 'src/native/android')
    expect(fs.readdirSync(dir).sort()).toEqual(['Mawaqif.tsx', 'VoiceMissing.tsx', 'android.css', 'back.ts', 'bars.ts', 'hijri-names.ts', 'hijri.ts', 'maps.ts', 'media.ts', 'shortcuts.ts', 'speech.ts', 'strings.ts', 'voice-missing.ts'].sort())
    expect(fs.existsSync(path.join(WEB, 'src/native/android-bars.ts'))).toBe(false)
  })
})

describe('1. nearby mosques in the Android app (add-on 0067-add1): Google Maps, nothing to our server', () => {
  it('the tile is back (eight on «يومك», as build 16); on Android it opens Google Maps, with its line under it', () => {
    const slots = read('web/src/v2/daily/HomeSlots.tsx')
    expect(slots).toContain("['mosques', <IcMosque />, 'green']")
    expect(slots).not.toMatch(/shownTools|TOOLS\.filter/)
    expect(slots).toContain("const maps = k === 'mosques' && isAndroid()")
    expect(slots).toContain('onClick={maps ? (e) => (e.preventDefault(), void openMosqueSearch(lang)) : go(TODAY_PATHS[k])}')
    expect(slots).toContain('{maps && <span className="dt-tool-note">{ANDROID[lang].mapsNote}</span>}')
    // The mosques screen (and its /api/mosques) is not reached in Android: its path goes home. The screen is build 16's.
    expect(read('web/src/v2/daily/TodayView.tsx')).toContain("const hiddenHere = (tool: string) => tool === 'mosques' && isAndroid()")
    expect(read('web/src/v2/daily/Mosques.tsx')).not.toMatch(/isAndroid|android\//)
  })

  it('the search: «مسجد» in the interface language; Google Maps, else any maps app, else the browser; no location, no server', async () => {
    const { MOSQUE_WORD, googleMapsSearch, geoSearch, GOOGLE_MAPS } = await import('../../web/src/native/android/maps')
    expect(Object.keys(MOSQUE_WORD).sort()).toEqual([...LANGS].sort())
    expect(MOSQUE_WORD.ar).toBe('مسجد')
    expect(MOSQUE_WORD.en).toBe('mosque')
    expect(googleMapsSearch('en')).toBe('https://www.google.com/maps/search/?api=1&query=mosque')
    expect(geoSearch('ar')).toBe(`geo:0,0?q=${encodeURIComponent('مسجد')}`)
    expect(geoSearch('xx')).toBe(`geo:0,0?q=${encodeURIComponent('مسجد')}`)
    expect(GOOGLE_MAPS).toBe('com.google.android.apps.maps')
    // The code (its comments set aside) asks nothing of our server and reads no place.
    const src = read('web/src/native/android/maps.ts').replace(/^\s*\/\/.*$/gm, '')
    expect(src).not.toMatch(/fetch\(|\bapi\(|\/api\/|Geolocation|getCurrentPosition|usePlace|savedPlace|location/)
    const { ANDROID } = await import('../../web/src/native/android/strings')
    expect(ANDROID.ar.mapsNote).toBe('يفتح في خرائط Google')
    for (const l of LANGS) expect(ANDROID[l].mapsNote.length).toBeGreaterThan(0)
    const manifest = read('web/android/app/src/main/AndroidManifest.xml')
    expect(manifest).toContain('<package android:name="com.google.android.apps.maps" />')
    expect(manifest).toMatch(/<intent>\s*<action android:name="android.intent.action.VIEW" \/>\s*<data android:scheme="geo" \/>\s*<\/intent>/)
  })
})

describe('2. «أذكار المواقف» opened by itself in Android', () => {
  it('the icon’s four shortcuts: the morning and evening adhkar, travel and sleep, in the interface language', async () => {
    const { iconShortcuts, mawaqifLink } = await import('../../web/src/native/android/shortcuts')
    const { ADHKAR_SPLIT } = await import('../../web/src/v2/daily/adhkar/adhkar-model')
    const ar = iconShortcuts('ar')
    expect(ar.map((s) => [s.id, s.label])).toEqual([
      ['adhkar-morning', 'أذكار الصباح'],
      ['adhkar-evening', 'أذكار المساء'],
      ['mawaqif-travel', 'السفر'],
      ['mawaqif-sleep', 'النوم'],
    ])
    expect(ar.map((s) => s.url)).toEqual([
      ADHKAR_SPLIT ? 'imuslim://today/adhkar?part=morning' : 'imuslim://today/adhkar',
      ADHKAR_SPLIT ? 'imuslim://today/adhkar?part=evening' : 'imuslim://today/adhkar',
      'imuslim://mawaqif/travel',
      'imuslim://mawaqif/sleep',
    ])
    expect(iconShortcuts('en').map((s) => s.label)).toEqual(['Morning adhkar', 'Evening adhkar', 'Travel', 'Sleep'])
    for (const l of LANGS) expect(iconShortcuts(l).every((s) => s.label.length > 0)).toBe(true)
    expect(mawaqifLink('home', 'leave')).toBe('imuslim://mawaqif/home?step=leave')
  })

  it('the card and its page in Android: the three ways, in the ten languages; Siri’s page stays the iPhone’s', async () => {
    const m = read('web/src/v2/daily/mawaqif/Mawaqif.tsx')
    expect(m).toContain("if (r.page === 'auto') return isAndroid() ? <AutoAndroid /> : <Auto />")
    expect(m).toContain('{isAndroid() && <SituationActions sit={sit} step={cur.stage.id} />}')
    expect(m).toContain('<span>{isAndroid() ? ANDROID[lang].autoSub : s.autoSub}</span>')
    const { ANDROID } = await import('../../web/src/native/android/strings')
    for (const l of LANGS) {
      const s = ANDROID[l]
      for (const [k, v] of Object.entries(s)) expect(Array.isArray(v) ? v.every((x) => x.length > 0) : (v as string).length > 0, `${l}.${k}`).toBe(true)
      expect(s.iconSteps.length).toBe(3)
      expect(s.nfcSteps.length).toBe(4)
      // No Google Assistant, no Android Auto, never «soon».
      expect(JSON.stringify(s)).not.toMatch(/Assistant|Android Auto|قريبًا|coming soon/i)
    }
    // The dhikr's link is copied, never written on the page (no Latin text in the interface, CLAUDE.md §8).
    expect(read('web/src/native/android/Mawaqif.tsx')).not.toMatch(/\{link\}/)
  })

  it('an NFC tag or a pinned dhikr opens the page as a widget’s link does; the page’s own query does not follow it', () => {
    const manifest = read('web/android/app/src/main/AndroidManifest.xml')
    expect(manifest).toMatch(/<action android:name="android.intent.action.VIEW" \/>\s*<category android:name="android.intent.category.DEFAULT" \/>\s*<category android:name="android.intent.category.BROWSABLE" \/>\s*<data android:scheme="imuslim" \/>/)
    expect(manifest).toMatch(/<action android:name="android.nfc.action.NDEF_DISCOVERED" \/>\s*<category android:name="android.intent.category.DEFAULT" \/>\s*<data android:scheme="imuslim" \/>/)
    const main = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/MainActivity.java')
    expect(main).toContain('if (data != null && "imuslim".equals(data.getScheme())) intent.setAction(Intent.ACTION_VIEW);')
    expect(main).toMatch(/asLink\(getIntent\(\)\);\s*super\.onCreate/)
    expect(read('web/src/native/NativeDevice.tsx')).toContain("if (isAndroid()) history.replaceState(history.state, '', location.pathname)")
    const plugin = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/ShortcutsPlugin.java')
    expect(plugin).toContain('ShortcutManagerCompat.setDynamicShortcuts(getContext(), list);')
    expect(plugin).toContain('ShortcutManagerCompat.requestPinShortcut(getContext(), s, null)')
    expect(plugin).toContain('if (id.isEmpty() || label.isEmpty() || !url.startsWith("imuslim://")) return null;')
  })

  it('every situation’s icon is an Android vector, made from the app’s own drawing', () => {
    const data = JSON.parse(read('data/mawaqif.json')) as { situations: { icon: string }[] }
    for (const s of data.situations) expect(fs.existsSync(path.join(RES, `drawable/mq_${s.icon}.xml`)), s.icon).toBe(true)
    for (const extra of ['sunrise', 'crescent', 'grid', 'hand', 'house']) expect(fs.existsSync(path.join(RES, `drawable/mq_${extra}.xml`))).toBe(true)
    // The car's two wheels are the drawing's two circles.
    const car = fs.readFileSync(path.join(RES, 'drawable/mq_car.xml'), 'utf8')
    expect(car).toContain('android:pathData="M6.5,15.5a1,1 0 1,0 2,0a1,1 0 1,0 -2,0z"')
    expect(car).toContain('android:strokeWidth="1.6"')
  })
})

describe('3. replies read aloud with Android’s voices', () => {
  type Spoken = { text: string; lang: string }
  const spoken: Spoken[] = []
  let finish: (() => void) | null = null
  beforeEach(() => {
    spoken.length = 0
    vi.resetModules()
    vi.doMock('../../web/src/native/platform', () => ({ isAndroid: () => true, isNative: () => true, platform: () => 'android' }))
    vi.stubGlobal('window', globalThis)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.doUnmock('../../web/src/native/platform')
    delete (globalThis as Record<string, unknown>).speechSynthesis
    delete (globalThis as Record<string, unknown>).SpeechSynthesisUtterance
  })

  it('speechSynthesis over the engine: only voices on the phone (no network, data installed), one line at a time, «interrupted» on cancel', async () => {
    const { installAndroidSpeech } = await import('../../web/src/native/android/speech')
    // The engine lists every voice it has, sorted by name (the plugin's order); the phone has only some of them.
    const all = ['ar-xa-x-arc-local', 'ar-xa-x-arc-network', 'en-us-x-iol-local', 'ur-pk-x-cfn-network'].map((n) => ({ voiceURI: n, name: n, lang: n.slice(0, 5), localService: !n.endsWith('network'), default: false }))
    const engine = {
      getSupportedVoices: async () => ({ voices: all as unknown as SpeechSynthesisVoice[] }),
      speak: (o: { text: string; lang?: string; voice?: number }) => (spoken.push({ text: o.text, lang: `${o.lang}#${o.voice}` }), new Promise<void>((r) => (finish = r))),
      stop: async () => undefined,
    }
    const phone = { installed: async () => ({ voices: [{ name: 'en-us-x-iol-local', lang: 'en-US' }, { name: 'ar-xa-x-arc-local', lang: 'ar-XA' }] }) }
    installAndroidSpeech(engine, phone)
    const synth = (globalThis as unknown as { speechSynthesis: SpeechSynthesis }).speechSynthesis
    await new Promise<void>((r) => synth.addEventListener('voiceschanged', () => r()))
    // Arabic's voice of the language (no Saudi one on the phone), English; Urdu only online: no voice.
    expect(synth.getVoices().map((v) => v.lang)).toEqual(['ar-XA', 'en-US'])
    // speaker.ts picks by language: Urdu has no voice here, so it is not read in another language's voice.
    vi.doMock('../../web/src/quran/recitation', () => ({ stop: () => undefined, stopReadingRecitation: () => undefined }))
    const { pickVoice } = await import('../../web/src/voice/speaker')
    vi.doUnmock('../../web/src/quran/recitation')
    expect(pickVoice(synth.getVoices(), 'ar')?.lang).toBe('ar-XA')
    expect(pickVoice(synth.getVoices(), 'ur')).toBeNull()
    const U = (globalThis as unknown as { SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance }).SpeechSynthesisUtterance
    const events: string[] = []
    const u = new U('السلام عليكم')
    u.voice = synth.getVoices()[0]
    u.onend = () => events.push('end')
    u.onerror = (e) => events.push(`error:${(e as SpeechSynthesisErrorEvent).error}`)
    synth.speak(u)
    // Spoken with the phone's own voice, by its place in the engine's list: never the network one.
    expect(spoken).toEqual([{ text: 'السلام عليكم', lang: 'ar-XA#0' }])
    expect(synth.speaking).toBe(true)
    finish!()
    await new Promise((r) => setTimeout(r, 0))
    expect(events).toEqual(['end'])
    const v = new U('second')
    v.lang = 'en-US'
    v.onerror = (e) => events.push(`error:${(e as SpeechSynthesisErrorEvent).error}`)
    synth.speak(v)
    synth.cancel()
    finish!()
    await new Promise((r) => setTimeout(r, 0))
    expect(events).toEqual(['end', 'error:interrupted'])
    expect(synth.speaking).toBe(false)
    // A line in a language the phone has no voice for is not sent to the engine.
    const w = new U('اردو')
    w.lang = 'ur-PK'
    w.onerror = (e) => events.push(`error:${(e as SpeechSynthesisErrorEvent).error}`)
    synth.speak(w)
    expect(events.at(-1)).toBe('error:language-unavailable')
    expect(spoken).toHaveLength(2)
    const { hasAndroidVoice } = await import('../../web/src/native/android/speech')
    expect([await hasAndroidVoice('ar'), await hasAndroidVoice('en'), await hasAndroidVoice('ur')]).toEqual([true, true, false])
  })

  it('no voice for the language: the Android hint says what to install, and its button opens the installer', () => {
    expect(read('web/src/voice/VoiceChat.tsx')).toContain('<VoiceMissing lang={lang} className="voice-bar is-note" />')
    expect(read('web/src/voice/VoiceMode.tsx')).toContain('const androidMissing = useVoiceMissing(lang)')
    const sp = read('web/src/native/android/speech.ts')
    expect(sp).toContain("if (!(await open('android.speech.tts.engine.INSTALL_TTS_DATA'))) await open('com.android.settings.TTS_SETTINGS')")
    // What is read is speaker.ts and trust/speakable.ts as on the iPhone: nothing here decides what is said.
    expect(sp).not.toMatch(/from '[^']*(speakable|quran)[^']*'/)
  })
})

describe('4. the eight widgets', () => {
  const KINDS = { next: [2, 2], times: [4, 4], date: [2, 2], ayah: [4, 2], hadith: [4, 2], tasbih: [2, 2], adhkar: [2, 2], mawaqif: [4, 4] } as const
  const FAMILY = { next: 'NextPrayerWidget', times: 'TodayTimesWidget', date: 'DateWidget', ayah: 'AyahWidget', hadith: 'HadithWidget', tasbih: 'TasbihWidget', adhkar: 'AdhkarWidget', mawaqif: 'MawaqifWidget' } as const

  it('the iPhone’s eight, each its own provider at the iPhone’s size (small 2 × 2, medium 4 × 2, large 4 × 4)', () => {
    const manifest = read('web/android/app/src/main/AndroidManifest.xml')
    const swift = read('web/ios/App/MuslimWidgets/Widgets.swift')
    for (const [k, [w, h]] of Object.entries(KINDS)) {
      const cls = k[0].toUpperCase() + k.slice(1)
      expect(manifest).toContain(`<receiver android:name=".widget.MuslimWidget$${cls}" android:exported="false" android:label="@string/widget_${k}_name">`)
      expect(manifest).toContain(`<meta-data android:name="android.appwidget.provider" android:resource="@xml/widget_${k}" />`)
      const info = fs.readFileSync(path.join(RES, `xml/widget_${k}.xml`), 'utf8')
      expect(info).toContain(`android:targetCellWidth="${w}"`)
      expect(info).toContain(`android:targetCellHeight="${h}"`)
      expect(info).toContain('android:initialLayout="@layout/widget_muslim"')
      const family = w === 2 ? 'systemSmall' : h === 2 ? 'systemMedium' : 'systemLarge'
      const block = swift.slice(swift.indexOf(`struct ${FAMILY[k as keyof typeof FAMILY]}: Widget`))
      expect(block.slice(0, block.indexOf('\n}\n'))).toMatch(new RegExp(`\\.${family}\\b`))
    }
  })

  it('the same data and bridge as the iPhone’s: WidgetBridge write and read, synced on Android too', () => {
    const data = read('web/src/native/widget-data.ts')
    expect(data).toContain("const withWidgets = () => platform() === 'ios' || isAndroid()")
    expect(data.match(/if \(!withWidgets\(\)\) return/g)).toHaveLength(2)
    const bridge = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/widget/WidgetBridgePlugin.java')
    expect(bridge).toContain('@CapacitorPlugin(name = "WidgetBridge")')
    expect(bridge).toMatch(/public void write\(PluginCall call\)[\s\S]*public void read\(PluginCall call\)/)
    // «+١»: the iPhone's rule (TasbihIntent.swift), and the app reads it back as the iPhone's.
    const tap = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/widget/WidgetActions.java')
    expect(tap).toContain('t.put("n", limit > 0 && n >= limit ? 1 : n + 1);')
    expect(tap).toContain('t.put("changedByWidget", true);')
    expect(data).toContain('if (prev?.tasbih?.changedByWidget && prev.tasbih.day === tasbihToday())')
  })

  it('the iPhone widgets’ fonts and pictures, byte for byte; their names in the ten languages', async () => {
    const sha = (f: string) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
    const ios = path.join(WEB, 'ios/App/MuslimWidgets')
    const pairs: [string, string][] = [
      ['Fonts/IBMPlexSansArabic-Regular.ttf', 'font/plex_regular.ttf'],
      ['Fonts/IBMPlexSansArabic-Medium.ttf', 'font/plex_medium.ttf'],
      ['Fonts/IBMPlexSansArabic-SemiBold.ttf', 'font/plex_semibold.ttf'],
      ['Fonts/IBMPlexSansArabic-Bold.ttf', 'font/plex_bold.ttf'],
      ['Fonts/Amiri-Regular.ttf', 'font/amiri_regular.ttf'],
      ['Fonts/Amiri-Bold.ttf', 'font/amiri_bold.ttf'],
      ['Assets.xcassets/sky.imageset/sky.png', 'drawable-nodpi/widget_sky.png'],
      ['Assets.xcassets/paper.imageset/paper.png', 'drawable-nodpi/widget_paper.png'],
      ['Assets.xcassets/medallion.imageset/medallion.png', 'drawable-nodpi/widget_medallion.png'],
    ]
    for (const [a, b] of pairs) expect(sha(path.join(RES, b)), b).toBe(sha(path.join(ios, a)))
    const { WIDGET_STRINGS } = await import('../../web/src/native/widget-strings')
    for (const l of LANGS) {
      const xml = fs.readFileSync(path.join(RES, `${l === 'ar' ? 'values' : `values-${l === 'id' ? 'in' : l}`}/widget_strings.xml`), 'utf8')
      const text = (k: string) => xml.match(new RegExp(`<string name="${k}">([^<]*)</string>`))?.[1].replace(/\\'/g, "'")
      for (const k of Object.keys(KINDS) as (keyof typeof KINDS)[]) expect(text(`widget_${k}_name`), `${l} ${k}`).toBe(WIDGET_STRINGS[l].names[k].name)
      expect(text('widget_open_app')).toBe(WIDGET_STRINGS[l].openApp)
    }
  })

  it('drawn at the widget’s size with the board’s numbers; the ayah never cut (0.7 at most, or the invitation)', () => {
    const p = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/widget/WidgetPainter.java')
    expect(p).toContain('for (float k : new float[] { 1, 0.9f, 0.8f, 0.7f }) {')
    expect(p).toContain('// Even at 0.7 the ayah does not hold whole: its reference and an invitation to open it, and no part of it.')
    expect(p).not.toMatch(/setEllipsize[^\n]*\n[^\n]*ayah/)
    for (const [name, hex] of [['INK', '1B3466'], ['GOLD', 'C9A04E'], ['PAPER', 'F3EAD6'], ['SKY_MID', '163A7C'], ['COUNTDOWN', 'F1D391']]) expect(p).toContain(`static final int ${name} = 0xFF${hex};`)
    const theme = read('web/ios/App/MuslimWidgets/Theme.swift')
    for (const hex of ['1b3466', 'c9a04e', 'f3ead6', '163a7c', 'f1d391']) expect(theme).toContain(`Color(hex: 0x${hex})`)
  })

  it('the debug build’s widget adder (for the emulator tests) is never in the release build', () => {
    expect(read('web/android/app/src/main/AndroidManifest.xml')).not.toContain('PinWidgetTestActivity')
    expect(fs.existsSync(path.join(WEB, 'android/app/src/debug/java/com/alkhammashtalal/imuslim/PinWidgetTestActivity.java'))).toBe(true)
    expect(fs.existsSync(path.join(WEB, 'android/app/src/main/java/com/alkhammashtalal/imuslim/PinWidgetTestActivity.java'))).toBe(false)
  })
})

describe('5. the recitation on the lock screen', () => {
  it('a media playback service in the foreground with its session; its permission; androidx.media', () => {
    const manifest = read('web/android/app/src/main/AndroidManifest.xml')
    expect(manifest).toMatch(/<service\s+android:name="\.media\.RecitationService"\s+android:exported="false"\s+android:foregroundServiceType="mediaPlayback" \/>/)
    expect(manifest).toContain('<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />')
    expect(read('web/android/app/build.gradle')).toContain('implementation "androidx.media:media:$androidxMediaVersion"')
    const svc = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/media/RecitationService.java')
    expect(svc).toContain('ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK')
    expect(svc).toContain('PlaybackStateCompat.ACTION_SKIP_TO_NEXT')
    expect(svc).toContain('public void onTaskRemoved(Intent rootIntent) {')
  })

  it('the names are the iPhone’s; «التالي» is the next ayah; the session ends only after the player stays idle', async () => {
    vi.resetModules()
    const updates: { state: string; title?: string; artist?: string }[] = []
    let listener: ((e: { action: string }) => void) | null = null
    const subs = new Set<() => void>()
    let state: Record<string, unknown> = { status: 'idle' }
    const calls: string[] = []
    vi.doMock('../../web/src/native/platform', () => ({ isAndroid: () => true, isNative: () => true, platform: () => 'android' }))
    const plugin = { update: async (o: (typeof updates)[0]) => void updates.push(o), addListener: async (_e: 'action', f: (e: { action: 'play' | 'pause' | 'next' | 'stop' }) => void) => ((listener = f as typeof listener), { remove: async () => undefined }) }
    vi.stubGlobal('window', globalThis)
    vi.doMock('../../web/src/quran/api', () => ({ getSuras: async () => [{ n: 2, name: 'البقرة' }] }))
    vi.doMock('../../web/src/quran/recitation', () => ({
      getRecitation: () => state,
      getReciter: () => ({ read: 1, name: { ar: 'القارئ', en: 'Reciter' }, server: '', suras: [2] }),
      onRecitation: (f: () => void) => (subs.add(f), () => subs.delete(f)),
      pause: () => calls.push('pause'),
      resume: () => calls.push('resume'),
      stepAyah: (d: number) => calls.push(`step ${d}`),
      stop: () => calls.push('stop'),
      SHOW_RECITER_NAME: true,
      reciterLabel: (r: { name: { ar: string } }) => r.name.ar,
    }))
    vi.useFakeTimers()
    try {
      const { installAndroidMedia, IDLE_END_MS } = await import('../../web/src/native/android/media')
      installAndroidMedia(() => 'ar', plugin)
      const set = (s: Record<string, unknown>) => ((state = s), subs.forEach((f) => f()))
      set({ status: 'playing', sura: 2, from: 1, to: 286, aya: 255 })
      await vi.advanceTimersByTimeAsync(0)
      expect(updates.at(-1)).toMatchObject({ state: 'playing', title: 'سورة البقرة · ٢٥٥', artist: 'القارئ' })
      // Between two suras the player is idle a moment: the session stays.
      set({ status: 'idle' })
      await vi.advanceTimersByTimeAsync(IDLE_END_MS - 1000)
      set({ status: 'playing', sura: 3, from: 1, to: 200, aya: 1 })
      await vi.advanceTimersByTimeAsync(IDLE_END_MS + 1000)
      expect(updates.map((u) => u.state)).not.toContain('none')
      set({ status: 'paused', sura: 3, from: 1, to: 200, aya: 1 })
      expect(updates.at(-1)?.state).toBe('paused')
      set({ status: 'idle' })
      await vi.advanceTimersByTimeAsync(IDLE_END_MS + 100)
      expect(updates.at(-1)).toEqual({ state: 'none' })
      for (const a of ['play', 'pause', 'next', 'stop']) listener!({ action: a })
      expect(calls).toEqual(['resume', 'pause', 'step 1', 'stop'])
    } finally {
      vi.useRealTimers()
      vi.unstubAllGlobals()
      for (const m of ['../../web/src/native/platform', '../../web/src/quran/api', '../../web/src/quran/recitation']) vi.doUnmock(m)
    }
  })
})

describe('Umm al-Qura dates in the Android app: CLDR’s names where Android’s web view writes Gregorian ones', () => {
  const LANGS9 = ['en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']
  const Node = Intl.DateTimeFormat
  /** Android's web view as seen on WebView 113 and 145: the calendar's numbers, the Gregorian month name and «BC». */
  const Broken = function (locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
    const f = new Node(locales, options)
    const ro = f.resolvedOptions()
    const lang = ro.locale.split('-')[0]
    if (ro.calendar !== 'islamic-umalqura' || lang === 'ar') return f
    const parts = (at?: Date | number) => {
      const m = Number(new Node('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric', timeZone: ro.timeZone }).formatToParts(at).find((p) => p.type === 'month')!.value)
      const greg = new Node(`${lang}-u-ca-gregory`, { month: ro.month as 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, m - 1, 15)))
      return f.formatToParts(at).map((p) => (p.type === 'month' && ro.month === 'long' ? { ...p, value: greg } : p.type === 'era' ? { ...p, value: 'BC' } : p))
    }
    // As an engine's own: the real prototype, whose format is a getter.
    return Object.create(Node.prototype, {
      format: { value: (at?: Date | number) => parts(at).map((p) => p.value).join('') },
      formatToParts: { value: parts },
      resolvedOptions: { value: () => ro },
    })
  } as unknown as typeof Intl.DateTimeFormat
  Object.defineProperty(Broken, 'prototype', { value: Node.prototype })
  afterEach(() => {
    Intl.DateTimeFormat = Node
    vi.doUnmock('../../web/src/native/platform')
  })

  it('finds the nine languages the web view gets wrong, and writes each date as CLDR does, in every month', async () => {
    vi.resetModules()
    vi.doMock('../../web/src/native/platform', () => ({ isAndroid: () => true, isNative: () => true, platform: () => 'android' }))
    const { installAndroidHijri, wrongLanguages } = await import('../../web/src/native/android/hijri')
    expect(wrongLanguages(Node)).toEqual([])
    expect(wrongLanguages(Broken)).toEqual(LANGS9)
    const want = new Map<string, string>()
    const OPTS: Intl.DateTimeFormatOptions[] = [
      { day: 'numeric', month: 'long', year: 'numeric' },
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
      { month: 'long', year: 'numeric' },
      { day: 'numeric', month: 'long' },
    ]
    const dates = Array.from({ length: 13 }, (_, i) => new Date(Date.UTC(2026, 0, 10 + i * 29, 12)))
    for (const l of [...LANGS9, 'ar'])
      for (const o of OPTS) for (const d of dates) want.set(`${l}|${JSON.stringify(o)}|${d.toISOString()}`, new Node(`${l}-u-ca-islamic-umalqura`, { ...o, timeZone: 'Asia/Riyadh' }).format(d))
    Intl.DateTimeFormat = Broken
    expect(new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 9, 15, 12)))).toBe('May 4, 1448 BC')
    installAndroidHijri()
    for (const [k, v] of want) {
      const [l, o, d] = k.split('|')
      expect(new Intl.DateTimeFormat(`${l}-u-ca-islamic-umalqura`, { ...JSON.parse(o), timeZone: 'Asia/Riyadh' }).format(new Date(d)), k).toBe(v)
    }
    // The app's own writers, as the widgets and the screens call them.
    const { hijriDisc } = await import('../../web/src/v2/home/hijri-disc')
    expect(hijriDisc('en', new Date(Date.UTC(2026, 9, 15, 12)), 'Asia/Riyadh')).toEqual({ day: '4', month: 'Jumada I', year: '1448', full: 'Jumada I 4, 1448 AH' })
    // Not the Umm al-Qura calendar, or Arabic: the engine's own.
    expect(new Intl.DateTimeFormat('en-u-ca-gregory', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 4, 2)))).toBe('May')
  })

  it('the table is CLDR’s (made by web/scripts/android-hijri-names.mjs) and the patch is installed first, in the Android app only', async () => {
    const { HIJRI_NAMES } = await import('../../web/src/native/android/hijri-names')
    expect(Object.keys(HIJRI_NAMES)).toEqual(LANGS9)
    expect(HIJRI_NAMES.en.long[4]).toBe('Jumada I')
    expect(HIJRI_NAMES.en.era).toBe('AH')
    for (const l of LANGS9) expect(HIJRI_NAMES[l].long).toHaveLength(12)
    expect(read('web/src/native/boot.ts')).toMatch(/import \{ installAndroidHijri \} from '\.\/android\/hijri'\n\n[^\n]*\n[^\n]*\nif \(isAndroid\(\)\) installAndroidHijri\(\)/)
  })
})
