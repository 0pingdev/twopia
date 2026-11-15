import { create } from 'zustand';

export type Mode =
  | 'TITLE'
  | 'PLAY'
  | 'PAUSED'
  | 'SETTINGS'
  | 'WAITING'
  | 'MISSION_ACTIVE'
  | 'MISSION_DONE'
  | 'GIFT_SEQUENCE'
  | 'CHAMBER'
  | 'MEMORY';

/**
 * The mode machine. One source of truth.
 *
 * Every state transition goes through `setMode`, `pushUI`, or `popUI`.
 * Pointer lock is a *derived* concern: useEffect in `usePointerLockSync`
 * listens to mode changes. It is never requested ad-hoc by a component.
 *
 * The bug class this solves: the old version scattered booleans
 * (isPaused, isLocked, modalOpen) that could all be true at once, causing
 * the cursor to be hidden while a password field was on screen. With a
 * single mode + a UI stack, only one surface is interactable at a time,
 * by construction.
 */

type ModeStore = {
  mode: Mode;
  uiStack: Mode[];

  /** Replace the current mode entirely. Clears the UI stack. */
  setMode: (next: Mode) => void;

  /** Push a UI mode on top of the current one (e.g. SETTINGS over PLAY). */
  pushUI: (next: Mode) => void;

  /** Pop the top UI mode, returning to whatever was underneath. */
  popUI: () => void;

  /** True when the current mode should have pointer lock (pointer hidden). */
  wantsPointerLock: () => boolean;

  /** True when any modal/overlay is open. */
  hasUI: () => boolean;

  /** True when ESC should be handled by the top UI, not the game. */
  hasInteractiveUI: () => boolean;
};

/** Modes where the pointer should be captured (hidden, mouse = camera). */
const POINTER_LOCK_MODES: Mode[] = ['PLAY', 'MISSION_ACTIVE'];

export const useMode = create<ModeStore>((set, get) => ({
  mode: 'TITLE',
  uiStack: [],

  setMode: (next) => set({ mode: next, uiStack: [] }),

  pushUI: (next) =>
    set((s) => ({
      uiStack: [...s.uiStack, s.mode],
      mode: next,
    })),

  popUI: () =>
    set((s) => {
      if (s.uiStack.length === 0) return s;
      const uiStack = s.uiStack.slice(0, -1);
      const mode = s.uiStack[s.uiStack.length - 1];
      return { mode, uiStack };
    }),

  wantsPointerLock: () => {
    const { mode, uiStack } = get();
    if (uiStack.length > 0) return false;
    return POINTER_LOCK_MODES.includes(mode);
  },

  hasUI: () => get().uiStack.length > 0,

  hasInteractiveUI: () => {
    const { uiStack } = get();
    return uiStack.length > 0;
  },
}));
