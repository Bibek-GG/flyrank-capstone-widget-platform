# FlyRank Capstone Architecture Design Document
## Embeddable Widget & Lead-Capture Platform

### 1. System Overview
The FlyRank Widget Platform is an enterprise-grade, multi-tenant embeddable widget and lead-capture platform. It enables business owners to design signup, contact, and call-to-action (CTA) widgets, embed them on external websites using a single script tag, and collect and analyze visitor submissions with tenant isolation, rate limiting, spam prevention, geolocation enrichment, and durable background notification jobs.

```mermaid
graph TD
    ClientSite["External Customer Website<br/>(Origin B: e.g. Port 5500)"] -->|"1. Embeds script<br/>&lt;script src='.../widget.v1.js'&gt;"| WidgetAsset["Versioned Widget Asset<br/>/widget.v1.js"]
    ClientSite -->|"2. Fetches public config<br/>GET /api/public/widgets/:id/config"| PublicAPI["Public API Route Layer<br/>Express.js + CORS"]
    ClientSite -->|"3. Submits Lead Form<br/>POST /api/public/widgets/:id/submissions"| SubmissionHandler["Submission Controller<br/>Validation + RateLimit + Honeypot"]
    
    subgraph FlyRank Platform Backend (Origin A: Port 4000)
        PublicAPI --> WidgetService["Widget Service"]
        SubmissionHandler --> SubmissionService["Submission Service"]
        SubmissionService --> GeoChain["Geolocation Fallback Chain<br/>(Provider A -> Provider B -> Fallback)"]
        SubmissionService --> PG[("PostgreSQL Database<br/>Users, Widgets, Submissions,<br/>Jobs, Idempotency")]
        SubmissionService --> JobQueue["Durable Notification Job Queue<br/>(PostgreSQL-backed)"]
        
        JobWorker["Background Job Worker<br/>(Retries, Backoff, Alerts)"] -->|"Pulls pending jobs"| JobQueue
        JobWorker -->|"Dispatches notification"| EmailAdapter["Notification Adapter<br/>(Console/Email/Webhook)"]

        DashboardAPI["Owner Dashboard API<br/>(JWT Authenticated + Tenant Isolation)"] --> DashboardService["Dashboard Service"]
        DashboardService --> PG
    end

    OwnerBrowser["Tenant Owner Dashboard UI<br/>(public/dashboard)"] -->|"Auth & Analytics"| DashboardAPI
```

### 2. Layered Architecture Principles
1. **HTTP / Routing Layer (`src/routes`, `src/controllers`)**:
   - Parses incoming HTTP requests, handles CORS, rate limiting, and parameter extraction.
   - Delegates all business logic to services.
   - Formats uniform JSON responses and safe HTTP status codes.
2. **Validation Layer (`src/validators`)**:
   - Validates inputs at runtime using Zod schemas.
   - Rejects malformed JSON, invalid IDs, missing required fields, and oversized payloads before hitting business logic.
3. **Business Logic Layer (`src/services`)**:
   - Implements authentication, tenant isolation rules, widget lifecycle, submission processing, and dashboard analytics.
   - Coordinates repository calls and external integrations.
4. **Data Access Layer (`src/repositories`, `src/db`)**:
   - Parameterized SQL queries against PostgreSQL.
   - Enforces strict tenant scoping (`owner_id`) in all data access.
   - Handles transactions and migrations.
5. **Job Processing Layer (`src/jobs`)**:
   - Durable job queue stored in PostgreSQL.
   - Asynchronous execution of non-critical side effects (email/webhook notifications) with bounded retry policy and alerts on failure exhaustion.
6. **Integration Layer (`src/integrations`)**:
   - Geolocation enrichment using fallback chain (Provider A: ip-api.com -> Provider B: ipapi.co -> Graceful Null).
   - Mocking & failure simulation toggles for deterministic automated testing.
