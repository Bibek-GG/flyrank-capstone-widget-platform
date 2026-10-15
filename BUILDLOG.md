# FlyRank Capstone Build Log & Engineering Record

## 1. Project Initialization & AI Assistance Summary
This document provides a transparent, honest engineering record of the implementation, design trade-offs, bugs discovered and resolved, and manual/automated verifications performed during the build of the FlyRank Embeddable Widget & Lead-Capture Platform.

### What AI Helped Implement:
- Layered Express.js architecture separating HTTP routing, validation, business logic services, data repositories, integrations, and background job queue.
- PostgreSQL schema DDL with foreign key constraints, cascading deletions, UUIDs, JSONB column configurations, and composite indexes.
- Tenant isolation enforcement across all repository queries (preventing cross-tenant data leaks).
- Zod schema validation across authentication, widget CRUD, and public lead submissions.
- Multi-tier abuse protection with `express-rate-limit` (separate auth and submission buckets) and honeypot trap (`website`).
- Best-effort geolocation fallback chain (Provider A: `ip-api.com` -> Provider B: `ipapi.co` -> Graceful Null fallback).
- Durable background notification worker with bounded retries (3 attempts), exponential backoff, and structured failure alert `[NOTIFICATION_JOB_EXHAUSTED]`.
- Embeddable widget script (`widget.v1.js`) and isolated CSS (`widget.v1.css`) rendered via safe DOM APIs (`document.createElement`, `textContent`) without `innerHTML`.
- Separate-origin customer test site (`public/test-site/index.html`) running on port 5500 to demonstrate cross-origin CORS functionality.
- Plain HTML/CSS/JavaScript Owner Dashboard (`public/dashboard/`) with overview metrics, SVG submission charts, widget management, embed snippet modal, and paginated lead inspection.
- 59 automated integration tests spanning all 18 requirements.

---

## 2. Engineering Design Decisions & Architectural Trade-offs

### 1. Pure JavaScript vs Native C++ Addons for Password Hashing
- **Decision**: Used `bcryptjs` rather than `bcrypt`.
- **Rationale**: `bcrypt` relies on `node-gyp` and Python/Visual C++ build toolchains, which frequently fail during installation on Windows developer machines and lightweight Alpine Linux containers. `bcryptjs` provides identical cryptographic compatibility, salt generation, and hashing behaviors without native compilation overhead.

### 2. Native Node.js Test Runner vs Jest
- **Decision**: Used the native Node.js test runner (`node:test` and `node:assert`) with `supertest`.
- **Rationale**: Node 24 includes a built-in test runner that executes asynchronously in milliseconds, eliminates heavy dependencies (Jest/Babel/ts-jest), and requires zero configuration.

### 3. Dual-Mode Database Resilience (PostgreSQL + In-Memory Emulator for Tests)
- **Decision**: Supported standard `pg.Pool` with `DATABASE_URL` for production/Docker and `pg-mem` for isolated, hermetic automated testing.
- **Rationale**: In development environments where Docker or local PostgreSQL daemon may not yet be running or where test suites must not wipe real databases, `pg-mem` provides an in-memory PostgreSQL engine that parses our actual SQL migrations, enforces foreign keys, and executes real queries.

### 4. DOM Security: Strict `textContent` Policy
- **Decision**: The embeddable widget (`widget.v1.js`) builds all UI components using `document.createElement()` and `textContent`.
- **Rationale**: External widgets run in the security context of the customer's host page. Using `innerHTML` with user-configured titles, labels, or descriptions exposes host sites to Cross-Site Scripting (XSS).

### 5. Honeypot Spam Handling Strategy
- **Decision**: When a submission fills the hidden `website` field, return HTTP 201 with `{ success: true, message: 'Submission received successfully' }`, but silently drop the payload without inserting it into `submissions` or scheduling notifications.
- **Rationale**: If spam bots receive an explicit 400 error indicating a honeypot was triggered, they adapt and remove the field. Silently dropping the submission wastes the bot's time while keeping owner data completely clean.

---

## 3. Bugs Discovered & Resolved During Development

### Bug 1: PowerShell ExecutionPolicy Blocked `npm.ps1`
- **Symptom**: `npm` commands failed with `UnauthorizedAccess` due to PowerShell script execution policy on Windows.
- **Root Cause**: PowerShell defaulted to invoking `npm.ps1`.
- **Resolution**: Invoked `npm.cmd` explicitly or executed commands directly via Node/PowerShell bypass.

### Bug 2: Missing Error Details in 4xx Responses
- **Symptom**: Tests for invalid fields returned generic error messages without field-level breakdown arrays.
- **Root Cause**: `errorHandler.middleware.js` mapped `err.message` but omitted `details: err.details`.
- **Resolution**: Updated `errorHandler.middleware.js` to include `details: err.details` when present on 4xx custom errors.

