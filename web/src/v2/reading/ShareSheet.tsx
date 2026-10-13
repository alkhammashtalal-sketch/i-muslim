import { useEffect, useState } from 'react'
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
  const { t } = useI18n()
  const r = useReadingStrings()
  const [shape, setShape] = useState<Shape>('story')
  const [look, setLook] = useState<Look>('day')
  const [img, setImg] = useState<{ url: string; canvas: HTMLCanvasElement } | null>(null)
  const ref = `${suraName} · ${arabicDigits(aya)}`
  useEffect(() => {
    if (!open) return
    let alive = true
    // The image keeps the Mushaf's language: the sura's name, the reference and the source line in Arabic, with the
    // app's name «مسلم» (identity, CLAUDE.md §8), whatever the interface language.
    drawAyahImage({ text, suraName: `سورة ${suraName}`, ayaLabel: arabicDigits(aya), refLine: ref, sourceLine: 'نص المصحف · المصحف الإلكتروني', appName: '«مسلم»', shape, look }).then(
      (canvas) => {
        if (alive) setImg({ url: canvas.toDataURL('image/png'), canvas })
      },
    )
    return () => {
      alive = false
    }
  }, [open, text, suraName, aya, shape, look, ref])

  const fileName = `muslim-${sura}-${aya}-${shape}-${look}.png`
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
    <Sheet open={open} onClose={onClose} title={r.shareTitle}>
      {img ? (
        <img className="rd-share-preview" src={img.url} alt={fmt(r.imageAlt, { ref })} style={{ aspectRatio: shape === 'story' ? '9 / 16' : '1 / 1' }} />
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
