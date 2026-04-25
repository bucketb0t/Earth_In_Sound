'use client';

/**
 * AccountCell.tsx
 * ─────────────────────────────────────────────────────────────────
 * Account section cell with a horizontal On/Off toggle and a small
 * 7-segment-style username display.
 *
 * Behaviour:
 *   · Toggle pill slides right when loggedIn = true.
 *   · "Off" label is red (logged-out) / dim (logged-in).
 *   · "On"  label is green (logged-in) / dim (logged-out).
 *   · Display shows "JasonW" when logged in, "------" when not.
 *   · Display glows green when logged in.
 * ─────────────────────────────────────────────────────────────────
 */

import type { KeyboardEvent } from 'react';
import { useNavbarContext } from '../../lib/NavbarContext';

export default function AccountCell() {
  const { loggedIn, toggleLogin } = useNavbarContext();

  return (
    <div className="cell">
      <div className="cell-label">Account</div>

      {/* Toggle row: Off ●──── On */}
      <div className="h-toggle-wrap">
        <span
          className="h-toggle-lbl"
          style={{ color: loggedIn ? '#333' : '#ef4444' }}
        >
          Off
        </span>

        <div
          className={`h-toggle-track ${loggedIn ? 'on' : ''}`}
          onClick={toggleLogin}
          role="switch"
          tabIndex={0}
          aria-checked={loggedIn}
          aria-label="Login toggle"
          onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => e.key === 'Enter' && toggleLogin()}
        >
          <div className="h-toggle-nub" />
        </div>

        <span
          className="h-toggle-lbl"
          style={{ color: loggedIn ? '#22c55e' : '#333' }}
        >
          On
        </span>
      </div>

      {/* Username display */}
      <div className={`acct-display ${loggedIn ? 'on' : ''}`}>
        <span id="acct-text">{loggedIn ? 'JasonW' : '------'}</span>
      </div>

      <style jsx>{`
        .cell {
          flex: 1 1 0;
          min-width: 90px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 8px;
          position: relative;
          border-left: 1px solid #2a2a2a;
        }

        .cell-label {
          font-size: 8px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #555;
          margin-bottom: 6px;
          text-align: center;
          white-space: nowrap;
        }

        .h-toggle-wrap {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .h-toggle-lbl {
          font-size: 8px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: color 0.2s;
          font-family: 'Courier New', monospace;
        }

        .h-toggle-track {
          width: 36px;
          height: 18px;
          background: #0d0d0d;
          border: 1px solid #2a2a2a;
          border-radius: 9px;
          position: relative;
          cursor: pointer;
        }
        .h-toggle-track:focus-visible {
          outline: 2px solid #22c55e;
          outline-offset: 2px;
        }

        .h-toggle-nub {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: linear-gradient(145deg, #555, #333);
          border: 1px solid #222;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: left 0.25s, background 0.25s, box-shadow 0.25s;
        }
        .h-toggle-track.on .h-toggle-nub {
          left: 20px;
          background: linear-gradient(145deg, #4ade80, #16a34a);
          box-shadow: 0 0 6px #22c55e88;
        }

        .acct-display {
          background: #030f03;
          border: 1px solid #1a2e1a;
          border-radius: 4px;
          padding: 3px 6px;
          width: 100%;
          max-width: 80px;
          min-height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 1px 4px #000;
          transition: box-shadow 0.3s;
          margin-top: 6px;
        }
        .acct-display span {
          font-size: 9px;
          letter-spacing: 0.05em;
          color: #1a2e1a;
          transition: color 0.2s, text-shadow 0.2s;
          font-family: 'Courier New', monospace;
        }

        .acct-display.on {
          box-shadow: inset 0 1px 4px #000, 0 0 6px #22c55e22;
        }
        .acct-display.on span {
          color: #22c55e;
          text-shadow: 0 0 6px #22c55e88;
        }
      `}</style>
    </div>
  );
}
