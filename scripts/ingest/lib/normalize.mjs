// Single source of truth lives in the Worker so queries and indexed text normalize identically.
// Node ≥ 22.18 / 24 runs the .ts file directly (type stripping).
export { normalizeArabic, stripTags } from '../../../worker/src/lib/normalize.ts';
