// Sharing (reply 0033 §ب3): the system share sheet through @capacitor/share inside the iOS/Android app, the Web Share
// API in a browser. The callers keep their own fallback (copy to the clipboard, or download the image) for 'none'.
// What is shared is what the web app shares: the text as written by the caller and the link to the web page.
import { isNative } from './platform'

export type ShareData = { title?: string; text?: string; url?: string }
/** 'shared' (also when the person closed the sheet), or 'none' when this device has no share sheet. */
export type Shared = 'shared' | 'none'

export async function shareLink(d: ShareData): Promise<Shared> {
  if (isNative()) {
    const { Share } = await import('@capacitor/share')
    try {
      await Share.share({ ...d, dialogTitle: d.title })
    } catch {
      // «Share canceled»: closed by the person
    }
    return 'shared'
  }
  if (typeof navigator === 'undefined' || !navigator.share) return 'none'
  try {
    await navigator.share(d)
  } catch {
    // dismissed
  }
  return 'shared'
}

/** Base64 of a blob without the data: prefix (the Filesystem plugin's format for binary files). */
const base64Of = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })

/** An image (the ayah's card): in the app it is written to the app's cache folder and handed to the share sheet, which
 *  offers «Save Image» too; in a browser the Web Share API with files, where it can share files. */
export async function shareImage(blob: Blob, fileName: string, title: string): Promise<Shared> {
  if (isNative()) {
    const [{ Share }, { Filesystem, Directory }] = await Promise.all([import('@capacitor/share'), import('@capacitor/filesystem')])
    const { uri } = await Filesystem.writeFile({ path: `share/${fileName}`, data: await base64Of(blob), directory: Directory.Cache, recursive: true })
    try {
      await Share.share({ title, files: [uri], dialogTitle: title })
    } catch {
      // closed by the person
    }
    return 'shared'
  }
  const file = new File([blob], fileName, { type: blob.type || 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  if (!nav.share || !nav.canShare?.({ files: [file] })) return 'none'
  try {
    await nav.share({ files: [file], title })
  } catch {
    // dismissed
  }
  return 'shared'
}
