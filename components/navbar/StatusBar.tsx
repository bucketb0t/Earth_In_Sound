'use client';

/**
 * StatusBar.tsx
 * ─────────────────────────────────────────────────────────────────
 * Thin bar below the navbar that shows which section and link are
 * currently active, rendered in the section's glow colour.
 *
 * When nothing is active, shows "NO SIGNAL — SELECT A SECTION"
 * in a dark, dim style.
 * ─────────────────────────────────────────────────────────────────
 */

import { useNavbarContext } from '../../lib/NavbarContext';

export default function StatusBar() {
  const { statusInfo } = useNavbarContext();
  const { color, text } = statusInfo;

  const dotStyle: React.CSSProperties = color
    ? { background: color, border: `1px solid ${color}`, boxShadow: `0 0 6px ${color}` }
    : { background: '#1a1a1a', border: '1px solid #2a2a2a', boxShadow: 'none' };

  const textStyle: React.CSSProperties = {
    color: color ?? '#2a2a2a',
    transition: 'color 0.3s',
  };

  return (
    <div className="status-bar">
      <div className="status-dot" style={dotStyle} aria-hidden="true" />
      <span className="status-text" style={textStyle} role="status" aria-live="polite">
        {text}
      </span>

      <style jsx>{`
        .status-bar {
          width: 100%;
          background: #080808;
          border-top: 1px solid #1a1a1a;
          padding: 7px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
          transition: all 0.3s;
        }

        .status-text {
          font-size: 10px;
          letter-spacing: 0.1em;
          font-family: 'Courier New', monospace;
        }
      `}</style>
    </div>
  );
}
