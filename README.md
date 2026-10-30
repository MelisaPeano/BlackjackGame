# Real-Time Multiplayer Blackjack Platform

An event-driven, full-stack multiplayer card game engine built with FastAPI, WebSockets, MongoDB, Redis, and React 19. Designed with an authoritative game server architecture, domain-driven boundaries, asynchronous event distribution, and end-to-end security.

Live Deployment:
- Frontend: Hosted on Azure Static Web Apps
- Backend: Hosted on Azure App Service
- CI/CD: Automated via GitHub Actions

---

## Technical Highlights for Recruiters and Engineering Leads

This repository showcases production-ready software engineering principles across both backend distributed systems and frontend reactive interfaces:

- Authoritative Server Pattern: Clients act as thin presentation layers. All state transitions, random deck shuffling, dealer automated decisions, turn management, and win/loss evaluations occur exclusively on the server to prevent cheating or race conditions.
- Asynchronous Event-Driven Architecture: Decoupled message processing using an internal asynchronous EventBus backed by `asyncio.Queue`. Network sockets (WebSockets) are isolated from audit logging and secondary side-effects, guaranteeing sub-millisecond response times.
- Clean Architecture and Domain-Driven Design: Strict separation of concerns between core business logic (pure domain functions for Blackjack rules and user scoring), application orchestration services, WebSocket routing layers, and database persistence.
- Real-Time Networking: Low-latency bidirectional communication via WebSockets with strict JWT handshake validation, custom RFC 6455 close codes, session conflict resolution, and lobby-wide state broadcasting.
- High-Standard Testing Suite: Comprehensive test suite using Pytest and pytest-asyncio covering unit domain rules, security authentication, WebSocket handshakes, state machine transitions, and event bus consumers.
- Modern Reactive Frontend: Built with React 19, TypeScript, and Tailwind CSS. Implements reactive custom contexts, sound effects, error boundaries, and state synchronization with strict typing.
- Automated CI/CD and Cloud Native: Infrastructure-as-code workflows using GitHub Actions targeting Azure App Service (Python 3.12) and Azure Static Web Apps, backed by Docker and Nginx reverse proxy configurations.

---

## Tech Stack

### Backend
- Language: Python 3.12
- Web Framework: FastAPI (ASGI via Uvicorn)
- Real-Time Protocol: WebSockets (native ASGI connection handling)
- Data Persistence: MongoDB (Motor async driver / PyMongo)
- Caching and In-Memory Storage: Redis
- Authentication and Security: JWT (JSON Web Tokens via PyJWT), Bcrypt password hashing
- Validation and Data Serialization: Pydantic v2
- Testing: Pytest, Pytest-Asyncio, HTTPX

### Frontend
- Language: TypeScript 5+
- Core Framework: React 19
- Build Tool: Vite
- Styling: Tailwind CSS
- Icons: Lucide React
- Routing: React Router v7

### Infrastructure and DevOps
- Containerization: Docker, Docker Compose
- Reverse Proxy: Nginx (SSL/TLS termination ready)
- Cloud Platform: Azure App Service (Backend), Azure Static Web Apps (Frontend)
- CI/CD Pipelines: GitHub Actions

---

## System Architecture

```
+-------------------------------------------------------------------------+
|                              React 19 Client                            |
|             (Vite, TypeScript, Tailwind CSS, WebSockets)                |
+-------------------------------------------------------------------------+
                                    |
                    HTTPS / WSS     | Handshake & JSON frames
                                    v
+-------------------------------------------------------------------------+
|                               FastAPI API                               |
|   +-----------------------------------------------------------------+   |
|   |                      Security & Auth Layer                      |   |
|   |         (JWT Verification, Bcrypt, CORS, Input Guards)          |   |
|   +-----------------------------------------------------------------+   |
|   |  REST Endpoints (/api/auth)    |    WebSocket Handler (/ws)     |   |
|   +--------------------------------+--------------------------------+   |
|   |                     MessageRouter & Handlers                    |   |
|   +-----------------------------------------------------------------+   |
|   |            RoomManager & GameRoom State Machine                 |   |
|   |     (Authoritative Turns, Hit/Stand Logic, Dealer AI)           |   |
|   +-----------------------------------------------------------------+   |
|   |                 Asynchronous EventBus (Queue)                   |   |
|   +-----------------------------------------------------------------+   |
|                    |                                |                   |
|                    v                                v                   |
|        AuditService (Async Consumer)       ConnectionManager            |
+-------------------------------------------------------------------------+
            |                                       |
            v                                       v
+------------------------+             +------------------------+
|   MongoDB (Motor)      |             |   Redis                |
|  - Users & Profiles    |             |  - Session Store       |
|  - Match Audit Logs    |             |  - Rate Limiting Cache |
+------------------------+             +------------------------+
```

