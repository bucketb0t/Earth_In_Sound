# Project_Explained: Earth In Sound Guide

## Purpose

This guide explains how the current Earth In Sound codebase communicates across
files. Use it to trace behavior, not to read copied source code.

Every flow answers the same questions:

- **Trigger:** what starts the behavior.
- **Path:** which files/functions are called.
- **Data:** what crosses the boundary.
- **Owner:** which file owns the rule.
- **Reason:** why the boundary exists.
- **Read:** where to inspect the implementation.

Source comments explain local line-level details. This guide explains system
ownership and communication.

## Project Model

Earth In Sound has four main systems:

- **Routes:** Next.js renders the active page under `app/layout.tsx`.
- **Navbar:** custom controls send intent to shared navbar state.
- **Auth/users:** Better Auth owns credentials and sessions; the project
  `users` table owns roles, status, and public identity.
- **Podcast:** the server converts Acast RSS into project-owned data before
  React renders it.

```mermaid
flowchart TD
  Browser["Browser URL"] --> Layout["app/layout.tsx"]
  Layout --> Navbar["Navbar"]
  Layout --> Page["Current route page"]

  Navbar --> NavbarState["components/navbar/state.ts"]
  NavbarState --> Router["Next router"]
  Router --> Page

  AccountUI["AccountAuthPanel"] --> AuthClient["authClient"]
  AuthClient --> AuthApi["app/api/auth/[...all]/route.ts"]
  AuthApi --> AuthConfig["lib/server/auth/auth.ts"]
  AuthConfig --> BetterAuthTables["Better Auth tables"]
  AuthConfig --> UserWrites["project user write hooks"]
  UserWrites --> UsersTable["users table"]

  Setup["npm run database:setup"] --> ProjectMigrations["project migrations"]
  Setup --> AuthMigrations["Better Auth migrations"]
  Setup --> OwnerScript["create-owner.ts"]
  OwnerScript --> OwnerContext["owner-setup-context.ts"]
  OwnerContext --> AuthConfig
  OwnerScript --> UsersTable

  PodcastRoute["podcast route"] --> AcastParser["lib/podcast/acast.ts"]
  AcastParser --> Feed["Acast RSS"]
  AcastParser --> PodcastShow["PodcastShow"]
  PodcastShow --> PodcastUI["podcast feature UI"]
```

## Flow 1: Route Rendering

- **Trigger:** browser opens `/`, `/account`, `/store`, `/cart`, a Jason Walton
  route, or an I Hate Music route.
- **Path:** browser URL -> Next.js App Router -> `app/layout.tsx` -> `Navbar`
  plus the matching `app/(site)/**/page.tsx`.
- **Data:** URL path and React `children` for the active route.
- **Owner:** `app/layout.tsx` owns the permanent shell; route `page.tsx` files
  own page-specific content.
- **Reason:** the navbar is the permanent interface object. Keeping it in the
  root layout lets pages change without remounting the site frame.
- **Read:** `app/layout.tsx`, `app/(site)/**/page.tsx`.

## Flow 2: Navbar Navigation

- **Trigger:** user clicks, drags, or keyboard-activates a navbar control.
- **Path:** navbar cell -> `useNavbarContext()` -> action from
  `components/navbar/state.ts` -> `setVisualState(...)` -> `router.push(...)`
  -> pathname changes -> `getRouteVisualState(...)` syncs the active control.
- **Data:** section id, link index, target route, current pathname,
  `activePage`, `eisSliderPos`, `isStorePressed`, `isCartPressed`.
- **Owner:** `state.ts` owns route mapping and shared actions; cell components
  own artwork, events, labels, and state classes.
- **Reason:** cells should express user intent, not duplicate route rules.
  Example: `EISLogoCell` sends index `1`; `state.ts` translates it to `/about`.
- **Read:** `components/navbar/state.ts`,
  `components/navbar/cells/EISLogoCell/EISLogoCell.tsx`,
  `components/navbar/shared/KnobJackCell/KnobJackCell.tsx`.

## Flow 3: Navbar Scaling

- **Trigger:** viewport resize, browser zoom, font load, page restore, or navbar
  cell size change.
- **Path:** `state.ts` measures full-scale row need -> calculates `scale` ->
  `Navbar.tsx` measures rendered cells -> writes CSS variables -> navbar/cell
  CSS paints the result.
- **Data:** viewport width, `devicePixelRatio`, full-scale row width, rendered
  row width, `scale`, CSS variables.
- **Owner:** `state.ts` owns scale; `Navbar.tsx` owns DOM measurement and CSS
  variable output; CSS modules own artwork layout.
- **Reason:** React can measure real DOM size; CSS is better at painting layered
  artwork. The CSS-variable handoff keeps those roles separate.
