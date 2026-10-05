import type { Heard } from '../trust/speakable'

// The reply to each question, for voice conversation (command 12). App announces it; VoiceChat listens and reads
// it aloud when the user has turned conversation on. Nothing is stored.

const listeners = new Set<(heard: Heard) => void>()

export function announceReply(heard: Heard) {
  for (const f of listeners) f(heard)
}

export function onReply(f: (heard: Heard) => void): () => void {
  listeners.add(f)
  return () => void listeners.delete(f)
}
