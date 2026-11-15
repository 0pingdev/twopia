'use client';

import { useEffect } from 'react';
import { useMode } from './mode';

/**
 * Watches the mode machine and drives pointer lock from it.
 * Also handles the ESC key and pointer-lock loss correctly:
 * - If a UI is already open when the lock is lost, do nothing.
 * - Otherwise, go to PAUSED.
 *
 * This is the file that makes "cursor disappears and can't click the
 * password field" impossible by construction.
 */
export function usePointerLockSync(canvas: HTMLCanvasElement | null) {
  useEffect(() => {
    if (!canvas || typeof document === 'undefined') return;

    const state = useMode.getState;

    const request = () => {
      if (!state().wantsPointerLock()) return;
      if (document.pointerLockElement === canvas) return;
      canvas.requestPointerLock?.().catch(() => {
        // Browser refused — treat as paused so the user isn't stuck.
        state().setMode('PAUSED');
      });
    };

    const release = () => {
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
    };

    const unsubscribe = useMode.subscribe((s, prev) => {
      const wantNow = s.wantsPointerLock();
      const wantPrev = prev.wantsPointerLock();
      if (wantNow && !wantPrev) request();
      if (!wantNow && wantPrev) release();
    });

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      if (locked) return;
      // Lock was lost. If a UI is open, leave it alone (this is the fix).
      if (state().hasInteractiveUI()) return;
      if (state().mode === 'PLAY' || state().mode === 'MISSION_ACTIVE') {
        state().setMode('PAUSED');
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      const s = state();
      if (s.hasInteractiveUI()) {
        s.popUI();
      } else if (s.mode === 'PLAY' || s.mode === 'MISSION_ACTIVE') {
        s.setMode('PAUSED');
      }
    };

    const onBlur = () => {
      const s = state();
      if (s.mode === 'PLAY' || s.mode === 'MISSION_ACTIVE') s.setMode('PAUSED');
    };

    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('keydown', onKey);
    window.addEventListener('blur', onBlur);

    return () => {
      unsubscribe();
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', onBlur);
    };
  }, [canvas]);
}
