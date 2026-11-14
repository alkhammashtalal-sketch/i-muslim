// The listen button's two places in the name card (add-on 0072-add14 §4): «استمع» under the name (NameListen: the
// recitation of the evidence ayah, when the name is a word of it) and under the evidence ayah (ListenAyah: its
// recitation, and outside Arabic its meaning). The button is its own branch's (web/src/listen/Listen.tsx); this file
// takes it when it is in the build and draws nothing while it is not, so the card's branch and the button's merge in
// either order with no edit. Nothing Quranic is read by a device voice: that guard is the button's own (listen/guard.ts).
import type { ComponentType } from 'react'

type ListenModule = {
  NameListen?: ComponentType<{ name: string; ayahId: string | null | undefined; ayahText: string | null | undefined; className?: string }>
  ListenAyah?: ComponentType<{ id: string; meaning?: { text: string; lang: string; ayah?: string } | null; className?: string }>
}
const mod: ListenModule = Object.values(import.meta.glob<ListenModule>('../../../listen/Listen.tsx', { eager: true }))[0] ?? {}
const words = Object.values(import.meta.glob<{ nameInAyah?: (name: string, ayahText: string) => boolean }>('../../../listen/name-word.ts', { eager: true }))[0] ?? {}

/** Whether «استمع» under the name has the evidence ayah to recite (the name a word of it, the button in the build). Then
 *  the evidence's own place adds nothing in Arabic (the same recitation), and stays empty. */
export const nameHeard = (name: string, ayahText: string | null | undefined): boolean => !!(mod.NameListen && ayahText && words.nameInAyah?.(name, ayahText))

/** Under the name, in the sky: «استمع» to the name in its evidence ayah. */
export function NameSlot({ name, ayahId, ayahText }: { name: string; ayahId: string | null; ayahText: string | null }) {
  const L = mod.NameListen
  return L && ayahId && ayahText ? <L name={name} ayahId={ayahId} ayahText={ayahText} /> : null
}

/** Under the evidence ayah: its recitation, and outside Arabic its meaning. */
export function EvidenceSlot({ id, meaning }: { id: string; meaning?: { text: string; lang: string; ayah?: string } | null }) {
  const L = mod.ListenAyah
  return L ? <L id={id} meaning={meaning} /> : null
}
