# File Manager Dashboard

A production-ready, self-hosted file manager built as a single full-stack Next.js
application: authenticated users upload, browse, download, and delete files;
a `SUPER_ADMIN` role additionally manages user accounts and the server-side
storage configuration.

- **Framework:** Next.js (App Router) + React + TypeScript + Tailwind CSS
- **Database:** Turso / libSQL via Drizzle ORM (runs as a local SQLite file by default — no external service required for local dev)
- **Auth:** Custom cookie-based sessions, Argon2/bcrypt-family password hashing (`bcryptjs`), server-enforced RBAC
- **File storage:** Local filesystem by default, or Vercel Blob when deployed to Vercel — both behind a small `StorageService` abstraction (see [Storage architecture](#4-storage-architecture))

---

## 1. Quick start (local development)

```bash
npm install
npm run db:generate   # only needed if you change src/lib/db/schema.ts
npm run db:migrate     # creates local.db and applies the schema
npm run setup          # creates the first SUPER_ADMIN + default storage config
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Sign in with the
`INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` you configured (see below).

### 1.1 Configure environment variables

Copy the example file and edit it:

```bash
cp .env.example .env.local
```

```env
# Local dev: leave blank to use a local SQLite file (see below), or point at
# a real Turso database (see "Turso setup" below).
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# Used once by `npm run setup` to create the first super admin.
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=change-this-password

# Where uploaded files are physically stored, and the upload size limit.
FILE_STORAGE_PATH=./storage/uploads
MAX_FILE_SIZE_MB=100
```

If `TURSO_DATABASE_URL` is left empty, the app defaults to `file:./local.db` —
a local SQLite file, created automatically, requiring no external account or
network access. This is intentional: the app runs fully offline out of the
box, and switching to hosted Turso later is a **config-only** change (see
§2).

### 1.2 Initialize the database and the first super admin

```bash
npm run db:migrate   # applies drizzle/*.sql to the configured database
npm run setup        # idempotent: connects, migrates, creates the admin + defaults
```

`npm run setup` is safe to re-run — it:
1. Tests the database connection.
2. Runs any pending migrations.
3. Creates a `SUPER_ADMIN` from `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`
   **only if no super admin exists yet**.
4. Sets the default storage directory (from `FILE_STORAGE_PATH`) in the
   database **only if it hasn't been configured yet**.
5. Verifies the storage directory exists and is writable (creating it if
   needed).

You will not be asked for Turso credentials at runtime — they're read once
from `.env.local`, which is gitignored and never committed.

### 1.3 Run it

```bash
npm run dev      # development server, http://localhost:3000
npm run build    # production build
npm run start    # run the production build
```

---

## 2. Turso setup (production database)

Local dev needs nothing beyond the steps above. To use hosted Turso instead
of the local SQLite file:

```bash
turso db create file-manager
turso db show file-manager --url            # -> TURSO_DATABASE_URL
turso db tokens create file-manager         # -> TURSO_AUTH_TOKEN
```

Put both values in `.env.local`:

```env
TURSO_DATABASE_URL=libsql://file-manager-yourorg.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

Then run `npm run db:migrate` (and `npm run setup` if this is a fresh
database) exactly as above — the same commands work against either backend,
since the app talks to libSQL either way via `@libsql/client` / Drizzle.

---

## 3. Roles and permissions

| Action                                   | `USER` | `SUPER_ADMIN` |
|-------------------------------------------|:------:|:-------------:|
| Log in, view dashboard                     | ✅     | ✅            |
| Upload / download / delete files           | ✅     | ✅            |
| View / create / edit / deactivate / delete users | ❌ | ✅            |
| View / change storage directory            | ❌     | ✅            |

**Every one of these rules is enforced on the server**, in the API route
handlers (`src/app/api/**/route.ts`) via `requireApiUser()` /
`requireApiSuperAdmin()` (`src/lib/auth/guards.ts`), independent of what the
UI shows or hides. A regular user calling a `SUPER_ADMIN`-only endpoint
directly (e.g. `curl -X POST /api/users`) gets `403 Forbidden`, not just a
hidden button.

A `SUPER_ADMIN` can never remove the *last* active super admin (via
demotion, deactivation, or deletion) — that path returns `409 Conflict` — to
avoid locking the system out of its own admin. Deactivating a user or
resetting their password immediately invalidates all of that user's active
sessions.

---

## 4. Storage architecture

The database and the filesystem are two separate, independent stores:

- **Turso/libSQL (via Drizzle)** stores only *metadata*: `users`, `files`
  (original name, generated internal name, MIME type, size, uploader,
  timestamps), and `settings` (currently just the storage path).
- **The physical storage backend** (local disk or Vercel Blob — see below)
  stores the actual file bytes. **No binary content ever touches the
  database.**

File access is isolated behind a small interface
(`src/lib/storage/StorageService.ts`):

```ts
interface StorageService {
  upload(data, extension): Promise<{ storedName }>;
  download(storedName): Promise<ReadableStream>;
  delete(storedName): Promise<void>;
  exists(storedName): Promise<boolean>;
  getMetadata(storedName): Promise<{ size } | null>;
}
```

Every route handler and service talks to this interface, never to `fs` (or
any storage SDK) directly — swapping backends means writing one new class,
not touching upload/download/delete routes or the UI.

### Two backends, picked automatically

- **`LocalStorageProvider`** (`src/lib/storage/LocalStorageProvider.ts`) —
  writes to a configurable directory on local disk. Used for local
  development and any host with a persistent, writable filesystem (a VPS,
  a container with a mounted volume, etc).
- **`VercelBlobStorageProvider`** (`src/lib/storage/VercelBlobStorageProvider.ts`) —
  stores files in [Vercel Blob](https://vercel.com/docs/vercel-blob) as
  **private** objects. Required on Vercel: serverless functions have no
  persistent, shared local disk, so `LocalStorageProvider` cannot work
  there (see [Vercel deployment](#8-vercel-deployment)).

`getStorageProvider()` (`src/lib/storage/index.ts`) picks between them: set
`STORAGE_DRIVER=local` or `STORAGE_DRIVER=vercel-blob` explicitly, or leave
it unset to auto-detect — `vercel-blob` is used automatically whenever
`BLOB_READ_WRITE_TOKEN` or `BLOB_STORE_ID` is present (Vercel injects one or
the other once you connect a Blob store to the project — which one depends
on how it was connected; the `@vercel/blob` SDK handles either
transparently), `local` otherwise. Blobs are stored with
`access: "private"`, so — like local files — they're only ever reachable
through this app's own authenticated `/api/files/:id/download` route, never
via a directly guessable URL.

### Storage directory configuration and precedence (local driver only)

Configurable via **`/dashboard/settings/storage`** (super admin only), which:
- validates the path exists (or offers to create it),
- verifies the process can actually write to it (a real write-then-delete probe),
- and persists the choice to the database.

**Precedence:** a value saved in the database (via the settings page) always
wins over `FILE_STORAGE_PATH` from the environment. The environment variable
only supplies the *initial* default, applied by `npm run setup` the first
time. This means you can change the storage location at runtime without
redeploying, and it survives restarts (it is **not** an in-memory setting).

Changing the path only affects *new* uploads — existing files are not moved
automatically (the UI says so explicitly).

### Upload safety

- The physical filename is always server-generated
  (`crypto.randomUUID() + sanitized-extension`) — the browser-supplied
  filename is never used as a path component, only stored as display
  metadata (`originalName`).
- Every path used for storage is re-validated to stay inside the configured
  storage root (`resolveWithinRoot` in `LocalStorageProvider.ts`) before any
  filesystem call — defense in depth even though the generated name can't
  contain traversal sequences.
- MIME type is checked against an explicit allow-list
  (`src/lib/validation/schemas.ts`); size is checked against
  `MAX_FILE_SIZE_MB`.
- If writing the DB record fails after the file was written to disk, the
  file is deleted to avoid an orphaned upload; conversely, deleting a file
  whose physical copy is already missing still succeeds and removes the
  metadata row (surfaced in the UI/API instead of leaving a dangling
  reference).

---

## 5. Security notes

- **Passwords:** hashed with `bcryptjs` (12 salt rounds); the hash never
  leaves the server (`toPublicUser`/`toClientFile` strip it from every API
  response) and is never logged.
- **Sessions:** a random 256-bit token is stored in an `httpOnly`,
  `SameSite=Lax` cookie; only its SHA-256 hash is stored server-side
  (`src/lib/auth/session.ts`), so a database read alone can't be replayed as
  a session token.
- **Authorization:** centralized in `src/lib/auth/guards.ts`
  (`requireUser`/`requireSuperAdmin` for pages, `requireApiUser`/
  `requireApiSuperAdmin` for API routes) — there is exactly one place role
  checks happen, not one copy per route.
- **CSRF:** state-changing endpoints reject cross-site requests via an
  Origin/Host check (`src/lib/auth/csrf.ts`), on top of the `SameSite=Lax`
  cookie.
- **Brute-force protection:** failed logins are throttled per IP+email
  (`src/lib/auth/rateLimit.ts`); this is in-memory and per-instance — behind
  a load balancer with multiple app instances, replace it with a shared
  store (Redis, etc).
- **Path traversal:** the storage layer never trusts a client-supplied path
  — see [Upload safety](#upload-safety) above. Covered by tests in
  `tests/files.test.ts`.
- **SQL injection:** all queries go through Drizzle's parameterized query
  builder; there is no string-concatenated SQL anywhere in the app.
- **Error responses:** unexpected errors are logged server-side and return a
  generic `500` to the client (`src/lib/api/response.ts`) — stack traces,
  absolute filesystem paths, and DB internals are never sent to the browser.
- **Middleware (`src/proxy.ts`):** a lightweight, edge-safe check that only
  looks at cookie *presence* to redirect obviously-unauthenticated requests
  early. It is not the authorization boundary — every page and API route
  independently re-validates the session and role server-side, since a
  local libSQL file can't be queried from the edge runtime.

---

## 6. Project structure

```
src/
  app/
    login/                    Login page + form
    dashboard/
      page.tsx                Files view (all authenticated users)
      users/                  User management (SUPER_ADMIN only)
      settings/storage/       Storage configuration (SUPER_ADMIN only)
    api/                      Route handlers (auth, files, users, settings)
  components/
    ui/                       Button, Input, Toast, ConfirmDialog, Badge
    files/ users/ settings/   Feature-specific components
    layout/                   Sidebar, Topbar
  lib/
    auth/                     Sessions, password hashing, guards, rate limiting, CSRF
    db/                       Drizzle schema + client
    storage/                  StorageService interface + local FS provider + config
    validation/               Zod schemas
    api/                      Shared response/serialization helpers
  server/services/            Business logic (auth, users, files, settings)
  types/                      Client-facing DTO types
scripts/
  migrate.ts                  `npm run db:migrate`
  setup.ts                    `npm run setup` — see §1.2
drizzle/                      Generated SQL migrations (committed)
tests/                        Vitest suite (see §7)
```

---

## 7. Testing

```bash
npm test
```

Tests run against a disposable local SQLite file and a temp storage
directory (`tests/globalSetup.ts`), created fresh and torn down
automatically — they never touch `local.db` or `storage/uploads`. Coverage
includes:

- **Authentication:** valid/invalid login, inactive-account login, logout
  invalidating the session (`tests/auth.test.ts`).
- **Authorization:** regular users blocked from user-management and storage
  endpoints, super admins allowed, unauthenticated requests rejected
  (`tests/authorization.test.ts`).
- **Files:** upload → list → download → delete round-trip, oversized/
  disallowed-type rejection, missing-file 404, unauthenticated access
  rejected, and path-traversal attempts rejected at the storage layer
  (`tests/files.test.ts`).
- **Users:** super admin can create users, regular users cannot, duplicate
  emails rejected, passwords are stored hashed (never in plaintext), the
  last active super admin can't be demoted/deleted, and deactivating a user
  invalidates their sessions (`tests/users.test.ts`).

---

## 8. Linux deployment

The app has no Windows/macOS-specific assumptions:

- The storage path is fully configurable and resolved without assuming the
  working directory (`FILE_STORAGE_PATH` may be an absolute path like
  `/var/lib/file-manager/uploads`).
- All persistent state (sessions, settings, file metadata) lives in the
  database — nothing important is kept only in memory.
- No native/platform-specific commands are used.

Example production `.env.local` on a Linux host:

```env
TURSO_DATABASE_URL=libsql://file-manager-yourorg.turso.io
TURSO_AUTH_TOKEN=eyJ...
FILE_STORAGE_PATH=/var/lib/file-manager/uploads
MAX_FILE_SIZE_MB=200
```

Deployment steps:

```bash
sudo mkdir -p /var/lib/file-manager/uploads
sudo chown -R <service-user>:<service-user> /var/lib/file-manager
npm ci
npm run build
npm run db:migrate
npm run setup      # first deploy only — creates the initial super admin
npm run start      # or run under systemd/pm2, see below
```

The Node process needs read/write permission on
`FILE_STORAGE_PATH` (nothing more — it doesn't need root). Run it as a
dedicated non-root service user.

Behind Nginx, a minimal reverse proxy config:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

(`X-Forwarded-For` is what the login rate limiter keys on — without it,
every request appears to come from the proxy's own IP.)

Run the app itself under a process manager (systemd unit or `pm2 start npm
--name file-manager -- start`) so it restarts on crash/reboot.

---

## 9. Vercel deployment

Vercel's serverless functions have no persistent, shared local disk (only an
ephemeral `/tmp` that isn't shared across instances), so the two local-first
defaults from local dev need to change:

1. **Database:** must be a real hosted Turso database — a local `file:` URL
   has nowhere persistent to live on Vercel.
2. **File storage:** must use the `vercel-blob` driver (see
   [Storage architecture](#4-storage-architecture)) instead of local disk.

### One-time setup

```bash
# 1. Create the Turso database (see §2 above) and note its URL + token.

# 2. Create a Vercel Blob store and connect it to this project — this makes
#    Vercel inject blob credentials automatically at build/runtime, which
#    the app uses to auto-select the vercel-blob storage driver.
npx vercel link
npx vercel blob store add file-manager-uploads
# `store add` will ask (a) whether to link it to this project, then (b)
# which environments to connect it to via a checkbox prompt — both need a
# real interactive terminal (they don't work through a piped/non-TTY
# shell). If you'd rather not deal with that, create the store from the
# dashboard's Storage tab instead and click "Connect Project" there.

# 3. Run the DB migration + initial super admin creation against the real
#    Turso database from your machine (Vercel doesn't run one-off scripts):
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... \
INITIAL_ADMIN_EMAIL=admin@example.com INITIAL_ADMIN_PASSWORD=... \
npm run setup

# 4. Set the remaining environment variables in the Vercel project
#    (Project Settings → Environment Variables), or via the CLI:
npx vercel env add TURSO_DATABASE_URL
npx vercel env add TURSO_AUTH_TOKEN
npx vercel env add MAX_FILE_SIZE_MB

# 5. Deploy
npx vercel --prod
```

Blob credentials do **not** need to be set manually — Vercel provides them
automatically for any deployment with a connected Blob store (either as
`BLOB_READ_WRITE_TOKEN`, or as `BLOB_STORE_ID` plus a runtime
`VERCEL_OIDC_TOKEN`, depending on how the store was connected). `STORAGE_DRIVER`
also doesn't need to be set explicitly; it's only there as an override.

### Known platform constraints

- **Request body size:** Vercel enforces its own limit on serverless
  function request bodies, independent of `MAX_FILE_SIZE_MB`. Check your
  plan's current limit before assuming large uploads will work — very large
  files may need a different upload path (e.g. direct-to-Blob client
  uploads) that this app does not implement.
- **Storage settings page:** with the `vercel-blob` driver active,
  `/dashboard/settings/storage` shows a read-only notice instead of a path
  form — there's no local directory to configure, and Vercel manages the
  Blob store itself.
- **Rate limiting:** the login throttle (`src/lib/auth/rateLimit.ts`) is
  in-memory per function instance. On Vercel this means it resets on cold
  starts and isn't shared across concurrent instances — treat it as a
  best-effort mitigation, not a hard guarantee, in this environment.

---

## 10. API overview

All endpoints below require an authenticated session unless noted; those
marked **(admin)** additionally require `SUPER_ADMIN`.

```
POST   /api/auth/login              Log in
POST   /api/auth/logout             Log out

GET    /api/files                   List files
POST   /api/files/upload            Upload a file (multipart/form-data)
GET    /api/files/:id/download      Download a file
DELETE /api/files/:id               Delete a file

GET    /api/users                   List users            (admin)
POST   /api/users                   Create a user         (admin)
PATCH  /api/users/:id                Update a user         (admin)
DELETE /api/users/:id                Delete a user         (admin)

GET    /api/settings/storage        Read storage config    (admin)
PUT    /api/settings/storage        Update storage config  (admin)
```
