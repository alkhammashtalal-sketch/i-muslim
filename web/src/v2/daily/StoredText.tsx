// A stored source text shown as written (data/fatwas.json; reply 0031-add14): line breaks kept by CSS (pre-line).
// Private-use characters (U+E000–U+F8FF: the site's own «arabisque» font marks, e.g. U+F074 and U+F079 in fatwa 13471)
// stay in the text unchanged; each is wrapped in an aria-hidden span that is not rendered (no empty box), with nothing
// of ours in its place. Nothing else is cut or edited.
const PUA = /([\uE000-\uF8FF])/u

export function StoredText({ text }: { text: string }) {
  return (
    <>
      {text.split(PUA).map((p, i) =>
        PUA.test(p) ? (
          <span key={i} aria-hidden="true" className="dt-pua">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  )
}
