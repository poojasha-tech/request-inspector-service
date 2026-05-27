# Request Inspector Service

  A self-hosted HTTP request inspector — a lightweight alternative to webhook.site or requestbin. Create a unique URL,
  point any webhook or HTTP client at it, and inspect every incoming request (headers, body, method, IP) through a small
  dashboard.


  ## Demo

  **Live at [https://poojadev.de](https://poojadev.de)** — click *Create new Endpoint*, then send a request to the URL it
  gives you to see it captured in real time.

  Try it from your terminal:
  ```bash
  curl -X POST https://poojadev.de/api/q/YOUR_SLUG_HERE \
    -H "Content-Type: application/json" \
    -d '{"hello":"world"}'
  ```

  ## Features

  - Generate a unique, cryptographically-signed inspection URL on demand
  - Capture HTTP requests on any method (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, etc.) at the generated URL
  - Persist captured request metadata (method, headers, body, IP, timestamp)
  - View captured requests through a simple dashboard
  - Accepts JSON, URL-encoded, and text payloads up to 10 MB
  - Multi-container architecture (API + UI), one-command spin-up with Docker Compose

  ## Tech Stack

  **Backend**
  - Node.js 20 + Express 5 (ES Modules)
  - Prisma ORM + SQLite (zero-config persistence)
  - `nanoid` for ID generation
  - `crypto.createHmac` + `crypto.timingSafeEqual` for signed, tamper-resistant slugs

  **Frontend**
  - Plain HTML + JavaScript dashboard (served via `serve`)

  **Infrastructure**
  - Two-service Docker Compose setup (api + frontend)
  - Independent Dockerfiles per service
  - Production: Nginx reverse proxy + Let's Encrypt TLS on AWS EC2

  ## How It Works

  ```
  +----------+   POST /api/endpoint    +-----+         +---------+
  |  Client  | ----------------------> | API | <-----> | SQLite  |
  +----------+ <- /q/{signed-id} ----- +-----+         +---------+
                                         ^
                                         |
  +----------+     ANY method            |
  | External | --------------------------+
  | webhook  |     to /api/q/{signed-id}
  +----------+
                                         |
  +----------+   GET /api/endpoint/      |
  | Dashboard| -- {slug}/request ------> +
  +----------+
  ```

  1. A client requests a new endpoint via `POST /api/endpoint`
  2. The API returns a unique URL: `/q/{nanoid}.{hmac-signature}`
  3. Any HTTP request to that URL is validated, stored, and acknowledged
  4. The dashboard lists all captured requests for a given slug

  ### Security: signed slugs

  Generated slugs are not just random — they're HMAC-signed. The signature is verified on every incoming request before
  anything is persisted, and the comparison uses `crypto.timingSafeEqual` to avoid leaking the signature byte-by-byte
  through timing attacks. This prevents an attacker from guessing or enumerating slugs to flood arbitrary inspection
  endpoints.

  ## API

  - Base URL (local): `http://localhost:3000/api`
  - Base URL (live): `https://poojadev.de/api`

  | Method | Endpoint                  | Description                                    |
  |--------|---------------------------|------------------------------------------------|
  | POST   | `/endpoint`               | Create a new inspection endpoint (returns URL) |
  | ANY    | `/q/:slug`                | Capture and store an incoming request          |
  | GET    | `/endpoint/:slug/request` | List all captured requests for a slug          |

  ### Response examples

  `POST /api/endpoint`
  ```json
  { "url": "/q/V1StGXR8_Z5jdHi6B-myT.a1b2c3" }
  ```

  `GET /api/endpoint/V1StGXR8_Z5jdHi6B-myT.a1b2c3/request`
  ```json
  {
    "requests": [
      {
        "id": "ckp...",
        "url": "V1StGXR8_Z5jdHi6B-myT.a1b2c3",
        "method": "POST",
        "ip": "::1",
        "headers": "{...}",
        "body": "{...}",
        "createdAt": "2026-04-17T10:00:00.000Z"
      }
    ]
  }
  ```

  ## Run Locally

  ### With Docker Compose (recommended)

  ```bash
  git clone https://github.com/poojasha-tech/request-inspector-service.git
  cd request-inspector-service
  docker compose up --build
  ```

  - API: http://localhost:3000 (bound to 127.0.0.1 — only reachable from this host)
  - Dashboard: http://localhost:8080

  ### Without Docker

  **Backend:**
  ```bash
  cd backend
  npm install
  npx prisma db push
  node app.js
  ```

  **Frontend (in a separate terminal):**
  ```bash
  cd frontend
  npx serve . -p 8080
  ```

  ## Production Deployment

  The live instance runs on AWS EC2 (Debian, arm64) with this topology:

  ```
  Internet → Nginx (TLS, ports 80/443)
              ├── /api/*  → backend container (127.0.0.1:3000)
              └── /*      → frontend container (127.0.0.1:8080)
  ```

  Key choices:

  - **Containers bound to `127.0.0.1`** — no app ports exposed to the public; Nginx is the only entry point.
  - **Nginx as a reverse proxy** — terminates TLS, routes `/api/*` to the backend, everything else to the dashboard.
  Same-origin, no CORS headaches.
  - **Let's Encrypt via Certbot** — automatic 90-day cert with auto-renewal.
  - **`restart: unless-stopped`** on each service — survives reboots and crashes, but respects manual stops.

  Deploy steps (after pointing DNS at the server):
  ```bash
  git clone git@github.com:poojasha-tech/request-inspector-service.git
  cd request-inspector-service
  docker compose up --build -d
  # Then install Nginx + Certbot and write a site config that proxies
  # /api/*  → 127.0.0.1:3000
  # /       → 127.0.0.1:8080
  sudo certbot --nginx -d yourdomain.com
  ```

  ## Configuration

  The backend reads these environment variables:

  | Variable       | Default                    | Description                                   |
  |----------------|----------------------------|-----------------------------------------------|
  | `PORT`         | `3000`                     | API port                                      |
  | `DATABASE_URL` | `file:./dev.db`            | Prisma connection string (SQLite path)        |
  | `SECRET_KEY`   | `default_super_secret_key` | HMAC signing key — **override in production** |

  ## What I learned building this

  - Designing tamper-resistant, URL-safe identifiers using HMAC + nanoid
  - Why timing-safe comparison matters when verifying signatures
  - Splitting a project into independently deployable Docker services
  - Using Prisma with SQLite for friction-free local development without giving up on schema migrations
  - Putting Nginx in front for TLS termination + path-based routing
  - The full chain of "make it reachable": DNS → cloud firewall → host → container

  ## What I'd improve next

  - [ ] Add WebSocket / SSE so the dashboard updates in real time as requests arrive
  - [ ] Add request retention / TTL so the DB doesn't grow unbounded
  - [ ] Pagination on the list endpoint
  - [ ] Switch SQLite to Postgres for multi-instance deployments
  - [ ] Add tests (Vitest + Supertest)
  - [ ] CI pipeline (GitHub Actions) for lint + test + image build
  - [ ] Auth so endpoints aren't world-readable
  - [x] Deploy to production (currently: AWS EC2 + Nginx + Let's Encrypt)

  ## License
  MIT
  READMEEOF
