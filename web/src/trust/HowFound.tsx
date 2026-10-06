import { useEffect, useState } from 'react'
import type { AnswerResponse, Cite } from '../../../shared/api'
import { Sheet } from '../components/Sheet'
import { levelLabel, useI18n } from '../i18n'
import { getSegment as getPassageById } from '../library/api'
import { displayRef, fmt, numFmt } from '../quran/format'
import { getReviewed } from '../quran/reviewed'
import { REVIEWED } from './reviewed-strings'
import './trust.css'

/** Small link under an answer card that opens HowFoundSheet. */
export function HowFoundButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button type="button" className="text-link how-found-link" onClick={onClick} aria-haspopup="dialog">
      {t.howFoundLink}
    </button>
  )
}

type Item = { id: Cite; ref?: string; url?: string; used: boolean }

/**
 * «كيف وُجدت هذه الإجابة؟»: the passages retrieval sent to the model (`considered`, normally 5) with their
 * references and which ones the answer used; that the texts are shown verbatim; that the explanation is
 * generated from these passages only; and the level. Refs of unused passages are read from /api/passage.
 */
export function HowFoundSheet({ open, onClose, res }: { open: boolean; onClose: () => void; res: AnswerResponse | null }) {
  const { t, lang } = useI18n()
  const num = numFmt(lang)
  const [refs, setRefs] = useState<Record<string, { ref: string; url: string }>>({})

  const used = new Set(res?.quotes.map((q) => q.id) ?? [])
  const ids: Cite[] = res ? (res.considered?.length ? res.considered : res.quotes.map((q) => q.id)) : []
  const known: Record<string, { ref: string; url: string }> = {}
  for (const q of res?.quotes ?? []) known[q.id] = { ref: q.ref, url: q.url }
  const items: Item[] = ids.map((id) => ({ id, ...(known[id] ?? refs[id] ?? {}), used: used.has(id) }))
  const missing = items.filter((i) => !i.ref).map((i) => i.id)
  const missingKey = missing.join('|')

  useEffect(() => {
    if (!open || !missingKey) return
    let alive = true
    for (const id of missingKey.split('|')) {
      getPassageById(id).then(
        (p) => alive && p && setRefs((r) => ({ ...r, [id]: { ref: p.ref, url: p.url } })),
        () => undefined,
      )
    }
    return () => {
      alive = false
    }
  }, [open, missingKey])

  const generated = !!res && ((res.direct?.text ?? '').trim().length > 0 || res.explanation.length > 0)

  // Outside Arabic: whether the card offers the reviewed translation of al-Muyassar for one of its ayat (command 21).
  // The same static files the card asked for, so nothing new is fetched.
  const ayat = lang === 'ar' ? '' : (res?.quotes.filter((q) => q.kind === 'ayah').map((q) => q.id).join('|') ?? '')
  const [reviewed, setReviewed] = useState<string | null>(null)
  useEffect(() => {
    if (!open || !ayat) return
    let alive = true
    Promise.all(ayat.split('|').map((id) => getReviewed(id, lang))).then((rs) => alive && setReviewed(rs.some(Boolean) ? `${lang}|${ayat}` : null))
    return () => {
      alive = false
    }
  }, [open, ayat, lang])

  return (
    <Sheet open={open} onClose={onClose} title={t.howFoundTitle}>
      {res && (
        <>
          <div className="section">
            <p className="section-label">{t.howFoundConsidered}</p>
            <ol className="how-found-list">
              {items.map((i) => (
                <li key={i.id} className={i.used ? 'is-used' : undefined}>
                  <span className="ref" lang="ar" dir="rtl">
                    {i.ref ? displayRef(i.ref, lang) : i.id}
                  </span>
                  <span className={`badge${i.used ? ' badge-verified' : ''}`}>{i.used ? `✓ ${t.howFoundUsed}` : t.howFoundUnused}</span>
                  {i.url && (
                    <a className="text-link" href={i.url} target="_blank" rel="noopener noreferrer">
                      {t.originalSource}
                    </a>
                  )}
                </li>
              ))}
            </ol>
            <p className="small">{fmt(t.howFoundCounts, { n: num(items.length), m: num(items.filter((i) => i.used).length) })}</p>
          </div>
          <ul className="how-found-facts">
            <li>{fmt(t.howFoundVerbatim, { badge: t.badgeVerified })}</li>
            {generated && <li>{t.howFoundGenerated}</li>}
            {ayat && reviewed === `${lang}|${ayat}` && <li>{REVIEWED[lang].howFound}</li>}
            {ayat && res.quotes.some((q) => q.meaning) && <li>{t.howFoundMeanings}</li>}
            <li>{fmt(t.howFoundLevel, { level: levelLabel(t, res.level) })}</li>
          </ul>
        </>
      )}
    </Sheet>
  )
}
