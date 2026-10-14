import type { Reciter } from '../../quran/recitation'
import qatami from './photos/nasser-alqatami.jpg'
import sudais from './photos/abdulrahman-alsudais.jpg'
import './ReciterAvatar.css'

/** The reciters' photos (reply 0047 §1; CLAUDE.md §8: real photos of reciters with a known licence and its credit), by
 *  mp3quran's read id, cut to the head and shoulders from the Commons files: Nasser Alqatami by Ayman dhū alghiná
 *  (CC BY-SA 4.0, VRT ticket 2024071410002913; the cut stays CC BY-SA 4.0), Abdulrahman Alsudais by the Prime
 *  Minister's Office of India (GODL-India); both cut out on white with rembg (reply 0054 أ1). Their credits are on
 *  «المصادر والشكر» (data/sources.json). */
export const RECITER_PHOTOS: Partial<Record<number, string>> = { 86: qatami, 54: sudais }

/** A reciter's circle (board RecitersFav): his photo where there is one, else the initial of his name in a medallion.
 *  His name is always written beside it, so the circle is hidden from screen readers. */
export function ReciterAvatar({ reciter, small = false, large = false }: { reciter: Reciter; small?: boolean; large?: boolean }) {
  const photo = RECITER_PHOTOS[reciter.read]
  return (
    <span className={`rd-avatar${photo ? ' has-photo' : ''}${small ? ' is-small' : ''}${large ? ' is-large' : ''}`} aria-hidden="true" data-photo={photo ? reciter.read : undefined}>
      {photo ? <img src={photo} alt="" width={48} height={48} decoding="async" draggable={false} /> : reciter.name.ar.trim().charAt(0)}
    </span>
  )
}
