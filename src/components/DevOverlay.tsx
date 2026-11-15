'use client';

import { useMode } from '@/state/mode';
import { useSettings } from '@/lib/settings';

export function DevOverlay() {
  const showDev = useSettings((s) => s.showDevOverlay);
  const mode = useMode((s) => s.mode);
  const stack = useMode((s) => s.uiStack);

  if (!showDev) return null;

  const locked =
    typeof document !== 'undefined' &&
    !!document.pointerLockElement;

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        zIndex: 999,
        fontFamily: 'monospace',
        fontSize: 11,
        background: 'rgba(0,0,0,0.75)',
        color: '#e8e2d6',
        padding: '10px 12px',
        borderRadius: 4,
        lineHeight: 1.6,
        pointerEvents: 'none',
        border: '1px solid rgba(255,176,112,0.3)',
      }}
    >
      <div><b style={{ color: '#ffb070' }}>mode</b>: {mode}</div>
      <div><b style={{ color: '#ffb070' }}>stack</b>: {stack.join(' → ') || '—'}</div>
      <div><b style={{ color: '#ffb070' }}>pointer</b>: {locked ? 'locked' : 'free'}</div>
      <div><b style={{ color: '#ffb070' }}>wantLock</b>: {String(useMode.getState().wantsPointerLock())}</div>
    </div>
  );
}