### Key Architectural Patterns

1. Authoritative Game Engine:
   Clients send intended actions (e.g., HIT, STAND, JOIN_ROOM, LEAVE_ROOM). The `GameRoom` evaluates the request against current turn pointers and player statuses. All random seed operations (deck generation and shuffling) are executed server-side.
2. In-Memory Asynchronous Broker:
   The `EventBus` uses non-blocking `put_nowait()` execution to ingest domain events (`user_login`, `game_started`, `round_ended`, `player_disconnected`). A dedicated background worker pulls items from `asyncio.Queue` and dispatches them to registered listeners (e.g., `AuditService`), ensuring database writes never stall active WebSocket loops.
3. Concurrency and Session Integrity:
   The `ConnectionManager` enforces a single active connection per authenticated username. Duplicate login attempts trigger custom WebSocket closures (code 4409) to preserve data integrity and prevent race conditions.
4. Pure Domain Modeling:
   The Blackjack business logic (`backend/app/domain/blackjack_rules.py`) is written as pure, dependency-free domain rules. Ace valuation (1 vs 11 dynamically calculated to maximize hand value without busting), Blackjack payout conditions, and the dealer soft-17 rule are isolated and unit-tested without framework dependencies.

---

## Database and Schema Design

### MongoDB Collections
- `users`: Stores user identity, bcrypt-hashed credentials, match history, win/loss counters, and player levels.
- `audit_logs`: Detailed event sourcing logs written asynchronously. Captures lifecycle events, player actions, game outcomes, timestamps, and connection drops for analytics and auditing.

### Indexing Strategy
- Unique index on `username` and `email` for rapid O(1) user lookups and duplicate prevention.
- Compound index on `(event_type, created_at)` within `audit_logs` for optimized analytical querying and administrative reviews.

---

## Security and Reliability

- Stateless Token Authentication: JSON Web Tokens (JWT) with configurable expiration (`ACCESS_TOKEN_EXPIRE_MINUTES`). WebSocket connections require query parameter tokens evaluated before HTTP upgrade completion.
- Custom RFC 6455 Disconnect Codes:
  - `4401`: Unauthorized / Expired Token.
  - `4409`: Conflict / User already connected in another session.
- Graceful Teardown: FastAPI lifespan management guarantees that pending event queues are flushed, database connections are cleanly severed, and background workers are cancelled without hanging processes.
- Resilient Disconnection Handling: If a player disconnects during an active round, the room manager registers the departure, re-evaluates the round, awards the victory to the remaining player, and releases room resources.

---

## Project Structure

