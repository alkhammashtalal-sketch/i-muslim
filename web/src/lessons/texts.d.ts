// Types for texts.js (the lessons' texts from our server by id).
type Node = { start: number; end: number; field: string; idx?: number; sha: string }
type Got = { s: 'ok'; text: string } | { s: 'wait' } | { s: 'none' }
export declare const cut: (s: string, a: number, b: number) => string
export declare function sha16(text: string): Promise<string | null>
export declare function fieldText(fields: Record<string, unknown> | null, field: string, idx?: number | null): string | null
export declare const hadithFields: (row: unknown) => Record<string, unknown> | null
export declare const ayahFields: (p: unknown) => Record<string, unknown> | null
export declare function createTexts(o: {
  data: unknown
  lang: 'ar' | 'en'
  fetchHadith: (id: string, lang: string) => Promise<unknown>
  fetchAyah: (id: string) => Promise<unknown>
}): { need(o: unknown): Promise<unknown> | null; slice(node: Node): Got; hadith(id: string, lang: string, field: string): Got; ayah(id: string, field: string): Got }
