import { useCallback, useEffect, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { useI18n } from '../../i18n'
import { arabicDigits, fmt } from '../../quran/format'
import { IcDownload, IcShare } from './icons'
import { drawAyahImage, toBlob, type Look, type Shape } from './share-image'
import { Tabs, useReadingStrings } from './ui'
import { isNative } from '../../native/platform'
import { shareImage } from '../../native/share'

type Props = { open: boolean; onClose: () => void; sura: number; aya: number; suraName: string; text: string }

/** Share an ayah as an image (reply 0032 C-7, board ShareAfter): story or square, day or night; Web Share with the
 *  file where the phone offers it, else a download. The source line is printed on every image. */
export function ShareSheet({ open, onClose, sura, aya, suraName, text }: Props) {
  const r = useReadingStrings()
  const ref = `${suraName} · ${arabicDigits(aya)}`
  // The image keeps the Mushaf's language: the sura's name, the reference and the source line in Arabic, with the
  // app's name «مسلم» (identity, CLAUDE.md §8), whatever the interface language.
  const draw = useCallback(
    (shape: Shape, look: Look) => drawAyahImage({ text, suraName: `سورة ${suraName}`, ayaLabel: arabicDigits(aya), refLine: ref, sourceLine: 'نص المصحف · المصحف الإلكتروني', appName: '«مسلم»', shape, look }),
    [text, suraName, aya, ref],
  )
  return <ImageShareSheet open={open} onClose={onClose} title={r.shareTitle} alt={fmt(r.imageAlt, { ref })} label={ref} fileBase={`muslim-${sura}-${aya}`} draw={draw} />
}

type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  /** The preview's text for screen readers. */
  alt: string
  /** The text handed with the image to the system's sheet. */
  label: string
  fileBase: string
  draw: (shape: Shape, look: Look) => Promise<HTMLCanvasElement>
  testId?: string
}

/** The share sheet of every image (the ayah's, and add-on 0072-add10 §3: the name of the day's and the salaf saying's):
 *  story or square, day or night, the system's sheet in the app (Snapchat, Instagram, «Save Image»), Web Share or a
 *  download on the web. */
export function ImageShareSheet({ open, onClose, title, alt, label, fileBase, draw, testId }: SheetProps) {
  const { t } = useI18n()
  const r = useReadingStrings()
  const [shape, setShape] = useState<Shape>('story')
  const [look, setLook] = useState<Look>('day')
  const [img, setImg] = useState<{ url: string; canvas: HTMLCanvasElement; key: string } | null>(null)
  const key = `${shape}|${look}`
  useEffect(() => {
    if (!open) return
    let alive = true
    draw(shape, look).then((canvas) => {
      if (alive) setImg({ url: canvas.toDataURL('image/png'), canvas, key })
    })
    return () => {
      alive = false
    }
  }, [open, draw, shape, look, key])

  const fileName = `${fileBase}-${shape}-${look}.png`
  const ref = label
  const save = async () => {
    if (!img) return
    const blob = await toBlob(img.canvas)
    // A web view cannot download: in the app «Save» opens the system sheet, whose «Save Image» keeps it in Photos.
    if (isNative()) return void (await shareImage(blob, fileName, ref).catch(() => 'none'))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }
  // In the iOS/Android app the system share sheet carries the image (and «Save Image»): @capacitor/share (reply 0033 §ب3).
  const share = async () => {
    if (!img) return
    try {
      if ((await shareImage(await toBlob(img.canvas), fileName, ref)) === 'shared') return
    } catch {
      // the image could not be handed over: download it instead
    }
    await save()
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {img ? (
        <img className="rd-share-preview" src={img.url} alt={alt} data-testid={testId} data-shape={img.key.split('|')[0]} data-look={img.key.split('|')[1]} style={{ aspectRatio: shape === 'story' ? '9 / 16' : '1 / 1' }} />
      ) : (
        <p className="small" role="status">
          {t.readerLoading}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        <Tabs
          value={shape}
          onChange={setShape}
          options={[
            { value: 'story', label: r.shapeStory },
            { value: 'square', label: r.shapeSquare },
          ]}
        />
        <Tabs
          value={look}
          onChange={setLook}
          options={[
            { value: 'day', label: r.themeDay },
            { value: 'night', label: r.themeNight },
          ]}
        />
      </div>
      <div className="rd-share-buttons">
        <button type="button" className="rd-primary" onClick={share} disabled={!img}>
          <IcShare />
          {r.shareImage}
        </button>
        <button type="button" className="rd-secondary" onClick={save} disabled={!img}>
          <IcDownload />
          {r.saveImage}
        </button>
      </div>
      <p className="rd-status">{r.shareNote}</p>
    </Sheet>
  )
}
