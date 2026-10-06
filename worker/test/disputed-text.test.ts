import { describe, expect, it } from 'vitest'
import messages from '../src/config/messages.json'
import { STRINGS } from '../../web/src/i18n'

// Rule 11's fixed sentence is shown from the Worker (messages.json) and read aloud from the interface strings: the two
// copies must be the same in every language, or the screen and the voice would say different things.
describe('the disputed-matter sentence', () => {
  it('is the same in the Worker and in the interface, in all ten languages', () => {
    const disputed = (messages as { disputed: Record<string, string> }).disputed
    for (const [lang, t] of Object.entries(STRINGS)) expect(t.disputedText, lang).toBe(disputed[lang])
  })
})
