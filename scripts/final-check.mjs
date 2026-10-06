// The last check before submitting (reply 0015): one pass/fail line per item, exit code 1 if any item fails.
//
//   node scripts/final-check.mjs --voice off [--write-readme] [--dir out/submission] [--base https://…]
//
// Items:
//   1. the live link answers 200 and carries the name «مسلم» (page title and manifest);
//   2. the GitHub repository is public (gh, or the unauthenticated GitHub API);
//   3. no secrets file is tracked, and the eight secret patterns find nothing in HEAD;
//   4. "enabled" in web/src/config/voice-mode.json matches Talal's decision (--voice on|off);
//   5. the live version was deployed from HEAD: the commit recorded in the version's tag/message (the deploy helper
//      passes `wrangler deploy --tag <sha> --message "commit <sha>"`) equals HEAD, or HEAD differs from it only in files
//      that are not deployed (docs, eval, scripts, tests); if the version carries no commit, both are printed;
//   6. the video in the folder lasts 2:00 or less (ffmpeg, on PATH or FFMPEG_PATH);
//   7. the presentation opens: a sound zip with ppt/presentation.xml;
//   8. README-submission.md is in the folder (--write-readme writes it: links, re-test commands, the live commit and
//      the measurement date).
// The folder out/submission/ is ignored by git. Nothing is sent to /api/ask.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const opt = (k) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : undefined);
const BASE = (opt('base') ?? 'https://i-muslim.alkhammashtalal.workers.dev').replace(/\/$/, '');
const REPO = 'alkhammashtalal-sketch/i-muslim';
const DIR = path.resolve(ROOT, opt('dir') ?? 'out/submission');
const VOICE = opt('voice');
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const sh = (cmd, args, o = {}) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...o });
const git = (...a) => sh('git', ['-C', ROOT, ...a]).trim();
const results = [];
const add = (n, item, ok, detail) => results.push({ n, item, result: ok === null ? 'WARN' : ok ? 'PASS' : 'FAIL', detail });
const HEAD = git('rev-parse', 'HEAD');

// 1. The live link and the name.
try {
  const page = await fetch(BASE);
  const html = await page.text();
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  const manifest = await (await fetch(`${BASE}/manifest.webmanifest`)).json().catch(() => ({}));
  add(1, 'الرابط الحي والاسم', page.status === 200 && title.includes('مسلم') && manifest.name === 'مسلم', `HTTP ${page.status}; title «${title}»; manifest «${manifest.name ?? '—'}»`);
} catch (e) {
  add(1, 'الرابط الحي والاسم', false, String(e));
}

// 2. The repository is public.
try {
  let visibility;
  try {
    visibility = JSON.parse(sh('gh', ['repo', 'view', REPO, '--json', 'visibility'])).visibility;
  } catch {
    const r = await fetch(`https://api.github.com/repos/${REPO}`);
    visibility = r.ok ? (await r.json()).visibility : `HTTP ${r.status}`;
  }
  add(2, 'المستودع عام', String(visibility).toLowerCase() === 'public', `${REPO}: ${visibility}`);
} catch (e) {
  add(2, 'المستودع عام', false, String(e));
}

// 3. No secrets: no tracked secrets file, and the eight patterns find nothing in HEAD.
{
  const files = git('ls-files').split('\n').filter((f) => /(^|\/)\.dev\.vars|(^|\/)\.env($|\.)|\.pem$/i.test(f));
  const PATTERNS = [
    'sk-[A-Za-z0-9]{20,}',
    'AKIA[0-9A-Z]{16}',
    'ghp_[A-Za-z0-9]{30,}',
    'github_pat_[A-Za-z0-9_]{20,}',
    'xox[baprs]-[A-Za-z0-9-]{10,}',
    '-----BEGIN [A-Z ]*PRIVATE KEY-----',
    '(ADMIN_TOKEN|IP_SALT|LLM_API_KEY|SUNNAH_API_KEY)[[:space:]]*=[[:space:]]*[A-Za-z0-9]{16,}',
    'Bearer [A-Za-z0-9]{32,}',
  ];
  const hits = [];
  for (const p of PATTERNS) {
    try {
      const out = sh('git', ['-C', ROOT, 'grep', '-nE', '-e', p, 'HEAD', '--', '.', ':!worker/worker-configuration.d.ts']).trim();
      if (out) hits.push(`${p}: ${out.split('\n').length}`);
    } catch {
      /* git grep exits 1 when nothing matches */
    }
  }
  add(3, 'لا أسرار', !files.length && !hits.length, `ملفات أسرار متتبَّعة: ${files.length ? files.join('، ') : 'لا شيء'}؛ الأنماط الثمانية على HEAD: ${hits.length ? hits.join('؛ ') : 'صفر'}`);
}

