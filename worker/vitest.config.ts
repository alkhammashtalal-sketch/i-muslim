import { defineConfig } from 'vitest/config'

// The tests on the full data read data/processed/hadith.jsonl, 272 MB since the 21 languages of reply 0033-add2 §2
// (119 MB before): each such test takes about 2 s alone, and several at once in parallel files pass vitest's default
// 5 s. Nothing else differs from the defaults.
export default defineConfig({ test: { testTimeout: 30_000 } })
