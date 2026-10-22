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

// «اسأل»'s texts in review (add-on 0071-add4 §2): the question waits for the model's turn; the voice screen says so.
const stageListeners = new Set<(stage: 'review') => void>()

export function announceStage(stage: 'review') {
  for (const f of stageListeners) f(stage)
}

export function onStage(f: (stage: 'review') => void): () => void {
  stageListeners.add(f)
  return () => void stageListeners.delete(f)
}