```
.
|-- .github/workflows/          # GitHub Actions deployment pipelines
|   |-- azure-static-web-apps.yml # CI/CD for React Frontend
|   `-- main_blackjackgame.yml    # CI/CD for FastAPI Backend
|-- backend/
|   |-- app/
|   |   |-- api/                # REST endpoints and WebSocket routes
|   |   |   |-- auth.py         # Login, Registration, Token Refresh
|   |   |   `-- ws.py           # WebSocket lifecycle and packet router
|   |   |-- core/               # Infrastructure layer
|   |   |   |-- config.py       # Pydantic BaseSettings environment config
|   |   |   |-- database.py     # Motor / PyMongo asynchronous database client
|   |   |   |-- errors.py       # Custom typed domain exceptions
|   |   |   |-- event_bus.py    # Non-blocking async event bus with worker queue
|   |   |   |-- events.py       # Strongly typed event schemas
|   |   |   `-- security.py     # Password hashing and JWT generation
|   |   |-- domain/             # Framework-agnostic pure business logic
|   |   |   |-- blackjack_rules.py # Scoring, soft/hard Aces, win condition rules
|   |   |   `-- user_logic.py   # User stats and progression calculations
|   |   |-- models/             # Domain models, enums, and message envelopes
|   |   `-- services/           # Application orchestration
|   |       |-- audit_service.py      # Async event handler logging to MongoDB
|   |       |-- connection_manager.py # Active WebSocket connection registry
|   |       |-- game_room.py          # State machine for 2-player Blackjack room
|   |       |-- message_router.py     # Dispatches incoming WebSocket messages
|   |       |-- room_manager.py       # Matchmaking and room allocation
|   |       `-- user_service.py       # User repository and business workflow
|   |-- nginx/                  # Production Nginx reverse-proxy configuration
|   |-- tests/                  # Pytest automated test suite
|   |-- Dockerfile              # Backend container image
|   |-- requirements.txt        # Python production dependencies
|   `-- startup.sh              # Production startup script
|-- frontend/
|   |-- src/
|   |   |-- components/         # Blackjack table, scoreboard, dashboard, auth forms
|   |   |-- context/            # React Auth and WebSocket providers
|   |   |-- hooks/              # Custom hooks for game state and audio
|   |   |-- App.tsx             # Application root
|   |   `-- main.tsx            # React DOM mounting
|   |-- package.json            # Node.js dependencies and scripts
|   |-- vite.config.ts          # Vite build configuration
|   `-- tailwind.config.js      # Tailwind CSS styling setup
`-- docker-compose.yml          # Local multi-container development environment
```

---

## Local Development and Setup

### Prerequisites
- Python 3.12 or higher
- Node.js 20 or higher
- Docker and Docker Compose (recommended for local databases)

### Option 1: Running with Docker Compose (Recommended)

1. Start all backend services including MongoDB and Redis:
   ```bash
   docker-compose up --build
   ```

2. The services will start on:
   - Backend API: `http://localhost:8000`
   - MongoDB: `localhost:27017`
   - Redis: `localhost:6379`

### Option 2: Manual Local Setup

#### Backend Setup

1. Navigate to the backend directory and set up a virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Configure environment variables in `backend/.env`:
   ```env
   SECRET_KEY=your-secure-secret-key
   MONGODB_URI=mongodb://localhost:27017
   DATABASE_NAME=blackjack_db
   REDIS_URL=redis://localhost:6379
   CORS_ORIGINS=http://localhost:5173,http://localhost:3000
   ```

3. Launch the development server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```

2. Configure frontend environment variables in `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_WS_URL=ws://localhost:8000/ws
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

## Testing

The project maintains high test coverage across core domain logic, security routines, and asynchronous service interactions.

Execute tests using pytest from the backend directory:

```bash
cd backend
pytest -v
```

Test coverage includes:
- `test_domain_blackjack_rules.py`: Card values, Ace soft/hard scoring, Bust evaluation, and Blackjack rules.
- `test_game_room.py`: 2-player turn progression, dealer automatic draws (<= 16 hit, >= 17 stand), and resolution logic.
- `test_event_bus.py`: Asynchronous event queueing, non-blocking publishing, and worker task completion.
- `test_event_driven_game.py`: Event flow from room completion to audit trail recording.
- `test_auth_api.py` and `test_security.py`: Password hashing, JWT encoding/decoding, expiration, and payload validations.
- `test_ws_auth.py`: WebSocket handshake validation, token extraction, and unauthorized connection rejections.

---

## Deployment Architecture

- Backend Deployment: Continuously deployed to Azure App Service via GitHub Actions (`main_blackjackgame.yml`). Configured with Gunicorn/Uvicorn workers, automatic restart policies, and environment secret injection.
- Frontend Deployment: Continuously built and deployed to Azure Static Web Apps via GitHub Actions (`azure-static-web-apps-*.yml`), providing global CDN distribution and optimized asset caching.
- Network Routing: Reverse-proxy ready with Nginx support for custom SSL termination and WebSocket connection upgrades via `Upgrade` and `Connection` HTTP headers.

