import type { Lang } from '../../../shared/api'

// Strings of the sources bar on the answer card (command 20). Kept apart from i18n/*.ts (another window's files).
// Arabic and English are reviewed; the eight others are machine-translated like the rest of the interface.
type S = { bar: string; of: string }

export const WITNESS: Record<Lang, S> = {
  ar: { bar: 'الشواهد', of: 'الشاهد {i} من {n}' },
  en: { bar: 'Sources', of: 'Source {i} of {n}' },
  ur: { bar: 'شواہد', of: 'شاہد {i} از {n}' },
  id: { bar: 'Dalil', of: 'Dalil {i} dari {n}' },
  ms: { bar: 'Dalil', of: 'Dalil {i} daripada {n}' },
  tr: { bar: 'Deliller', of: 'Delil {i} / {n}' },
  fr: { bar: 'Sources', of: 'Source {i} sur {n}' },
  es: { bar: 'Fuentes', of: 'Fuente {i} de {n}' },
  bn: { bar: 'প্রমাণ', of: 'প্রমাণ {i} / {n}' },
  hi: { bar: 'प्रमाण', of: 'प्रमाण {i} / {n}' },
}
