// «بياناتك» in the settings of the iOS/Android app (add-on 0072-add25 §5): «نسخة احتياطية من بياناتي» writes the data
// as a JSON file in the app's cache folder and hands it to the share sheet («Save to Files», AirDrop, …); «استعادة من
// نسخة» reads a file the person picks, checks it strictly (./backup.ts), asks once, writes it and opens the app again.
// Shown in the app only (SettingsSheet, behind isNative()). Nothing goes to a server.
import { useRef, useState } from 'react'
import type { Lang } from '../../../shared/api'
import { backupFileName, makeBackup, parseBackup, restoreBackup } from './backup'
import { BACKUP_TEXT } from './backup-strings'

export function BackupSettings({ lang }: { lang: Lang }) {
  const t = BACKUP_TEXT[lang] ?? BACKUP_TEXT.ar
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Record<string, string> | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setMsg(null)
    setBusy(true)
    try {
      const now = new Date()
      const [{ Share }, { Filesystem, Directory, Encoding }] = await Promise.all([import('@capacitor/share'), import('@capacitor/filesystem')])
      const { uri } = await Filesystem.writeFile({
        path: `share/${backupFileName(now)}`,
        data: JSON.stringify(makeBackup(undefined, now), null, 1),
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true,
      })
      try {
        await Share.share({ title: t.fileTitle, files: [uri], dialogTitle: t.fileTitle })
      } catch {
        // closed by the person
      }
    } catch {
      setMsg(t.failed)
    } finally {
      setBusy(false)
    }
  }

  const picked = async (f: File | undefined) => {
    setMsg(null)
    setPending(null)
    if (!f) return
    let text = ''
    try {
      text = f.size > 2 * 1024 * 1024 ? '' : await f.text()
    } catch {
      text = ''
    }
    const r = parseBackup(text)
    if (r.ok) setPending(r.data)
    else setMsg(t.badFile)
  }

  const restore = async () => {
    if (!pending) return
    setBusy(true)
    try {
      await restoreBackup(pending)
      location.reload()
    } catch {
      setMsg(t.failed)
      setBusy(false)
    }
  }

  return (
    <section className="v2-set-section" aria-labelledby="set-data" data-testid="backup-settings">
      <h3 id="set-data">{t.section}</h3>
      <p className="v2-set-hint">{t.hint}</p>
      <div className="v2-set-group">
        <button type="button" className="v2-set-row" disabled={busy} onClick={() => void save()} data-testid="backup-save">
          <span className="v2-set-label">{t.backup}</span>
        </button>
        <button type="button" className="v2-set-row" disabled={busy} onClick={() => input.current?.click()} data-testid="backup-restore">
          <span className="v2-set-label">{t.restore}</span>
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        data-testid="backup-file"
        onChange={(e) => {
          void picked(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {pending && (
        <div className="section" role="group" aria-labelledby="backup-confirm">
          <p className="small" id="backup-confirm">
            {t.confirm}
          </p>
          <div className="actions">
            <button type="button" className="btn" disabled={busy} onClick={() => void restore()} data-testid="backup-confirm">
              {t.confirmYes}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => setPending(null)}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}
      {msg && (
        <p className="v2-set-hint" role="status">
          {msg}
        </p>
      )}
    </section>
  )
}
