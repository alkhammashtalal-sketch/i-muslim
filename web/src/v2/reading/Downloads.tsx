import { useState } from 'react'
import { useI18n } from '../../i18n'
import { fmt, numFmt } from '../../quran/format'
import {
  cancelAll,
  connection,
  deleteReciter,
  deleteSura,
  downloadAll,
  downloadedBytes,
  downloadedReciters,
  downloadedSuras,
  downloadSura,
  formatBytes,
  isDownloaded,
  pauseAll,
  reciterBytes,
  resumeAll,
  suraBytes,
  useDownloads,
} from '../../quran/downloads'
import { DOWNLOADS } from '../../quran/download-strings'
import { RECITERS, reciterLabel, useOnline, useReciter } from '../../quran/recitation'
import { navigate } from '../../quran/route'
import { ReciterAvatar } from './ReciterAvatar'
import { PageHead } from './ui'
import { isolate, useSuras } from './useSuraNames'
import './downloads.css'

const pct = (bytes: number, total: number, lang: string) =>
  new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 0 }).format(total ? Math.min(1, bytes / total) : 0)

/** «تنزيل» under «استمع» on a sura page (reply 0056 أ): the size, then the progress, then «منزّلة ✓». */
export function SuraDownload({ sura }: { sura: number }) {
  const { lang } = useI18n()
  const t = DOWNLOADS[lang]
  const reciter = useReciter()
  const d = useDownloads()
  const online = useOnline()
  const here = isDownloaded(reciter.read, sura)
  const mine = d.job && d.job.read === reciter.read && d.job.sura === sura ? d.job : null
  const failed = d.failed?.read === reciter.read && d.failed.sura === sura
  if (here)
    return (
      <p className="dl-done small" data-testid="sura-downloaded">
        {t.downloaded}
      </p>
    )
  if (mine)
    return (
      <div className="dl-progress" role="status" data-testid="sura-downloading">
        <span>{fmt(t.downloading, { pct: pct(mine.bytes, mine.total, lang) })}</span>
        <span className="dl-bar" aria-hidden="true">
          <span style={{ inlineSize: `${mine.total ? Math.min(100, (100 * mine.bytes) / mine.total) : 0}%` }} />
        </span>
      </div>
    )
  const size = suraBytes(reciter.read, sura)
  return (
    <>
      <button
        type="button"
        className="text-link dl-button"
        disabled={!online || !!d.job}
        onClick={() => downloadSura(reciter.read, sura).catch(() => undefined)}
        data-testid="sura-download"
      >
        {size ? fmt(t.downloadSize, { size: formatBytes(size, lang) }) : t.download}
      </button>
      {failed && (
        <p className="small listen-note" role="status">
          {t.failed}
        </p>
      )}
    </>
  )
}

/** «تنزيل المصحف كاملًا بصوته» on the reciters page, for the chosen reciter: the whole size, a confirmation (with a
 *  warning on mobile data) before it starts, then sura after sura with pause and resume. */
