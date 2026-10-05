import { useEffect, useRef, useState } from 'react'
import { bookPath, isCurrentPath, navigate } from '../quran/route'
import '../quran/quran.css'
import { BooksIndex } from './BooksIndex'
import { BookView } from './BookView'
import './library.css'
import { SegmentSheet } from './SegmentSheet'

type Props = { book?: string; seg?: string; onAsk: (draft: string) => void }

/** The "Aqeedah books" tab: the three books, one book, and a segment sheet. Mirrors the Quran reader. */
export function Books({ book, seg, onAsk }: Props) {
  const [name, setName] = useState<{ key: string; name: string } | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [scrollTo, setScrollTo] = useState<string | undefined>(seg)
  const internal = useRef(false)

  // A route change we did not cause (deep link, back/forward) scrolls to and opens the segment.
  useEffect(() => {
    if (internal.current) {
      internal.current = false
      return
    }
    setScrollTo(seg)
    setOpen(seg ?? null)
  }, [book, seg])

  if (!book) return <BooksIndex />

  const select = (id: string | null) => {
    setOpen(id)
    const path = bookPath(book, id ?? undefined)
    if (isCurrentPath(path)) return
    internal.current = true
    navigate(path, { replace: true })
  }

  return (
    <>
      <BookView key={book} book={book} selected={open ?? undefined} scrollTo={scrollTo} onOpen={(s) => select(s.id)} onLoaded={(b) => setName({ key: b.key, name: b.name })} />
      {open && <SegmentSheet open id={open} bookName={name?.key === book ? name.name : ''} onClose={() => select(null)} onAsk={onAsk} />}
    </>
  )
}
