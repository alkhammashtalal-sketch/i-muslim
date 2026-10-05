import type { ReactNode } from 'react'

/** An ayah's text exactly as stored, with its marker kept on the line of the last word: the last word, a no-break
 *  space and the marker never wrap apart (command 14). */
export function AyahEnd({ text, children }: { text: string; children: ReactNode }) {
  const body = text.trimEnd()
  const i = body.lastIndexOf(' ')
  return (
    <>
      {i < 0 ? '' : body.slice(0, i + 1)}
      <span className="ayah-end">
        {body.slice(i + 1)}
        {'\u00A0'}
        {children}
      </span>
    </>
  )
}
