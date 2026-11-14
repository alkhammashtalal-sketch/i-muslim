// scripts/wr.sh, the wrangler guard (reply 0033-add1 §4; docs/incidents/2026-10-13-live-deploy.md). Run with WR_DRY=1:
// it prints its decision and never calls wrangler. Writes pass only for env v11, env next while FREEZE_NEXT is absent, or
// the static site Worker.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../..')
const WR = path.join(ROOT, 'scripts/wr.sh')
/** The guard's decision for `args`, run in `cwd` (worker/ by default, where the incident's command ran). */
const run = (args: string[], cwd = path.join(ROOT, 'worker')) => {
  const r = spawnSync('bash', [WR, ...args], { cwd, env: { ...process.env, WR_DRY: '1' }, encoding: 'utf8' })
  return { code: r.status, out: `${r.stdout}${r.stderr}` }
}
const refused = (args: string[], cwd?: string) => expect(run(args, cwd).code, args.join(' ')).toBe(2)
const allowed = (args: string[], cwd?: string) => expect(run(args, cwd), args.join(' ')).toMatchObject({ code: 0 })
/** The guard copied into a fresh root, with or without FREEZE_NEXT there: it reads the file next to its own scripts/. */
const guardAt = (frozen: boolean) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wr-root-'))
  fs.mkdirSync(path.join(dir, 'scripts'))
  fs.copyFileSync(WR, path.join(dir, 'scripts/wr.sh'))
  if (frozen) fs.writeFileSync(path.join(dir, 'FREEZE_NEXT'), 'frozen\n')
  const decide = (args: string[]) => spawnSync('bash', [path.join(dir, 'scripts/wr.sh'), ...args], { cwd: dir, env: { ...process.env, WR_DRY: '1' }, encoding: 'utf8' }).status
  return { decide, done: () => fs.rmSync(dir, { recursive: true, force: true }) }
}
const NEXT_WRITES = [
  ['deploy', '--env', 'next', '--tag', 'abc', '--message', 'commit abc'],
  ['versions', 'upload', '--env', 'next', '--tag', 'abc'],
  ['versions', 'deploy', 'x@100%', '--env', 'next', '-y'],
  ['secret', 'put', 'VAPID_PUBLIC_KEY', '--env', 'next'],
  ['triggers', 'deploy', '--env', 'next'],
  ['rollback', '--env', 'next'],
  ['d1', 'execute', 'imuslim-next', '--remote', '--env', 'next', '--file', '../data/processed/hadith-day.sql'],
  ['d1', 'migrations', 'apply', 'imuslim-next', '--remote', '--env', 'next'],
  ['dev', '--remote', '--env', 'next', '--port', '8796'],
  ['vectorize', 'insert', 'imuslim-next-hadiths', '--file', 'v.ndjson', '--env', 'next'],
  ['vectorize', 'create-metadata-index', 'imuslim-next-hadiths', '--property-name', 'kind', '--type', 'string', '--env', 'next'],
  ['d1', 'time-travel', 'restore', 'imuslim-next', '--env', 'next', '--bookmark', 'b'],
]

