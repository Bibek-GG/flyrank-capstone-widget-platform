# FlyRank Capstone Database Schema & Data Dictionary

### Entity Relationship Model

```
 +-------------------------------------------------------------------+
 |                              USERS                                |
 +-------------------------------------------------------------------+
 | id (PK, UUID)                                                     |
 | email (VARCHAR(255), UNIQUE, NOT NULL)                            |
 | password_hash (VARCHAR(255), NOT NULL)                            |
 | name (VARCHAR(100), NOT NULL)                                     |
 | created_at (TIMESTAMPTZ, DEFAULT NOW())                           |
 | updated_at (TIMESTAMPTZ, DEFAULT NOW())                           |
 +-------------------------------------------------------------------+
           | 1
           |
           | N
 +-------------------------------------------------------------------+
 |                             WIDGETS                               |
 +-------------------------------------------------------------------+
 | id (PK, UUID)                                                     |
 | owner_id (FK -> users.id, ON DELETE CASCADE)                      |
 | name (VARCHAR(150), NOT NULL)                                     |
 | type (VARCHAR(50), NOT NULL) [signup | contact | cta]             |
 | title (VARCHAR(200), NOT NULL)                                    |
 | description (TEXT)                                                |
 | button_text (VARCHAR(100), DEFAULT 'Submit')                      |
 | fields (JSONB, NOT NULL DEFAULT '[]')                             |
 | display_settings (JSONB, NOT NULL DEFAULT '{}')                   |
 | status (VARCHAR(20), DEFAULT 'enabled') [enabled | disabled]      |
 | created_at (TIMESTAMPTZ, DEFAULT NOW())                           |
 | updated_at (TIMESTAMPTZ, DEFAULT NOW())                           |
 +-------------------------------------------------------------------+
           | 1
           |
           | N
 +-------------------------------------------------------------------+
 |                           SUBMISSIONS                             |
 +-------------------------------------------------------------------+
 | id (PK, UUID)                                                     |
 | widget_id (FK -> widgets.id, ON DELETE CASCADE)                   |
 | owner_id (FK -> users.id, ON DELETE CASCADE)                      |
 | data (JSONB, NOT NULL)                                            |
 | client_ip (VARCHAR(45))                                           |
 | user_agent (TEXT)                                                 |
 | referer (TEXT)                                                    |
 | geolocation (JSONB, NULLABLE)                                     |
 | idempotency_key (VARCHAR(255), UNIQUE, NULLABLE)                  |
 | created_at (TIMESTAMPTZ, DEFAULT NOW())                           |
 +-------------------------------------------------------------------+
           | 1
           |
           | N
 +-------------------------------------------------------------------+
 |                        NOTIFICATION_JOBS                          |
 +-------------------------------------------------------------------+
 | id (PK, UUID)                                                     |
 | submission_id (FK -> submissions.id, ON DELETE CASCADE)           |
 | widget_id (FK -> widgets.id, ON DELETE CASCADE)                   |
 | owner_id (FK -> users.id, ON DELETE CASCADE)                      |
 | payload (JSONB, NOT NULL)                                         |
 | status (VARCHAR(30), DEFAULT 'pending')                           |
 | attempts (INT, DEFAULT 0)                                         |
 | max_attempts (INT, DEFAULT 3)                                     |
 | last_error (TEXT, NULLABLE)                                       |
 | next_run_at (TIMESTAMPTZ, DEFAULT NOW())                          |
 | created_at (TIMESTAMPTZ, DEFAULT NOW())                           |
 | updated_at (TIMESTAMPTZ, DEFAULT NOW())                           |
 +-------------------------------------------------------------------+

 +-------------------------------------------------------------------+
 |                       IDEMPOTENCY_RECORDS                         |
 +-------------------------------------------------------------------+
 | key (PK, VARCHAR(255))                                            |
 | widget_id (FK -> widgets.id, ON DELETE CASCADE)                   |
 | response_status (INT, NOT NULL)                                   |
 | response_body (JSONB, NOT NULL)                                   |
 | created_at (TIMESTAMPTZ, DEFAULT NOW())                           |
 | expires_at (TIMESTAMPTZ, NOT NULL)                                |
 +-------------------------------------------------------------------+
```

### Constraints & Indexes
- `idx_widgets_owner_id` ON `widgets(owner_id)`: Speeds up owner listing and tenant filtering.
- `idx_widgets_status` ON `widgets(status)`: Speeds up public widget availability check.
- `idx_submissions_widget_id` ON `submissions(widget_id)`: Speeds up per-widget filtering.
- `idx_submissions_owner_id` ON `submissions(owner_id)`: Enforces tenant-isolated dashboard aggregation.
- `idx_submissions_created_at` ON `submissions(created_at)`: Optimizes time-series analytics.
- `idx_jobs_status_next_run` ON `notification_jobs(status, next_run_at)`: Optimizes background job polling.
- `idx_idempotency_expires_at` ON `idempotency_records(expires_at)`: Optimizes cleanup of expired keys.
