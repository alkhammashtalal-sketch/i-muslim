// /today/reminder/friday|fastBid|fastMonThu|nameDay: the page an optional reminder opens (add-on 0072-add30 §5,
// web/src/native/reminders.ts). The reminder's own line (our words), then its hadith whole from D1 by its id, in its
// gold frame, with HadeethEnc's translation in the reader's language when it has one, the grade and the takhrij as the
// source writes them, and the source line whose sheet holds the link to HadeethEnc (ToolParts HadithBlock); then the
// way on: Surat al-Kahf, the name's page, the calendar. The hadith shows only while REMINDER_VIRTUE is on (reminders.ts). No reminder kind in the address: the home's link instead.
import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../../../i18n'
import { quranPath } from '../../../quran/route'
import { REMINDER_TEXT } from '../../../native/reminder-strings'
import { isReminderKind, nameOfRiyadhDay, REMINDER_HADITHS, REMINDER_VIRTUE, riyadhDay, type ReminderKind } from '../../../native/reminders'
import { getToolHadith, type ToolHadith } from '../api'
import { namePath } from '../names/name-day-api'
import { openToday, Screen } from '../Screen'
import { Failed, HadithBlock, HadithTitle, Loading } from '../ToolParts'
import '../tools.css'
import './reminders.css'

export const reminderOfPath = (path: string): ReminderKind | null => {
  const k = path.match(/^\/today\/reminder\/([a-zA-Z]{3,12})\/?$/)?.[1]
  return isReminderKind(k) ? k : null
}

export function ReminderPage() {
  const { lang, content } = useI18n()
  const [kind] = useState(() => reminderOfPath(location.pathname))
  const rt = REMINDER_TEXT[lang] ?? REMINDER_TEXT.ar
  // The hadith only once approved (REMINDER_VIRTUE); before, the page is the reminder's line and the way on.
  const id = kind && REMINDER_VIRTUE ? REMINDER_HADITHS[kind]?.id : undefined
  const [h, setH] = useState<ToolHadith | 'loading' | 'error'>('loading')
  const load = useCallback(() => {
    if (!id) return
    setH('loading')
    getToolHadith(id, content).then(setH, () => setH('error'))
  }, [id, content])
  useEffect(load, [load])

  if (!kind) {
    return (
      <Screen title={rt.nameTitle}>
        <p className="tool-note">
          <a className="text-link" href="/">
            {rt.nameTitle}
          </a>
        </p>
      </Screen>
    )
  }
  const title = kind === 'friday' ? rt.fridayTitle : kind === 'fastBid' ? rt.bidTitle : kind === 'fastMonThu' ? rt.monThuTitle : rt.nameTitle
  const line = kind === 'friday' ? rt.fridayLine : kind === 'fastBid' ? rt.bidDays : kind === 'fastMonThu' ? rt.monThuDays : null
  const note = kind === 'fastBid' || kind === 'fastMonThu' ? rt.fastNote : null
  const name = kind === 'nameDay' ? nameOfRiyadhDay(riyadhDay(Date.now())) : null
  return (
    <Screen title={title}>
      <section className="tool-card pad" data-testid="reminder-page" aria-label={title}>
        {line && <p className="tool-note reminder-line">{line}</p>}
        {note && <p className="tool-note">{note}</p>}
        {name && (
          <p className="reminder-name" lang="ar" dir="rtl" data-testid="reminder-name">
            {name}
          </p>
        )}
        {id &&
          (h === 'loading' ? (
            <Loading />
          ) : h === 'error' ? (
            <Failed onRetry={load} />
          ) : (
            <div data-testid="reminder-hadith">
              <HadithTitle h={h} />
              <HadithBlock h={h} />
            </div>
          ))}
        <p className="reminder-go">
          {kind === 'friday' && (
            <button type="button" className="tool-btn" onClick={() => openToday(quranPath(18))}>
              {rt.openKahf}
            </button>
          )}
          {kind === 'nameDay' && (
            <button type="button" className="tool-btn" onClick={() => openToday(namePath())}>
              {rt.openName}
            </button>
          )}
          {(kind === 'fastBid' || kind === 'fastMonThu') && (
            <button type="button" className="tool-btn" onClick={() => openToday('/today/calendar')}>
              {rt.openCalendar}
            </button>
          )}
        </p>
      </section>
    </Screen>
  )
}
