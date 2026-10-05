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
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={() => {
        // only user-initiated closes (Esc) should report back; programmatic closes already updated state
        if (openRef.current) onClose()
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
