import type { Reciter } from '../../quran/recitation'
import qatami from './photos/nasser-alqatami.jpg'
import sudais from './photos/abdulrahman-alsudais.jpg'
import afasy from './photos/mishary-alafasy.jpg'
import ajmi from './photos/ahmad-alajmi.jpg'
import dosari from './photos/yasser-aldosari.jpg'
import basit from './photos/abdulbasit-abdulsamad.jpg'
import './ReciterAvatar.css'

/** The reciters' photos (reply 0047 §1; CLAUDE.md §8: real photos of reciters with a known licence and its credit), by
 *  mp3quran's read id, cut to the head and shoulders and cut out on white with rembg, one frame for all (reply 0054 أ1):
 *  Nasser Alqatami by Ayman dhū alghiná (CC BY-SA 4.0, VRT ticket 2024071410002913), Abdulrahman Alsudais by the Prime
 *  Minister's Office of India (GODL-India), Mishary Alafasy from quranic.ru («Copyrighted free use» on Commons), Ahmad
 *  Al-Ajmi by أحمد زين (CC BY-SA 3.0) and Yasser Al-Dosari by Hudhayfah Ammar on Flickr (CC BY-SA 2.0); the cuts of
 *  the CC BY-SA ones stay under their licence. The last three by Talal's decision and on his responsibility (0054-add1).
 *  Abdulbasit Abdulsamad from an archive portrait on assabile.com, by Talal's decision and on his responsibility, its
 *  licence not required (0055-add1). The initial stays for a reciter without a photo. Credits on «المصادر والشكر». */
export const RECITER_PHOTOS: Partial<Record<number, string>> = { 86: qatami, 54: sudais, 123: afasy, 5: ajmi, 92: dosari, 53: basit }

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
