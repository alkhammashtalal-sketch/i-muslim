// Runs web/scripts/native-offline-gen.ts (the app's offline copy, reply 0033 §ب3) with Vite's module runner, which reads
// the Worker's TypeScript and JSON imports as the build does. Called by `npm run build:native` after vite build.
//   node scripts/native-offline.mjs [outDir]      (default: dist/offline)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runnerImport } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))
const web = path.resolve(here, '..')
const out = path.resolve(web, process.argv[2] ?? 'dist/offline')
const { module } = await runnerImport(path.join(here, 'native-offline-gen.ts'), { configFile: false, root: web, logLevel: 'warn' })
await module.generate(out)
let bytes = 0
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else bytes += fs.statSync(p).size
  }
}
walk(out)
console.log(`offline: ${path.relative(web, out)} = ${(bytes / 1e6).toFixed(2)} MB`)