describe('scripts/wr.sh', () => {
  it('refuses the command of the 13 October incident, word for word', () => {
    const r = run(['pages', 'project', 'create', 'i-muslim', '--production-branch', 'main'])
    expect(r.code).toBe(2)
    expect(r.out).toMatch(/REFUSE: pages project create/)
  })
  it('refuses every write to production: deploy, rollback, versions, secrets, triggers, D1 imuslim, remote dev', () => {
    refused(['deploy'])
    refused(['deploy', '--name', 'i-muslim'])
    refused(['deploy', '--env', 'next', '--name', 'i-muslim'])
    refused(['deploy', '--env=production'])
    refused(['rollback', '9c7e6771-1dab-4ecc-b24b-00b38517e0c4', '--name', 'i-muslim', '--message', 'x', '-y'])
    refused(['versions', 'deploy', '9c7e6771-1dab-4ecc-b24b-00b38517e0c4@100%', '--name', 'i-muslim', '-y'])
    refused(['versions', 'upload'])
    refused(['secret', 'put', 'X'])
    refused(['triggers', 'deploy'])
    refused(['d1', 'execute', 'imuslim', '--remote', '--command', 'SELECT 1'])
    refused(['d1', 'migrations', 'apply', 'imuslim', '--remote'])
    refused(['d1', 'execute', 'imuslim-next', '--remote', '--command', 'SELECT 1'])
    refused(['dev', '--remote'])
    refused(['pages', 'deploy', '../site'])
    refused(['kv', 'key', 'put', 'k', 'v'])
  })
  it('never deletes a Cloudflare resource, next included', () => {
    refused(['delete', '--name', 'i-muslim'])
    refused(['delete', '--env', 'next'])
    refused(['d1', 'delete', 'imuslim-next'])
  })
  it('lets env next through while FREEZE_NEXT is absent, and refuses every write to it while the file exists', () => {
    const open = guardAt(false)
    const frozen = guardAt(true)
    for (const args of NEXT_WRITES) {
      expect(open.decide(args), `open: ${args.join(' ')}`).toBe(0)
      expect(frozen.decide(args), `frozen: ${args.join(' ')}`).toBe(2)
    }
    // Reads of next still pass while it is frozen.
    for (const args of [['deployments', 'status', '--env', 'next'], ['secret', 'list', '--env', 'next'], ['vectorize', 'info', 'imuslim-next-hadiths'], ['vectorize', 'query', 'imuslim-next-passages', '--vector', '1,2,3'], ['d1', 'migrations', 'list', 'imuslim-next', '--remote', '--env', 'next'], ['d1', 'time-travel', 'info', 'imuslim-next', '--env', 'next']])
      expect(frozen.decide(args), `frozen read: ${args.join(' ')}`).toBe(0)
    // The restore point of the live database is never read (add-on 0031-add7), nor restored.
    for (const args of [['d1', 'time-travel', 'info', 'imuslim'], ['d1', 'time-travel', 'info', 'imuslim', '--env', 'next'], ['d1', 'time-travel', 'restore', 'imuslim', '--bookmark', 'b']])
      expect(open.decide(args), `live: ${args.join(' ')}`).toBe(2)
    open.done()
    frozen.done()
  })
  it('the repository holds FREEZE_NEXT today (replies 0070 and 0071): next is frozen', () => {
    expect(fs.existsSync(path.join(ROOT, 'FREEZE_NEXT'))).toBe(true)
    for (const args of NEXT_WRITES) refused(args)
  })
  // Reply 0071: env v11, release 1.1's server, on its own resources only.
  it('lets env v11 through on its own Worker, D1 and Vectorize indexes only', () => {
    allowed(['deploy', '--env', 'v11'])
    allowed(['versions', 'upload', '--env', 'v11', '--tag', 'abc'])
    allowed(['secret', 'put', 'ADMIN_TOKEN', '--env', 'v11'])
    allowed(['dev', '--remote', '--env', 'v11', '--port', '8797'])
    allowed(['d1', 'create', 'imuslim-v11'])
    allowed(['d1', 'migrations', 'apply', 'imuslim-v11', '--remote', '--env', 'v11'])
    allowed(['d1', 'execute', 'imuslim-v11', '--remote', '--env', 'v11', '--file', '../data/processed/hadith.sql'])
    allowed(['vectorize', 'create', 'imuslim-v11-passages', '--dimensions', '1024', '--metric', 'cosine', '--env', 'v11'])
    allowed(['vectorize', 'upsert', 'imuslim-v11-hadiths', '--file', 'v.ndjson', '--env', 'v11'])
    allowed(['vectorize', 'create-metadata-index', 'imuslim-v11-hadiths', '--property-name', 'kind', '--type', 'string', '--env', 'v11'])
    allowed(['vectorize', 'info', 'imuslim-v11-passages'])
    // Another Worker name, another database or index under --env v11, v11's database under another env, any other new
    // database, and deletes.
    refused(['deploy', '--env', 'v11', '--name', 'i-muslim'])
    refused(['deploy', '--env', 'v11', '--name', 'i-muslim-next'])
    refused(['d1', 'execute', 'imuslim-next', '--remote', '--env', 'v11', '--command', 'SELECT 1'])
    refused(['d1', 'execute', 'imuslim', '--remote', '--env', 'v11', '--command', 'SELECT 1'])
    refused(['d1', 'migrations', 'apply', 'imuslim-next', '--remote', '--env', 'v11'])
    refused(['d1', 'execute', 'imuslim-v11', '--remote', '--command', 'SELECT 1'])
    refused(['d1', 'execute', 'imuslim-v11', '--remote', '--env', 'next', '--command', 'SELECT 1'])
    refused(['d1', 'create', 'imuslim'])
    refused(['d1', 'create', 'imuslim-next-v3'])
    refused(['vectorize', 'insert', 'imuslim-next-hadiths', '--file', 'v.ndjson', '--env', 'v11'])
    refused(['vectorize', 'insert', 'imuslim-passages', '--file', 'v.ndjson', '--env', 'v11'])
    refused(['vectorize', 'insert', 'imuslim-v11-hadiths', '--file', 'v.ndjson', '--env', 'next'])
    refused(['vectorize', 'create', 'imuslim-v11-', '--dimensions', '1024', '--metric', 'cosine', '--env', 'v11'])
    refused(['vectorize', 'delete', 'imuslim-v11-hadiths', '--env', 'v11'])
    refused(['d1', 'delete', 'imuslim-v11'])
    refused(['delete', '--env', 'v11'])
  })
  // --env picks a section of worker/wrangler.jsonc; the guard trusts that env v11 there binds v11's resources alone.
  it('worker/wrangler.jsonc: env v11 binds i-muslim-v11, D1 imuslim-v11 and imuslim-v11-* indexes, and nothing of next or production', () => {
    const src = fs.readFileSync(path.join(ROOT, 'worker/wrangler.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, '')
    const v11 = JSON.parse(src).env?.v11
    expect(v11?.name).toBe('i-muslim-v11')
    expect(v11.d1_databases.map((d: { database_name: string }) => d.database_name)).toEqual(['imuslim-v11'])
    for (const v of v11.vectorize) expect(v.index_name).toMatch(/^imuslim-v11-./)
    expect(JSON.stringify(v11)).not.toMatch(/imuslim-next|"imuslim"|imuslim-passages|2cbc4d13|22bc931b|37001/)
    // No crons: v11 sends no prayer bell to anyone.
    expect(v11.triggers?.crons ?? []).toEqual([])
  })
  it('lets reads through', () => {
    allowed(['deployments', 'list', '--name', 'i-muslim'])
    allowed(['versions', 'view', '6e29cacc-e94c-4f10-8ce9-094009d4e6f4', '--name', 'i-muslim'])
    allowed(['pages', 'project', 'list'])
    allowed(['d1', 'migrations', 'list', 'imuslim-next', '--remote', '--env', 'next'])
    allowed(['secret', 'list', '--env', 'next'])
    allowed(['--version'])
    allowed(['dev'])
  })
  // Reply 0048 §1: Vectorize writes with --env next on a next index only, never a delete, never the live index.
  it('vectorize: create, insert, upsert and the metadata index on a next index with --env next; reads on next indexes; no delete', () => {
    // The writes as they stood before FREEZE_NEXT (a copy of the guard without the file).
    const open = guardAt(false)
    const allowedOpen = (args: string[]) => expect(open.decide(args), args.join(' ')).toBe(0)
    allowedOpen(['vectorize', 'create', 'imuslim-next-hadiths', '--dimensions', '1024', '--metric', 'cosine', '--env', 'next'])
    allowedOpen(['vectorize', 'create', '--dimensions', '1024', '--metric', 'cosine', 'imuslim-next-hadiths', '--env', 'next'])
    allowedOpen(['vectorize', 'insert', 'imuslim-next-hadiths', '--file', 'v.ndjson', '--env', 'next'])
    allowedOpen(['vectorize', 'upsert', 'imuslim-next-passages', '--file', 'v.ndjson', '--env', 'next'])
    allowedOpen(['vectorize', 'create-metadata-index', 'imuslim-next-hadiths', '--property-name', 'kind', '--type', 'string', '--env', 'next'])
    allowed(['vectorize', 'info', 'imuslim-next-hadiths'])
    allowed(['vectorize', 'list-metadata-index', 'imuslim-next-hadiths', '--env', 'next'])
    allowed(['vectorize', 'list'])
    // Without --env next, or on the live index (whatever the flags say), or any delete.
    refused(['vectorize', 'create', 'imuslim-next-hadiths', '--dimensions', '1024', '--metric', 'cosine'])
    refused(['vectorize', 'insert', 'imuslim-passages', '--file', 'v.ndjson', '--env', 'next'])
    refused(['vectorize', 'upsert', 'imuslim-passages', '--file', 'v.ndjson', '--env', 'next'])
    refused(['vectorize', 'create-metadata-index', 'imuslim-passages', '--property-name', 'kind', '--type', 'string', '--env', 'next'])
    refused(['vectorize', 'create', 'imuslim-next-', '--dimensions', '1024', '--metric', 'cosine', '--env', 'next'])
    refused(['vectorize', 'info', 'imuslim-passages'])
    refused(['vectorize', 'query', 'imuslim-passages', '--vector', '1,2,3'])
    refused(['vectorize', 'delete', 'imuslim-next-hadiths', '--env', 'next'])
    refused(['vectorize', 'delete-vectors', 'imuslim-next-hadiths', '--ids', 'a', '--env', 'next'])
    refused(['vectorize', 'delete-metadata-index', 'imuslim-next-hadiths', '--property-name', 'kind', '--env', 'next'])
    expect(open.decide(['vectorize', 'delete', 'imuslim-next-hadiths', '--env', 'next'])).toBe(2)
    open.done()
  })
  it('the site Worker: only a static-assets config named i-muslim-site', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wr-site-'))
    const cfg = (o: object) => fs.writeFileSync(path.join(dir, 'wrangler.jsonc'), JSON.stringify(o, null, 1))
    cfg({ name: 'i-muslim-site', compatibility_date: '2026-10-01', assets: { directory: './public' } })
    allowed(['deploy'], dir)
    allowed(['deploy', '--dry-run'], dir)
    refused(['deploy', '--name', 'i-muslim'], dir)
    refused(['deploy', '--env', 'production'], dir)
    // Any Worker code, D1, Vectorize, route or trigger makes it something else.
    cfg({ name: 'i-muslim-site', main: 'src/index.ts', assets: { directory: './public' } })
    refused(['deploy'], dir)
    cfg({ name: 'i-muslim-site', assets: { directory: './public' }, d1_databases: [{ binding: 'DB', database_name: 'imuslim' }] })
    refused(['deploy'], dir)
    cfg({ name: 'i-muslim', assets: { directory: './public' } })
    refused(['deploy'], dir)
    // The repository's own site config, from the root with -c.
    if (fs.existsSync(path.join(ROOT, 'site/wrangler.jsonc'))) allowed(['deploy', '-c', 'site/wrangler.jsonc'], ROOT)
    fs.rmSync(dir, { recursive: true, force: true })
  })
})
