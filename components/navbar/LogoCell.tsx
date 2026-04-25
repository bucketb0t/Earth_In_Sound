'use client';

/**
 * LogoCell.tsx
 * ─────────────────────────────────────────────────────────────────
 * The fixed-width logo panel on the far left of the navbar.
 *
 * · Background: #666666 (design spec).
 * · Clicking navigates to EIS Home (slider position 0).
 * · The logo image fills the cell with object-fit: contain so it
 *   never gets cropped regardless of cell height.
 * ─────────────────────────────────────────────────────────────────
 */

import Image from 'next/image';
import type { KeyboardEvent } from 'react';
import { useNavbarContext } from '../../lib/NavbarContext';

export default function LogoCell() {
  const { goHome } = useNavbarContext();

  return (
    <div
      className="logo-cell"
      onClick={goHome}
      role="button"
      tabIndex={0}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => e.key === 'Enter' && goHome()}
      aria-label="Earth In Sound — go to home"
    >
      <div className="logo-img-wrap">
        <Image
          src="/EarthInSound.webp"
          alt="Earth In Sound logo"
          fill
          sizes="(max-width: 640px) 100vw, 150px"
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>

      <style jsx>{`
        .logo-cell {
          flex: 0 0 auto;
          min-width: 100px;
          max-width: 150px;
          background: #666666;
          cursor: pointer;
          padding: 6px 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          outline-offset: -2px;
        }
        .logo-cell:focus-visible {
          outline: 2px solid #22c55e;
        }

        .logo-img-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 60px;
        }
      `}</style>
    </div>
  );
}
