import { runEnvironmentTests } from "./configuration/test-environment";
import { runOwnerSetupConfigurationTests } from "./configuration/test-owner-setup-configuration";
import { runNavbarLogicTests } from "./navbar/test-navbar-logic";
import { runSetupOwnerTests } from "./ownership/test-setup-owner";
import { runAcastTests } from "./podcast/test-acast";
import { runMediaTimingTests } from "./podcast/test-media-timing";
import { runYouTubeParserTests } from "./podcast/test-youtube-parser";

interface UnitTestSuite {
  name: string;
  run: () => void | Promise<void>;
}

const unitTestSuites: readonly UnitTestSuite[] = [
  { name: "configuration/environment", run: runEnvironmentTests },
  { name: "configuration/owner-setup", run: runOwnerSetupConfigurationTests },
  { name: "ownership/setup-owner", run: runSetupOwnerTests },
  { name: "navbar/layout-logic", run: runNavbarLogicTests },
  { name: "podcast/youtube-parser", run: runYouTubeParserTests },
  { name: "podcast/media-timing", run: runMediaTimingTests },
  { name: "podcast/acast", run: runAcastTests },
];

/** Run unit suites without a browser or database. */
async function main(): Promise<void> {
  for (const testSuite of unitTestSuites) {
    console.log(`Running unit test suite: ${testSuite.name}`);
    await testSuite.run();
  }

  console.log("All unit test suites passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
