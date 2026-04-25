'use client';

/**
 * JackPort.tsx
 * ─────────────────────────────────────────────────────────────────
 * Small circular jack-port indicator in the bottom-right corner of
 * each section cell.
 *
 * · Glows in the section's colour when that section is active.
 * · Goes dark when the section is inactive.
 * ─────────────────────────────────────────────────────────────────
 */

interface JackPortProps {
  /** Whether this section is currently selected. */
  active: boolean;
  /** CSS colour string for the glow (e.g. '#22c55e'). */
  glow: string;
}

export default function JackPort({ active, glow }: JackPortProps) {
  return (
    <div
      className={`jack ${active ? 'active' : ''}`}
      aria-hidden="true"
    >
      <div className="jack-inner" />

      <style jsx>{`
        /* Outer ring — sits in bottom-right of the parent cell */
        .jack {
          position: absolute;
          bottom: 5px;
          right: 6px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #0d0d0d;
          border: 2px solid #222;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.3s, box-shadow 0.3s;
          pointer-events: none;
        }

        /* Active state: border + glow ring match section colour */
        .jack.active {
          border-color: ${glow};
          box-shadow: 0 0 7px ${glow};
        }

        /* Inner dot */
        .jack-inner {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #2a2a2a;
          transition: background 0.3s;
        }
        .jack.active .jack-inner {
          background: ${glow};
        }
      `}</style>
    </div>
  );
}