- **Current limitation:** desktop assets shrink for narrow screens; mobile
  assets exist but no mobile navbar layout uses them yet.
- **Read:** `components/navbar/state.ts`,
  `components/navbar/shared/Navbar/Navbar.tsx`,
  `components/navbar/shared/Navbar/NavbarStyle.module.css`.

## Flow 4: Signup

- **Trigger:** logged-out user submits the account form in sign-up mode.
- **Path:** `AccountAuthPanel` -> `authClient.signUp.email(...)` ->
  `app/api/auth/[...all]/route.ts` -> `auth.ts` -> `user.create.before` ->
  Better Auth creates auth user -> `user.create.after` ->
  `createNormalUserAfterSignup(...)` -> `users` table -> `session.refetch()`.
- **Data:** email, password, username passed as Better Auth `name`, Better Auth
  `user.id`, project `role = user`, project `status = active`.
- **Owner:** Better Auth owns passwords/sessions; `auth.ts` owns hooks;
  `write-users.ts` owns project profile creation.
- **Reason:** signup needs two server-side records: the Better Auth auth record
  and the project profile. Hooks keep the browser from needing a second request.
- **Current limitation:** email format is validated, but mailbox ownership is
  not verified yet.
- **Read:** `features/account-auth/AccountAuthPanel.tsx`,
  `lib/client/auth/auth-client.ts`, `app/api/auth/[...all]/route.ts`,
  `lib/server/auth/auth.ts`,
  `lib/server/database/users/write/write-users.ts`.

## Flow 5: Sign-In, Session, And Navbar Login State

- **Trigger:** user signs in, signs out, or UI checks the current session.
- **Path:** `authClient.signIn.email(...)` -> auth API route -> Better Auth
  password/session logic -> `auth.ts` `session.create.before` ->
  `getUserByAuthProviderId(...)` -> allow only active project users ->
  `authClient.useSession()` updates UI.
- **Data:** email/password, Better Auth `user.id`, project user status, session
  user data.
- **Owner:** Better Auth owns cookies and sessions; `auth.ts` owns active-user
  session blocking; navbar state reads `authClient.useSession()` for display.
- **Reason:** valid credentials are not enough. The project decides whether the
  linked user is active, disabled, deleted, or missing.
- **Read:** `lib/server/auth/auth.ts`, `components/navbar/state.ts`,
  `components/navbar/cells/AccountCell/AccountCell.tsx`,
  `features/account-auth/AccountAuthPanel.tsx`.

## Flow 6: Owner Creation

- **Trigger:** `npm run database:setup` runs with `LOCAL_OWNER_EMAIL`,
  `LOCAL_OWNER_USERNAME`, and `LOCAL_OWNER_PASSWORD`.
- **Path:** `run-database-setup.ts` -> project migrations -> Better Auth
  migrations -> `create-owner.ts` -> `runWithOwnerSetupContext(...)` ->
  Better Auth sign-up/sign-in -> `createOrLinkOwnerAfterSignup(...)` ->
  remove setup-created sessions.
- **Data:** owner env vars, Better Auth `user.id`, project `role = owner`,
  project `status = active`.
- **Owner:** `create-owner.ts` owns terminal owner setup;
  `owner-setup-context.ts` marks the trusted setup call;
  `createOrLinkOwnerAfterSignup(...)` owns the owner row.
- **Reason:** owner is too powerful for public signup. Owner creation requires a
  server-only setup context that browser requests cannot enter.
- **Read:** `database/scripts/run-database-setup.ts`,
  `database/scripts/users/create-owner/create-owner.ts`,
  `lib/server/auth/owner-setup-context.ts`,
  `lib/server/database/users/write/write-users.ts`.

## Flow 7: Project User Lifecycle

- **Trigger:** future trusted server code calls `updateUsername`, `disableUser`,
  `deleteUser`, `reactivateUser`, `transferOwnership`, or `setUserRole`.
- **Path:** trusted caller derives current user from session -> `write-users.ts`
  loads current and target users -> permission/status checks -> optional Better
  Auth lifecycle helper -> update `users` table -> return updated `StoredUser`.
- **Data:** trusted `currentUserId` or `currentOwnerId`, `targetUserId`,
  requested username/role/status, Better Auth `user.id` when auth sessions or
  auth accounts must change.
- **Owner:** `write-users.ts` owns mutations; `user-permissions.ts` owns
  permission checks; `auth-user-lifecycle.ts` owns Better Auth session/account
  helper calls.
- **Reason:** lifecycle rules must be centralized. Browser input must never
  decide `currentUserId` or `currentOwnerId`; server code must derive that from
  the authenticated session.
