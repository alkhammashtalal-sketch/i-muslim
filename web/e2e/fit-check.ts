// The fit checks of the sweep (reply 0045 ج), shared by e2e/v2-fit-sweep.spec.ts and e2e/v2-0072-a11y.spec.ts (Apple's
// «Larger Text» at 200%, add-on 0072-add34 §ب3). Run in the page (page.evaluate(check)): self-contained.

/** The checks, in the page. Returns one line per problem: kind, a short path to the element, and its text. */
export function check(): string[] {
  const out: string[] = []
  const vw = window.innerWidth
  const label = (e: Element) => {
    const cls = typeof e.className === 'string' ? e.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.') : ''
    const own = (e.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)
    return `${e.tagName.toLowerCase()}${cls ? '.' + cls : ''} «${own}»`
  }
  const shown = (e: Element) => {
    const r = e.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) return false
    for (let a: Element | null = e; a; a = a.parentElement) {
      const cs = getComputedStyle(a)
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false
      if (a.getAttribute('aria-hidden') === 'true' && a !== document.body) return false
      if (a.tagName === 'DIALOG' && !(a as HTMLDialogElement).open) return false
    }
    return true
  }
  const ownText = (e: Element) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
  const scrolls = (cs: CSSStyleDeclaration) => cs.overflowX === 'auto' || cs.overflowX === 'scroll'
  const scrollsAny = (cs: CSSStyleDeclaration) => scrolls(cs) || cs.overflowY === 'auto' || cs.overflowY === 'scroll'
  const ON_PURPOSE = '.dc-hadith-text, .hd-ex.is-cut'
  const root = document.querySelector('dialog[open]') ?? document.body
  for (const e of root.querySelectorAll('*')) {
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue
    if (e.closest('.sr-only')) continue
    if (!shown(e)) continue
    const cs = getComputedStyle(e)
    const r = e.getBoundingClientRect()
    const he = e as HTMLElement
    // 1. Wider than its box: its own text's lines against its content edges (or, inline, its parent block's).
    if (ownText(e) && !scrolls(cs)) {
      let box = e as Element
      while (getComputedStyle(box).display === 'inline' && box.parentElement) box = box.parentElement
      const b = box.getBoundingClientRect()
      const bcs = getComputedStyle(box)
      const inL = b.left + parseFloat(bcs.borderLeftWidth) - 1
      const inR = b.right - parseFloat(bcs.borderRightWidth) + 1
      for (const n of e.childNodes) {
        if (n.nodeType !== 3 || !n.textContent!.trim()) continue
        const range = document.createRange()
        range.selectNodeContents(n)
        for (const q of range.getClientRects()) {
          if (q.width < 1) continue
          if (q.left < inL || q.right > inR) {
            out.push(`wider-than-box ${Math.round(q.left)}..${Math.round(q.right)} in ${Math.round(inL)}..${Math.round(inR)} ${label(e)}`)
            break
          }
        }
      }
    }
    // 2. Ellipsis.
    if (cs.textOverflow === 'ellipsis' && he.scrollWidth > he.clientWidth + 1) out.push(`ellipsis ${label(e)}`)
    // 3. Cut at the bottom.
    if (ownText(e) && (cs.overflowY === 'hidden' || cs.overflowY === 'clip') && he.scrollHeight > he.clientHeight + 2 && cs.webkitLineClamp === 'none')
      out.push(`cut-bottom ${he.scrollHeight}>${he.clientHeight} ${label(e)}`)
    if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && he.scrollHeight > he.clientHeight + 2 && !e.matches(ON_PURPOSE))
      out.push(`line-clamp ${label(e)}`)
    // 4. Out of the screen (sideways), and out of its card or sheet.
    if ((ownText(e) || e.matches('button, a, input, select')) && (r.left < -1 || r.right > vw + 1))
      out.push(`off-screen ${Math.round(r.left)}..${Math.round(r.right)} of ${vw} ${label(e)}`)
    // The day's cards (reply 0071 §3: the date and its disc, the ayah, the hadith) are frames: a text that spills out of them counts too.
    const card = e.parentElement?.closest('.dc-disc, .day-date, .dc-card, .dt-card, .v2-card, .card, .v2-sheet, dialog, .v2-set-section, .v2-set-group')
    if (card && (ownText(e) || e.matches('button, a, input, select'))) {
      // Its content box: a tap area that reaches past the frame on purpose (padding) is not content.
      const c = card.getBoundingClientRect()
      const l = r.left + parseFloat(cs.paddingLeft)
      const rr = r.right - parseFloat(cs.paddingRight)
      if (l < c.left - 1 || rr > c.right + 1) out.push(`out-of-card ${Math.round(l)}..${Math.round(rr)} in ${Math.round(c.left)}..${Math.round(c.right)} ${label(e)}`)
    }
    // 5. A control whose content (its box less its padding: a tap area may reach past on purpose) is cut by an ancestor
    //    that hides its overflow; an ancestor that scrolls shows the rest by scrolling.
    if (e.matches('button, a, input, select, [role="button"], [role="radio"], [role="switch"]')) {
      const c = {
        l: r.left + parseFloat(cs.paddingLeft),
        r: r.right - parseFloat(cs.paddingRight),
        t: r.top + parseFloat(cs.paddingTop),
        b: r.bottom - parseFloat(cs.paddingBottom),
      }
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
        const acs = getComputedStyle(a)
        if (acs.overflowX === 'visible' && acs.overflowY === 'visible') continue
        if (scrollsAny(acs)) break
        const ar = a.getBoundingClientRect()
        if (c.l < ar.left - 1 || c.r > ar.right + 1 || c.t < ar.top - 1 || c.b > ar.bottom + 1) out.push(`control-cut by ${label(a).split(' ')[0]} ${label(e)}`)
        break
      }
    }
  }
  return [...new Set(out)]
}
