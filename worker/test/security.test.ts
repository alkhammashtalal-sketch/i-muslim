import fs from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'
import { HEADERS, withSecurityHeaders } from '../src/security'

it('static files (_headers) and Worker responses carry the same security headers', () => {
  const file = fs.readFileSync(path.resolve(import.meta.dirname, '../../web/public/_headers'), 'utf8')
  // The "/*" block only (other blocks, such as /explain/* with its Cache-Control, add to it).
  const block = file.split(/\n(?=\S)/).find((b) => b.startsWith('/*\n')) ?? ''
  const fromFile = Object.fromEntries(
    block
      .split('\n')
      .filter((l) => /^\s+\S+:/.test(l))
      .map((l) => {
        const i = l.indexOf(':')
        return [l.slice(0, i).trim().toLowerCase(), l.slice(i + 1).trim()]
      }),
  )
  expect(fromFile).toEqual(HEADERS)
})

it('adds the headers to a Worker response without changing status or body', async () => {
  const res = withSecurityHeaders(new Response('{"ok":true}', { status: 201, headers: { 'content-type': 'application/json' } }))
  expect(res.status).toBe(201)
  expect(await res.text()).toBe('{"ok":true}')
  expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
  expect(res.headers.get('content-type')).toBe('application/json')
})