- **Status rules:** disabled users keep email/username reserved and cannot
  create sessions. Deleted users lose the Better Auth account, release email
  lookup, and keep username lookup permanently reserved.
- **Current limitation:** Better Auth changes and project table changes are
  separate operations. Future production routes should add recovery for partial
  failure.
- **Read:** `lib/server/database/users/write/write-users.ts`,
  `lib/server/database/users/permissions/user-permissions.ts`,
  `lib/server/auth/auth-user-lifecycle.ts`.

## Flow 8: Database Setup And Migrations

- **Trigger:** `npm run database:setup`.
- **Path:** `run-database-setup.ts` -> `run-project-migrations.ts` ->
  `database/migrations/*.sql` -> record in `project_migrations` -> Better Auth
  migration script -> owner creation script.
- **Data:** `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BETTER_AUTH_SECRET`,
  `BETTER_AUTH_URL`, optional `LOCAL_OWNER_*`, SQL migration ids.
- **Owner:** `database/migrations/*.sql` owns project schema;
  `run-project-migrations.ts` owns ordering/history; Better Auth migration
  script owns auth tables.
- **Reason:** project tables and Better Auth tables both need setup. The hub
  runs them in the required order before owner setup.
- **Current caution:** the existing-users baseline assumes the table matches the
  known project schema. Unknown or manually edited schemas should be checked
  before trusting that baseline.
- **Read:** `database/scripts/run-database-setup.ts`,
  `database/scripts/run-project-migrations/run-project-migrations.ts`,
  `database/migrations/*.sql`,
  `database/scripts/auth/run-better-auth-migrations/run-better-auth-migrations.ts`.

## Flow 9: Database Tests

- **Trigger:** `npm run test:database`.
- **Path:** `test-database.ts` -> `test-user-database.ts` -> disposable local
  database -> project migrations -> Better Auth migrations -> auth/user
  lifecycle assertions.
- **Data:** temporary database URL, generated test identities, Better Auth
  sessions, project user rows.
- **Owner:** `test-user-database.ts` owns current integration coverage;
  `test-user-helpers.ts` owns small assertion helpers.
- **Reason:** lifecycle tests create and delete data aggressively. A disposable
  database keeps real local or production data clean.
- **Current coverage:** owner linking, signup mirroring, disabled session
  blocking, role changes, ownership transfer, single-owner enforcement, email
  reuse after deletion, permanent username reservation after deletion.
- **Read:** `database/scripts/test-database.ts`,
  `database/scripts/users/test-users/test-user-database.ts`,
  `database/scripts/users/test-users/test-user-helpers.ts`.

## Flow 10: Podcast Loading

- **Trigger:** user opens `/i-hate-music/podcast`.
- **Path:** podcast route -> `loadPodcastShowSafely()` ->
  `getIHateMusicShow()` -> fetch Acast RSS -> `fast-xml-parser` ->
  `PodcastShow` -> `IHateMusicPodcastPage` -> `EpisodeMediaTabs` ->
  `useEpisodeMediaController()` -> `useVideoAudioContinuity()`.
- **Data:** external RSS XML, `PodcastShow`, `PodcastEpisode[]`, audio URL,
  episode URL, cover image URL, manual YouTube URL entered by user, consent for
  background audio handoff.
- **Owner:** `lib/podcast/acast.ts` owns feed parsing;
  `IHateMusicPodcastPage.tsx` owns page layout; `EpisodeMediaTabs.tsx` renders
  per-episode controls; `useEpisodeMediaController.ts` owns tab/video state and
  YouTube setup; `useVideoAudioContinuity.ts` owns consent and provider handoff;
  `youtubePlayer.ts` owns the iframe message boundary; `mediaTiming.ts` owns
  safe Acast timestamp seeking.
- **Reason:** external feed quirks stay server-side. React receives clean
  project-owned data, not raw XML.
- **Media rule:** consent prepares Acast audio before backgrounding. Browsers
  that support concurrent media keep muted Acast standby synced under YouTube;
  iOS/iPadOS uses prepared handoff without concurrent standby.
- **Current limitation:** the page renders the full RSS archive at once. For
  performance work, start with pagination or lazy media mounting.
- **Read:** `app/(site)/i-hate-music/podcast/page.tsx`,
  `lib/podcast/acast.ts`,
  `features/ihate-music-podcast/IHateMusicPodcastPage.tsx`,
  `features/ihate-music-podcast/EpisodeMediaTabs.tsx`,
  `features/ihate-music-podcast/useEpisodeMediaController.ts`,
  `features/ihate-music-podcast/useVideoAudioContinuity.ts`,
  `features/ihate-music-podcast/youtubePlayer.ts`,
  `features/ihate-music-podcast/mediaTiming.ts`.

