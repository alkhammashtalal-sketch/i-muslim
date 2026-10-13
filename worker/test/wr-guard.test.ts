// scripts/wr.sh, the wrangler guard (reply 0033-add1 §4; docs/incidents/2026-10-13-live-deploy.md). Run with WR_DRY=1:
// it prints its decision and never calls wrangler. Writes pass only for env next or the static site Worker.
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
  it('lets env next through', () => {
    allowed(['deploy', '--env', 'next', '--tag', 'abc', '--message', 'commit abc'])
    allowed(['secret', 'put', 'VAPID_PUBLIC_KEY', '--env', 'next'])
    allowed(['d1', 'execute', 'imuslim-next', '--remote', '--env', 'next', '--file', '../data/processed/hadith-day.sql'])
    allowed(['d1', 'migrations', 'apply', 'imuslim-next', '--remote', '--env', 'next'])
    allowed(['dev', '--remote', '--env', 'next', '--port', '8796'])
    allowed(['rollback', '--env', 'next'])
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
