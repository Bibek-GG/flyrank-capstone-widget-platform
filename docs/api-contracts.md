# FlyRank Capstone API Contracts Specification

### 1. Authentication Endpoints

#### `POST /api/auth/register`
- **Description**: Registers a new tenant owner account.
- **Rate Limit**: 15 requests per 15 minutes.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Responses**:
  - `201 Created`: `{ "user": { "id": "...", "name": "...", "email": "..." }, "token": "..." }`
  - `400 Bad Request`: Validation errors (e.g. invalid email, weak password).
  - `409 Conflict`: Email already registered.

#### `POST /api/auth/login`
- **Description**: Authenticates user and returns JWT.
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Responses**:
  - `200 OK`: `{ "user": { "id": "...", "name": "...", "email": "..." }, "token": "..." }`
  - `401 Unauthorized`: Invalid credentials.

---

### 2. Widget Management Endpoints (Owner Authenticated)
All routes require header: `Authorization: Bearer <JWT>`

#### `POST /api/widgets`
- **Description**: Creates a new widget for the authenticated user.
- **Request Body**:
  ```json
  {
    "name": "Newsletter Form",
    "type": "signup",
    "title": "Join our newsletter",
    "description": "Weekly engineering insights",
    "button_text": "Subscribe Now",
    "fields": [
      { "name": "email", "label": "Work Email", "type": "email", "required": true, "placeholder": "you@company.com" },
      { "name": "first_name", "label": "First Name", "type": "text", "required": false }
    ],
    "display_settings": {
      "theme": "dark",
      "primaryColor": "#6366f1",
      "borderRadius": "8px"
    },
    "status": "enabled"
  }
  ```
- **Responses**:
  - `201 Created`: `{ "widget": { ... } }`
  - `400 Bad Request`: Validation failure.

#### `GET /api/widgets`
- **Description**: Lists all widgets owned by the authenticated user.
- **Response**: `200 OK`: `{ "widgets": [ ... ] }`

#### `GET /api/widgets/:id`
- **Description**: Retrieves single widget (tenant-isolated).
- **Responses**:
  - `200 OK`: `{ "widget": { ... } }`
  - `404 Not Found`: Widget not found or not owned by user.

#### `PATCH /api/widgets/:id`
- **Description**: Updates an existing widget.
- **Responses**:
  - `200 OK`: `{ "widget": { ... } }`
  - `404 Not Found`: Not owned or missing.

#### `DELETE /api/widgets/:id`
- **Description**: Deletes a widget and its associated submissions/jobs.
- **Responses**:
  - `200 OK`: `{ "message": "Widget deleted successfully" }`
  - `404 Not Found`: Not owned or missing.

#### `GET /api/widgets/:id/embed`
- **Description**: Generates embed HTML snippet for external site.
- **Response**:
  - `200 OK`: `{ "widgetId": "...", "snippet": "<script src=\".../widget.v1.js\" data-widget-id=\"...\"></script>" }`

---

### 3. Public Endpoints (Cross-Origin Enabled)

#### `GET /api/public/widgets/:widgetId/config`
- **Description**: Fetches public widget configuration for the embed script.
- **Caching**: `Cache-Control: public, max-age=60, stale-while-revalidate=30`, ETag.
- **Responses**:
  - `200 OK`: `{ "id": "...", "type": "signup", "title": "...", "description": "...", "button_text": "...", "fields": [...], "display_settings": {...} }`
  - `404 Not Found`: Widget disabled or not found.

#### `POST /api/public/widgets/:widgetId/submissions`
- **Description**: Untrusted public lead submission endpoint.
- **Headers**:
  - `Content-Type: application/json`
  - `Idempotency-Key: <UUID/string>` (optional, persists idempotent responses)
- **Rate Limit**: 30 requests per minute per IP.
- **Payload**:
  ```json
  {
    "email": "lead@example.com",
    "first_name": "Alice",
    "website": ""
  }
  ```
- **Responses**:
  - `201 Created`: `{ "success": true, "submissionId": "...", "message": "Submission received successfully" }`
  - `400 Bad Request`: Field validation failure or malformed body.
  - `404 Not Found`: Widget does not exist or is disabled.
  - `413 Payload Too Large`: Request payload exceeds limits.
  - `429 Too Many Requests`: Rate limit exceeded.

---

### 4. Owner Dashboard Endpoints (Owner Authenticated)

#### `GET /api/dashboard/overview`
- **Response**:
  ```json
  {
    "stats": {
      "totalSubmissions": 142,
      "totalWidgets": 3,
      "activeWidgets": 3,
      "conversionTrend": [ { "date": "2026-10-10", "count": 12 }, ... ]
    }
  }
  ```

#### `GET /api/dashboard/submissions?page=1&limit=20&widgetId=...`
- **Response**:
  ```json
  {
    "submissions": [ ... ],
    "pagination": { "page": 1, "limit": 20, "total": 142, "totalPages": 8 }
  }
  ```

#### `GET /api/dashboard/widgets/:widgetId/stats`
- **Response**:
  ```json
  {
    "widgetId": "...",
    "totalSubmissions": 84,
    "geoBreakdown": [ { "country": "United States", "count": 52 }, ... ],
    "dailySubmissions": [ ... ]
  }
  ```
