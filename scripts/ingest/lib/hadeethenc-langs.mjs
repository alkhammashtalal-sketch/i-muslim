// The languages fetched from HadeethEnc (source ب), read by hadeethenc-fetch.mjs and hadeethenc-build.mjs.
// TEN: the app's ten interface languages (reply 0031-add4). MORE: the 21 content languages that had no hadith rows on
// next until reply 0033-add2 §2; every one is in https://hadeethenc.com/api/v1/languages (checked 13 October 2026).
export const TEN = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']
export const MORE = ['fa', 'ps', 'ug', 'ku', 'zh', 'ta', 'ml', 'ff', 'ja', 'vi', 'th', 'km', 'tl', 'bs', 'sr', 'az', 'uz', 'ky', 'si', 'te', 'as']
export const HADEETHENC_LANGS = [...TEN, ...MORE]
