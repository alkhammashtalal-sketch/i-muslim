// Types for swipe.js (add-on 0072-add54).
export declare function swipeStep(dx: number, dy: number, rtl: boolean): 1 | -1 | 0
export declare function ownSwipe(target: EventTarget | null, root: Element): boolean
export declare function attachSwipe(el: Element, turn: (k: 1 | -1) => void, rtl: () => boolean): () => void
