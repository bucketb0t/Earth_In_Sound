"use client";

import { CELL_GEOMETRY } from "../config";
import { activateOnEnterOrSpace, useNavbarContext } from "../state";

/**
 * Account cell.
 *
 * A compact hardware-style switch controls the local logged-in state. Geometry
 * values come from static config so the styling remains centralized.
 */
export default function AccountCell() {
  const { loggedIn, toggleLogin } = useNavbarContext();
  const { toggleGap, displayMarginTop, displayMaxWidth } = CELL_GEOMETRY.account;

  return (
    <div className="navbar-cell navbar-cell--center navbar-cell--bordered account-cell">
      <div className="cell-label">Account</div>

      <div className="h-toggle-wrap" style={{ gap: toggleGap }}>
        <span
          className="h-toggle-lbl"
          style={{ color: loggedIn ? "#333" : "#ef4444" }}
        >
          Off
        </span>

        <div
          className={`h-toggle-track ${loggedIn ? "on" : ""}`}
          onClick={toggleLogin}
          role="switch"
          tabIndex={0}
          aria-checked={loggedIn}
          aria-label="Login toggle"
          onKeyDown={(event) => activateOnEnterOrSpace(event, toggleLogin)}
        >
          <div className="h-toggle-nub" />
        </div>

        <span
          className="h-toggle-lbl"
          style={{ color: loggedIn ? "#22c55e" : "#333" }}
        >
          On
        </span>
      </div>

      <div
        className={`acct-display ${loggedIn ? "on" : ""}`}
        style={{
          marginTop: displayMarginTop,
          maxWidth: displayMaxWidth,
        }}
      >
        <span>{loggedIn ? "JasonW" : "------"}</span>
      </div>

      <style jsx>{`
        .account-cell {
          flex: 1 1 0;
          min-width: 90px;
        }

        .h-toggle-wrap {
          display: flex;
          align-items: center;
        }

        .h-toggle-lbl {
          font-size: 8px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: color 0.2s;
          font-family: "Courier New", monospace;
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
          transition:
            left 0.25s,
            background 0.25s,
            box-shadow 0.25s;
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
          min-height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 1px 4px #000;
          transition: box-shadow 0.3s;
        }

        .acct-display span {
          font-size: 9px;
          letter-spacing: 0.05em;
          color: #1a2e1a;
          transition:
            color 0.2s,
            text-shadow 0.2s;
          font-family: "Courier New", monospace;
        }

        .acct-display.on {
          box-shadow:
            inset 0 1px 4px #000,
            0 0 6px #22c55e22;
        }

        .acct-display.on span {
          color: #22c55e;
          text-shadow: 0 0 6px #22c55e88;
        }
      `}</style>
    </div>
  );
}
