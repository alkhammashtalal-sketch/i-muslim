import { useEffect, useId, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { useI18n } from '../../i18n'
import { arabicDigits, fmt, numFmt } from '../../quran/format'
import { IcLock } from './icons'
import { firstWords } from './meta'
import { deleteNote, noteOf, saveNote } from './store'
import { useReadingStrings } from './ui'

/** A note on an ayah (reply 0032 C-3, board NoteAfter): kept on this device only. */
export function NoteSheet({ open, onClose, sura, aya, suraName, page, text }: { open: boolean; onClose: () => void; sura: number; aya: number; suraName: string; page?: number; text: string }) {
  const { lang } = useI18n()
  const r = useReadingStrings()
  const num = lang === 'ar' ? arabicDigits : numFmt(lang)
  const [value, setValue] = useState('')
  const id = useId()
  const existing = open ? noteOf(sura, aya) : undefined
  useEffect(() => {
    if (open) setValue(noteOf(sura, aya)?.text ?? '')
  }, [open, sura, aya])
  const w = firstWords(text, 6)
  return (
    <Sheet open={open} onClose={onClose} title={r.noteTitle}>
      <div className="rd-note-ayah">
        <div>
          {suraName} · {num(aya)}
          {page ? ` · ${fmt(r.page, { n: num(page) })}` : ''}
        </div>
        <div className="rd-first">
          <span lang="ar" dir="rtl">
            {w.cut}
            {w.more ? ' …' : ''}
          </span>
        </div>
      </div>
      <label htmlFor={id} className="sr-only">
        {r.noteLabel}
      </label>
      <textarea id={id} className="rd-textarea" value={value} onChange={(e) => setValue(e.target.value)} maxLength={2000} dir="auto" />
      <p className="rd-small-line">
        <IcLock />
        {r.notePrivacy}
      </p>
      <button
        type="button"
        className="rd-primary"
        disabled={!value.trim() && !existing}
        onClick={() => {
          saveNote(sura, aya, value, firstWords(text))
          onClose()
        }}
      >
        {r.noteSave}
      </button>
      {existing && (
        <button
          type="button"
          className="rd-danger"
          onClick={() => {
            deleteNote(sura, aya)
            onClose()
          }}
        >
          {r.noteDelete}
        </button>
      )}
    </Sheet>
  )
}