## Flow 11: Navbar Assets

- **Trigger:** navbar cell renders, hovers, focuses, presses, or becomes active.
- **Path:** component state/class -> CSS module -> `/public/NavbarAssets/...`
  -> browser paints image/font/video.
- **Data:** state class, `background-image`, `font-face`, `video src`.
- **Owner:** TypeScript owns interaction state; CSS owns visible artwork;
  `public/NavbarAssets` owns static files.
- **Reason:** artwork changes should mostly stay in CSS/assets. TypeScript
  should decide behavior, not hardcode visual layers.
- **Current limitation:** desktop assets are wired; `MobileAssets` is not used
  by a dedicated mobile navbar layout yet.
- **Read:** `components/navbar/cells/*.tsx`,
  `components/navbar/cells/*.module.css`,
  `components/navbar/shared/KnobJackCell/*`, `public/NavbarAssets/`.

## File Ownership Reference

- `app/layout.tsx`: permanent shell.
- `components/navbar/state.ts`: navbar behavior and route state.
- `components/navbar/shared/Navbar/Navbar.tsx`: measurement and CSS variables.
- `components/navbar/cells/*`: individual navbar controls.
- `features/account-auth/AccountAuthPanel.tsx`: account form UI.
- `app/api/auth/[...all]/route.ts`: Better Auth HTTP entry.
- `lib/server/auth/auth.ts`: auth config, signup hooks, session guard.
- `lib/server/database/users/*`: project user validation, reads, permissions,
  writes.
- `database/migrations/*`: project schema.
- `database/scripts/*`: setup and database tests.
- `lib/podcast/acast.ts`: Acast RSS boundary.
- `features/ihate-music-podcast/*`: podcast page and media UI.

## Change Rules

- **Navigation:** update navbar route maps and the affected cell.
- **Account rules:** decide first whether the rule belongs to Better Auth or
  project users.
- **Owner behavior:** keep owner creation server-only and keep database
  single-owner enforcement.
- **Schema:** add a migration and a database test.
- **Podcast data:** parse external feed data in `lib/podcast/acast.ts`, not in
  React UI.
- **Artwork:** prefer CSS/assets unless behavior changes.

## Verification Checklist

- **Guide/source sync:** guide describes current communication; source comments
  explain tricky local logic; guide avoids copied source code.
- **Auth/users:** public signup creates normal users only; owner is setup-only;
  disabled/deleted users cannot create sessions; deleted email can be reused;
  deleted username stays reserved; project users never store passwords.
- **Database:** schema changes are migrations; single-owner enforcement remains
  in the database; new behavior has tests.
- **Frontend:** navbar visual state follows the URL; custom controls stay
  keyboard-accessible; narrow viewports are checked manually.
- **Commands:** `npm run type-check`, `npm run lint -- --max-warnings=0`,
  `npm run test:database`.

## Learning Order

```text
1. app/layout.tsx
2. components/navbar/state.ts
3. components/navbar/shared/Navbar/Navbar.tsx
4. one navbar cell
5. features/account-auth/AccountAuthPanel.tsx
6. app/api/auth/[...all]/route.ts
7. lib/server/auth/auth.ts
8. lib/server/database/users/write/write-users.ts
9. database/scripts/run-database-setup.ts
10. database/scripts/users/create-owner/create-owner.ts
11. database/scripts/users/test-users/test-user-database.ts
12. app/(site)/i-hate-music/podcast/page.tsx
13. lib/podcast/acast.ts
14. features/ihate-music-podcast/IHateMusicPodcastPage.tsx
15. features/ihate-music-podcast/EpisodeMediaTabs.tsx
16. features/ihate-music-podcast/useEpisodeMediaController.ts
17. features/ihate-music-podcast/useVideoAudioContinuity.ts
```

## Glossary

- **Boundary:** where one responsibility hands data to another.
- **Better Auth user:** auth-library record that owns password/session identity.
- **Project user:** Earth In Sound `users` row that owns role, status, and
  public identity.
- **`auth_provider_user_id`:** Better Auth `user.id` stored on the project row.
- **Lookup field:** lowercase unique/search key for email or username.
- **Owner setup context:** server-only trust marker for first-owner setup.
- **Latched control:** navbar utility control that stays pressed for its route.
- **RSS boundary:** server parser that converts external XML to project data.

## Short Version

The layout mounts the permanent navbar and active page. Navbar cells send intent
to shared navbar state, which translates that intent into routes. Better Auth
owns authentication; the project users table owns roles, status, and identity
rules. Setup prepares both database systems and creates the owner through a
server-only path. The podcast route fetches RSS on the server and gives React
clean project data.