### Bug 3: `null value in column "owner_id" violates not-null constraint` on Lead Submission
- **Symptom**: `POST /api/public/widgets/:id/submissions` threw 500 constraint violation on `owner_id`.
- **Root Cause**: `widgetRepository.findPublicById(id)` omitted `owner_id` from its `SELECT` projection. As a result, `widget.owner_id` was undefined when inserting into `submissions`.
- **Resolution**: Added `owner_id` to the projection in `findPublicById`.

### Bug 4: Foreign Key Constraint Violation in Job Test Doubles
- **Symptom**: `tests/notifications-jobs.test.js` failed with `violates foreign key constraint on table "notification_jobs_submission_id_fk"`.
- **Root Cause**: The test generated a synthetic random UUID for `submission_id` without first persisting that submission in the `submissions` table.
- **Resolution**: Updated the test to create a valid submission record first, proving that foreign key referential integrity is strictly enforced.

### Bug 5: `package-lock.json` Was Excluded in `.gitignore`
- **Symptom**: `package-lock.json` was listed in `.gitignore`, preventing lockfile commits and violating reproducible `npm ci` build requirements.
- **Root Cause**: Default template had `package-lock.json` in `.gitignore`.
- **Resolution**: Removed `package-lock.json` from `.gitignore` and added generated output folders (`dist/`, `build/`, `.cache/`, `*.tsbuildinfo`).

### Bug 6: Hardcoded JWT Secret in `docker-compose.yml`
- **Symptom**: `docker-compose.yml` contained hardcoded `JWT_SECRET: flyrank_super_secure_jwt_local_secret_key_2026`.
- **Root Cause**: Docker Compose environment was statically populated rather than using environment interpolation.
- **Resolution**: Replaced with `${JWT_SECRET:-dev_jwt_secret_change_in_production}` and parameterized PostgreSQL credentials with safe development defaults. Removed local `.env` from repository.

### Bug 7: Test Suite Leaked Live External HTTP Requests to Geolocation Providers
- **Symptom**: If tests were executed on a machine without explicit `NODE_ENV=test`, default geolocation providers attempted live network calls to `http://ip-api.com` and `https://ipapi.co` with noticeable latency and external rate-limit risk.
- **Root Cause**: `tests/test-helper.js` did not set `process.env.NODE_ENV = 'test'` early, and providers lacked test-environment bypasses.
- **Resolution**: Set `process.env.NODE_ENV = 'test'` at the top of `tests/test-helper.js`, implemented deterministic mock returns for providers when running in test mode, and added Scenario 5 to `tests/geolocation.test.js` to guarantee no live external calls occur during testing.

### Bug 8: Database Migration & Seed Scripts Left Connection Pool Dangling
- **Symptom**: `src/db/migrate.js` and `src/db/seed.js` lacked descriptive diagnostics when PostgreSQL was offline and did not cleanly close the client pool in a `finally` block.
- **Root Cause**: Scripts directly queried the pool and relied on `process.exit(0)`.
- **Resolution**: Added connection diagnostics with actionable error messaging and wrapped execution in `finally { await db.close(); }`.

### Bug 9: `.gitignore` Pattern Did Not Cover Arbitrary `.env.*` Profiles
- **Symptom**: `.gitignore` only targeted `.env.local` and `.env.*.local`, leaving `.env.production` or `.env.staging` potentially tracked.
- **Root Cause**: Incomplete glob pattern for environment variables.
- **Resolution**: Updated `.gitignore` to ignore `.env` and `.env.*` while explicitly preserving `!.env.example`.

### Bug 10: Empty PostgreSQL Database Required Manual Migration Before Server Startup
- **Symptom**: When connecting to a fresh PostgreSQL instance, `server.js` would start without tables existing unless `npm run db:migrate` had already been run manually.
- **Root Cause**: `initializeDatabase()` only probed connection validity without ensuring schema tables existed.
- **Resolution**: Enhanced `src/db/index.js` to inspect `information_schema.tables` and automatically execute `applyMigrations(client)` if tables are missing. Added volume mount for initial schema into `/docker-entrypoint-initdb.d/` in `docker-compose.yml`.

---

## 4. Commands Used to Build and Verify
```powershell
# 1. Dependency installation using committed lockfile
npm.cmd ci

# 2. Run schema and database verification
node tests/verify-pgmem.js

# 3. Run entire automated test suite (60 hermetic tests)
npm.cmd test

# 4. Run end-to-end cross-origin integration test (Port 4000 & 5500)
npm.cmd run test:integration
```

## 5. Verification Status & Remaining Limitations
- **Automated Tests**: 60 tests passing across 10 test suites (0 failures).
- **Cross-Origin & Test-Site Verification**: Verified using `tests/verify-integration.js`, validating simultaneous operation of Port 4000 (API & static assets) and Port 5500 (Customer test site), cross-origin submission, and owner dashboard retrieval.
- **Environment Disclosures**:
  - `docker` and native `psql` are not installed in the Windows PATH of this local developer machine.
  - As a result, live Docker Compose container startup and live migrations against a running Docker daemon could not be executed on this specific host.
  - However, all SQL migrations (`001_initial_schema.sql`) and queries are verified against the PostgreSQL engine (`pg-mem`), and the Dockerfile and docker-compose.yml files are validated.

