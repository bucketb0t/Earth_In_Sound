import assert from "node:assert/strict";

import {
  getInitialNavbarReferenceWidth,
  resolveNavbarReferenceWidth,
  type NavbarWindowMetrics,
} from "../../../front-end/navbar/layoutGeometry";
import {
  SECTION_LINKS,
  degreesToRadians,
  ledAngleToTrigDegrees,
  svgPoint,
} from "../../../front-end/navbar/config";

function createMetrics(
  overrides: Partial<NavbarWindowMetrics> = {},
): NavbarWindowMetrics {
  return {
    viewportWidth: 1280,
    layoutViewportWidth: 1263,
    outerWidth: 1300,
    devicePixelRatio: 1,
    screenWidth: 1920,
    screenHeight: 1080,
    ...overrides,
  };
}

/** Test knob geometry and responsive sizing, including page zoom versus real resizing. */
export function runNavbarLogicTests(): void {
  assert.deepEqual(
    SECTION_LINKS.eis,
    ["Home", "About", "Contact"],
    "EIS control order should remain stable",
  );
  assert.deepEqual(
    SECTION_LINKS.jw,
    ["Biography", "Discography", "Production"],
    "Jason Walton control order should remain stable",
  );
  assert.deepEqual(
    SECTION_LINKS.ihm,
    ["Podcast", "Community", "Patreon"],
    "I Hate Music control order should remain stable",
  );

  assert.equal(ledAngleToTrigDegrees(60), 30);
  assert.equal(degreesToRadians(180), Math.PI);
  assert.deepEqual(svgPoint(10, 0), { x: 50, y: 40 });
  const topPoint = svgPoint(10, 90);
  assert.ok(Math.abs(topPoint.x - 40) < 0.000_001);
  assert.ok(Math.abs(topPoint.y - 30) < 0.000_001);

  assert.equal(
    getInitialNavbarReferenceWidth(createMetrics()),
    1280,
    "normal browser startup should use the content viewport",
  );
  assert.equal(
    getInitialNavbarReferenceWidth(
      createMetrics({ viewportWidth: 1024, outerWidth: 1280 }),
    ),
    1280,
    "startup while zoomed should use the zoom-independent outer width",
  );
  assert.equal(
    getInitialNavbarReferenceWidth(
      createMetrics({
        viewportWidth: 390,
        layoutViewportWidth: 390,
        outerWidth: 1280,
        screenWidth: 390,
        screenHeight: 844,
      }),
    ),
    390,
    "device emulation should use the emulated viewport",
  );
  assert.equal(
    getInitialNavbarReferenceWidth(
      createMetrics({ viewportWidth: 900, outerWidth: 0 }),
    ),
    900,
    "missing outer-width data should fall back to the viewport",
  );

  const previousMetrics = createMetrics();
  assert.equal(
    resolveNavbarReferenceWidth(
      previousMetrics,
      createMetrics({ viewportWidth: 1024, devicePixelRatio: 1.25 }),
      1280,
    ),
    1280,
    "page zoom should preserve the previous responsive width",
  );
  assert.equal(
    resolveNavbarReferenceWidth(
      previousMetrics,
      createMetrics({
        viewportWidth: 390,
        layoutViewportWidth: 390,
        screenWidth: 390,
        screenHeight: 844,
      }),
      1280,
    ),
    390,
    "an emulated viewport change should update responsive width",
  );

  const resizedReferenceWidth = resolveNavbarReferenceWidth(
    previousMetrics,
    createMetrics({
      viewportWidth: 1000,
      layoutViewportWidth: 983,
      outerWidth: 1020,
    }),
    1280,
  );
  assert.ok(
    Math.abs(resizedReferenceWidth - (1280 / 1300) * 1020) < 0.000_001,
    "real window resizing should preserve browser-frame correction",
  );

  assert.equal(
    resolveNavbarReferenceWidth(
      previousMetrics,
      createMetrics({
        viewportWidth: 1024,
        layoutViewportWidth: 1007,
        devicePixelRatio: 1.25,
      }),
      1263,
      "layoutViewportWidth",
    ),
    1263,
    "zoom should also preserve the scrollbar-free layout width",
  );
}
