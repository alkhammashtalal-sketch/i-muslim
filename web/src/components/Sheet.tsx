import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useI18n } from '../i18n'
import { IconClose } from './Icons'
import { Tashjir } from './Ornaments'

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode }

export function Sheet({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const { t } = useI18n()

  const openRef = useRef(open)

  useEffect(() => {
    openRef.current = open
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      // The sheet itself takes the focus, not its first button (0058 §2): WebKit draws a focus-visible ring around a
      // button focused on opening, even after a tap. The modal dialog keeps the focus inside it, and Tab reaches «×»,
      // whose ring then shows; a screen reader reads the sheet by its title.
      d.focus({ preventScroll: true })
    }
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      tabIndex={-1}
      aria-labelledby={titleId}
      onClose={(e) => {
        // only user-initiated closes (Esc) should report back; programmatic closes already updated state. A sheet opened
        // from inside this one closes alone (React passes a nested dialog's close event up the tree).
        if (e.target === ref.current && openRef.current) onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <>
          <Tashjir />
          <div className="sheet-head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}>
              <IconClose />
            </button>
          </div>
          <div className="sheet-body">{children}</div>
        </>
      )}
    </dialog>
  )
}