export function MushafDownload() {
  const { lang } = useI18n()
  const t = DOWNLOADS[lang]
  const num = numFmt(lang)
  const reciter = useReciter()
  const d = useDownloads()
  const online = useOnline()
  const [confirm, setConfirm] = useState<null | { cellular: boolean }>(null)
  const name = reciterLabel(reciter, lang)
  const have = downloadedSuras(reciter.read).length
  const total = reciterBytes(reciter.read)
  const left = Math.max(0, total - downloadedBytes(reciter.read))
  const q = d.queue?.read === reciter.read ? d.queue : null
  if (have === 114)
    return (
      <section className="rd-card dl-card" data-testid="mushaf-download">
        <p className="dl-done">{t.mushafDone}</p>
      </section>
    )
  return (
    <section className="rd-card dl-card" aria-labelledby="dl-mushaf-h" data-testid="mushaf-download">
      <h2 className="rd-group-title" id="dl-mushaf-h">
        {t.mushafTitle}
      </h2>
      <p className="rd-row-sub">{fmt(t.mushafSize, { size: formatBytes(total, lang) })}</p>
      {q || (d.job && d.job.read === reciter.read && d.queue) ? (
        <>
          <div className="dl-progress" role="status">
            <span>{fmt(t.progress, { n: num(have), m: num(114) })}</span>
            <span className="dl-bar" aria-hidden="true">
              <span style={{ inlineSize: `${(100 * have) / 114}%` }} />
            </span>
            {q?.paused && <span className="small">{t.paused}</span>}
          </div>
          <div className="dl-actions">
            {q?.paused ? (
              <button type="button" className="rd-primary" onClick={resumeAll} disabled={!online} data-testid="mushaf-resume">
                {t.resume}
              </button>
            ) : (
              <button type="button" className="rd-secondary" onClick={pauseAll} data-testid="mushaf-pause">
                {t.pause}
              </button>
            )}
            {q?.paused && (
              <button type="button" className="rd-secondary" onClick={cancelAll}>
                {t.cancel}
              </button>
            )}
          </div>
        </>
      ) : confirm ? (
        <div className="dl-confirm" role="group" aria-labelledby="dl-mushaf-h">
          <p>{fmt(t.mushafConfirm, { name, size: formatBytes(left, lang) })}</p>
          {confirm.cellular && (
            <p className="dl-warn" role="alert">
              {fmt(t.cellular, { size: formatBytes(left, lang) })}
            </p>
          )}
          <div className="dl-actions">
            <button
              type="button"
              className="rd-primary"
              onClick={() => {
                setConfirm(null)
                downloadAll(reciter.read)
              }}
              data-testid="mushaf-start"
            >
              {t.start}
            </button>
            <button type="button" className="rd-secondary" onClick={() => setConfirm(null)}>
              {t.cancel}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="rd-secondary"
          disabled={!online || !!d.job}
          onClick={async () => setConfirm({ cellular: (await connection()) === 'cellular' })}
          data-testid="mushaf-ask"
        >
          {t.mushafTitle}
        </button>
      )}
    </section>
  )
}

/** «التنزيلات» (from the settings): the reciters downloaded, each one's size, the total, and deleting a sura or a
 *  reciter. */
export function DownloadsPage() {
  const { lang } = useI18n()
  const t = DOWNLOADS[lang]
  const num = numFmt(lang)
  useDownloads()
  const suras = useSuras()
  const [ask, setAsk] = useState<number | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const reads = downloadedReciters()
  const suraName = (n: number) => suras?.find((s) => s.n === n)?.name ?? num(n)
  return (
    <div className="rd-page">
      <PageHead title={t.title} onBack={() => (history.state?.muslimToday ? history.back() : navigate('/quran'))} />
      {reads.length === 0 ? (
        <p className="rd-empty">{t.empty}</p>
      ) : (
        <>
          <p className="rd-note" data-testid="downloads-total">
            {fmt(t.total, { size: formatBytes(downloadedBytes(), lang) })}
          </p>
          {reads.map((read) => {
            const r = RECITERS.find((x) => x.read === read)
            if (!r) return null
            const name = reciterLabel(r, lang)
            const list = downloadedSuras(read)
            return (
              <section key={read} className="rd-card dl-card" aria-labelledby={`dl-r-${read}`} data-testid={`downloads-${read}`}>
                <button type="button" className="rd-row" aria-expanded={open === read} onClick={() => setOpen(open === read ? null : read)}>
                  <ReciterAvatar reciter={r} />
                  <span className="rd-row-main">
                    <span className="rd-row-title" id={`dl-r-${read}`}>
                      {name}
                    </span>
                    <span className="rd-row-sub">{fmt(t.suras, { n: num(list.length), size: formatBytes(downloadedBytes(read), lang) })}</span>
                  </span>
                </button>
                {open === read && (
                  <ul className="dl-suras">
                    {list.map((s) => (
                      <li key={s}>
                        <span>{isolate(suraName(s))}</span>
                        <span className="rd-row-sub">{formatBytes(suraBytes(read, s), lang)}</span>
                        <button type="button" className="text-link dl-remove" onClick={() => void deleteSura(read, s)} aria-label={fmt(t.removeSura, { name: suraName(s) })}>
                          {t.remove}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {ask === read ? (
                  <div className="dl-confirm">
                    <p>{fmt(t.removeReciterConfirm, { n: num(list.length), name, size: formatBytes(downloadedBytes(read), lang) })}</p>
                    <div className="dl-actions">
                      <button
                        type="button"
                        className="rd-secondary dl-danger-btn"
                        onClick={() => {
                          setAsk(null)
                          void deleteReciter(read)
                        }}
                        data-testid={`downloads-delete-${read}`}
                      >
                        {t.remove}
                      </button>
                      <button type="button" className="rd-secondary" onClick={() => setAsk(null)}>
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="rd-danger" onClick={() => setAsk(read)}>
                    {t.removeReciter}
                  </button>
                )}
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}
