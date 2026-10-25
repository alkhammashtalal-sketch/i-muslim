// «أيقونة التطبيق» (add-ons 0072-add30 §2, 0072-add31 §2 and 0072-add32 §3): the Home Screen icon, chosen in the
// settings among four: «المورّقة» (the primary icon, with its dark and tinted appearances), then the alternates, light
// only: «الصافية», «المؤطّرة» and «العاجية».
// iPhone only: the app's plugin AppIcon (web/ios/App/App/AppIconPlugin.swift) calls UIApplication.setAlternateIconName,
// and iOS shows its own notice of the change. Android has none (activity-alias is not stable enough; relay/w1/
// 0072-icon-choice/README.md), and the browser has none: nothing is shown there.
import { registerPlugin } from '@capacitor/core'
import { platform } from './platform'

export type AppIconId = 'ornate' | 'classic' | 'framed' | 'ivory'

/** The four, in their order in the settings; `native` is the alternate icon set's name, null for the primary. */
export const APP_ICONS: { id: AppIconId; native: string | null; thumb: string }[] = [
  { id: 'ornate', native: null, thumb: '/app-icons/ornate.png' },
  { id: 'classic', native: 'AppIconClassic', thumb: '/app-icons/classic.png' },
  { id: 'framed', native: 'AppIconFramed', thumb: '/app-icons/framed.png' },
  { id: 'ivory', native: 'AppIconIvory', thumb: '/app-icons/ivory.png' },
]

type Plugin = {
  get(): Promise<{ supported: boolean; name: string | null }>
  set(o: { name: string | null }): Promise<{ name: string | null }>
}
const AppIcon = registerPlugin<Plugin>('AppIcon')

/** The id of an alternate icon set's name; the primary for null or a name this build does not know. */
export const iconIdOf = (name: string | null | undefined): AppIconId => APP_ICONS.find((i) => i.native === (name ?? null))?.id ?? 'ornate'

/** The icon on the Home Screen now, or null where it cannot be chosen (Android, the browser, an older build). */
export async function currentAppIcon(): Promise<AppIconId | null> {
  if (platform() !== 'ios') return null
  try {
    const r = await AppIcon.get()
    return r.supported ? iconIdOf(r.name) : null
  } catch {
    return null
  }
}

/** Sets the icon; iOS shows its own notice. True when the Home Screen now has it. */
export async function setAppIcon(id: AppIconId): Promise<boolean> {
  const icon = APP_ICONS.find((i) => i.id === id)
  if (!icon || platform() !== 'ios') return false
  try {
    const r = await AppIcon.set({ name: icon.native })
    return iconIdOf(r.name) === id
  } catch {
    return false
  }
}