// 4. Voice mode as Talal decided.
{
  const enabled = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/config/voice-mode.json'), 'utf8')).enabled;
  if (!['on', 'off'].includes(VOICE)) add(4, 'وضع المحادثة الصوتية', null, `enabled = ${enabled}؛ مرّر --voice on|off بقرار طلال`);
  else add(4, 'وضع المحادثة الصوتية', enabled === (VOICE === 'on'), `enabled = ${enabled}، والقرار ${VOICE}`);
}

// 5. The live version was deployed from HEAD.
let liveCommit = null;
try {
  const deps = JSON.parse(sh('npx', ['wrangler', 'deployments', 'list', '--json'], { cwd: path.join(ROOT, 'worker') }));
  const last = deps.at(-1);
  const versionId = last.versions.sort((a, b) => b.percentage - a.percentage)[0].version_id;
  const v = JSON.parse(sh('npx', ['wrangler', 'versions', 'view', versionId, '--json'], { cwd: path.join(ROOT, 'worker') }));
  const note = `${v.annotations?.['workers/tag'] ?? ''} ${v.annotations?.['workers/message'] ?? ''}`;
  const sha = note.match(/\b[0-9a-f]{40}\b/)?.[0] ?? null;
  liveCommit = sha;
  if (!sha) add(5, 'آخر التزام منشور = HEAD', null, `النسخة الحية ${versionId} (${last.created_on}) بلا رقم التزام؛ HEAD = ${HEAD.slice(0, 7)}`);
  else if (sha === HEAD) add(5, 'آخر التزام منشور = HEAD', true, `النسخة ${versionId.slice(0, 8)} من ${sha.slice(0, 7)} = HEAD`);
  else {
    // Files that change what is deployed: the app, the Worker and shared types (tests excluded).
    const changed = git('diff', '--name-only', sha, HEAD).split('\n').filter(Boolean);
    const deployable = changed.filter((f) => /^(web|worker|shared)\//.test(f) && !/^(web\/e2e|worker\/test)\//.test(f));
    add(5, 'آخر التزام منشور = HEAD', deployable.length === 0, `منشور ${sha.slice(0, 7)}، وHEAD ${HEAD.slice(0, 7)}؛ ${deployable.length ? `ملفات غير منشورة: ${deployable.slice(0, 8).join('، ')}${deployable.length > 8 ? '…' : ''}` : `الفرق ${changed.length} ملفًا كلها لا تُنشر (وثائق، وقياس، وسكربتات، واختبارات)`}`);
  }
} catch (e) {
  add(5, 'آخر التزام منشور = HEAD', null, `تعذّرت قراءة النسخة الحية: ${String(e.message ?? e).slice(0, 120)}؛ HEAD = ${HEAD.slice(0, 7)}`);
}

// 8 (first, so 6 and 7 can be checked on the written folder). README-submission.md.
fs.mkdirSync(DIR, { recursive: true });
const readme = path.join(DIR, 'README-submission.md');
if (argv.includes('--write-readme')) {
  const measured = fs.readdirSync(path.join(ROOT, 'eval/reports')).filter((f) => /^official12-\d{4}-\d{2}-\d{2}-flash-off\.json$/.test(f)).sort().at(-1)?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '—';
  const live = liveCommit ? liveCommit.slice(0, 7) : `غير مسجّل في النسخة (HEAD ${HEAD.slice(0, 7)})`;
  fs.writeFileSync(
    readme,
    `# «مسلم» — حزمة التسليم

**الرابط الحي:** ${BASE}
**المستودع (عام):** https://github.com/${REPO}
**تحقّق بنفسك (الحالات الاثنتا عشرة الرسمية ونتيجة القياس الحي):** ${BASE}/verify

**آخر التزام منشور:** \`${live}\` (https://github.com/${REPO}/commit/${liveCommit ?? HEAD})
**تاريخ القياس الحي:** ${measured} (النموذج DeepSeek V4 Flash على Cloudflare Workers AI؛ التقارير في \`eval/reports/\`)

## إعادة الاختبار
بـ Node.js 22.5 أو أعلى، ونسخة من الـ Worker والمسار الإداري مفتوح فيها (التفاصيل في README المستودع، «كيف تعيد الاختبار»):

\`\`\`bash
# الاسترجاع وحده (بلا نموذج لغوي)
WORKER_URL=… ADMIN_TOKEN=… node eval/run-retrieval.mjs
# الإجابات عبر /api/ask: السلوك، والمستوى، والشواهد، وتطابق النص بايتيًا مع قاعدة البيانات
WORKER_URL=… ADMIN_TOKEN=… node eval/run-answers.mjs
# الحالات الاثنتا عشرة الرسمية كما هي
WORKER_URL=… ADMIN_TOKEN=… node eval/run-answers.mjs --set official12
\`\`\`

وفحص الرابط الحي بلا أي إعداد: \`node scripts/smoke-live.mjs\`.

## الملفات في هذه الحزمة
- \`muslim-presentation.pptx\`: العرض التقديمي.
- \`demo-hd.mp4\`: الفيديو (دقيقتان أو أقل).
- هذا الملف.
`,
  );
}
add(8, 'README-submission.md', fs.existsSync(readme), fs.existsSync(readme) ? path.relative(ROOT, readme) : 'غير موجود (--write-readme يكتبه)');

// 6. The video lasts 2:00 or less.
{
  const video = fs.readdirSync(DIR).filter((f) => f.endsWith('.mp4')).map((f) => path.join(DIR, f));
  if (!video.length) add(6, 'الفيديو ≤ 2:00', false, `لا ملف mp4 في ${path.relative(ROOT, DIR)}`);
  for (const v of video) {
    let err = '';
    try {
      execFileSync(FFMPEG, ['-hide_banner', '-i', v], { stdio: 'pipe' });
    } catch (e) {
      err = String(e.stderr ?? e.message);
    }
    const d = err.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    const seconds = d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : NaN;
    const audio = /Stream #\d+:\d+[^:]*: Audio/.test(err);
    add(6, 'الفيديو ≤ 2:00', seconds <= 120, d ? `${path.basename(v)}: ${seconds.toFixed(1)} ث، ${audio ? 'بصوت' : 'بلا صوت'}` : `${path.basename(v)}: تعذّرت قراءة المدة (ffmpeg على PATH أو FFMPEG_PATH)`);
  }
}

// 7. The presentation opens: a sound zip with ppt/presentation.xml.
{
  const pptx = fs.readdirSync(DIR).filter((f) => f.endsWith('.pptx')).map((f) => path.join(DIR, f));
  if (!pptx.length) add(7, 'العرض يُفتح', false, `لا ملف pptx في ${path.relative(ROOT, DIR)} (يضعه المراجع)`);
  for (const p of pptx) {
    try {
      sh('unzip', ['-tq', p]);
      const list = sh('unzip', ['-Z1', p]);
      add(7, 'العرض يُفتح', list.split('\n').includes('ppt/presentation.xml'), `${path.basename(p)}: zip سليم${list.includes('ppt/presentation.xml') ? '، وفيه ppt/presentation.xml' : '، وليس فيه ppt/presentation.xml'}، ${list.split('\n').filter((x) => /^ppt\/slides\/slide\d+\.xml$/.test(x)).length} شريحة`);
    } catch (e) {
      add(7, 'العرض يُفتح', false, `${path.basename(p)}: ليس zip سليمًا (${String(e.message).slice(0, 80)})`);
    }
  }
}

results.sort((a, b) => a.n - b.n);
console.log(`فحص التسليم — ${new Date().toISOString()} — HEAD ${HEAD.slice(0, 7)}\n`);
console.log('| # | البند | النتيجة | التفصيل |\n| --- | --- | --- | --- |');
for (const r of results) console.log(`| ${r.n} | ${r.item} | ${r.result} | ${r.detail} |`);
const fails = results.filter((r) => r.result === 'FAIL').length;
const warns = results.filter((r) => r.result === 'WARN').length;
console.log(`\n${results.length - fails - warns} PASS · ${fails} FAIL · ${warns} WARN`);
process.exit(fails ? 1 : 0);
