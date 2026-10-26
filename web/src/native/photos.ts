// «اصنع كروت» (add-on 0072-add30 §1): several images at once.
//   - saveImages: in the iOS app, straight to Photos, add-only (PhotoSavePlugin.swift); in the Android app the system
//     share sheet with all of them (no Photos plugin on Android: its sheet offers the gallery and the apps); in a
//     browser one download per image.
//   - shareImages: the system share sheet with all of them (@capacitor/share `files`), or the Web Share API with files.
// Instagram's share extension takes one photo from another app's share sheet, and asks for several to be chosen inside
// Instagram (relay/w1/0072-cards/README.md): so «احفظ الكل», then one post from Photos, is the way to post them together.
import { registerPlugin } from '@capacitor/core'
import { isNative, platform } from './platform'

type PhotoSave = { save: (o: { paths: string[] }) => Promise<{ saved: number }> }
const PhotoSave = registerPlugin<PhotoSave>('PhotoSave')

export type Named = { blob: Blob; name: string }
export type Saved = 'saved' | 'shared' | 'downloaded' | 'denied' | 'none'

const base64Of = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })

/** The images in the app's cache folder, in order: their file URIs. */
async function cacheFiles(files: Named[]): Promise<string[]> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const out: string[] = []
  for (const f of files) {
    const { uri } = await Filesystem.writeFile({ path: `cards/${f.name}`, data: await base64Of(f.blob), directory: Directory.Cache, recursive: true })
    out.push(uri)
  }
  return out
}

export async function shareImages(files: Named[], title: string): Promise<Saved> {
  if (isNative()) {
    const [{ Share }, uris] = await Promise.all([import('@capacitor/share'), cacheFiles(files)])
    try {
      await Share.share({ title, files: uris, dialogTitle: title })
    } catch {
      // closed by the person
    }
    return 'shared'
  }
  const list = files.map((f) => new File([f.blob], f.name, { type: 'image/png' }))
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  if (!nav.share || !nav.canShare?.({ files: list })) return 'none'
  try {
    await nav.share({ files: list, title })
  } catch {
    // dismissed
  }
  return 'shared'
}

export async function saveImages(files: Named[], title: string): Promise<Saved> {
  if (isNative() && platform() === 'ios') {
    try {
      await PhotoSave.save({ paths: await cacheFiles(files) })
      return 'saved'
    } catch (e) {
      return String((e as Error)?.message ?? e).includes('denied') ? 'denied' : 'none'
    }
  }
  if (isNative()) return shareImages(files, title)
  for (const f of files) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(f.blob)
    a.download = f.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    // A short pause between downloads: browsers drop a burst of them.
    await new Promise((r) => setTimeout(r, 180))
  }
  return 'downloaded'
}
