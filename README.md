# DemoBench Codespace

A unified GitHub Codespace that bundles multiple demo and integration-testing services — APIs, streaming servers, AI tools, security services, and observability platforms — all orchestrated from a single dashboard.

[![Open in GitHub Codespaces](https://codespaces.new/lbrenman/demobench-codespace/badge.svg)](https://codespaces.new/lbrenman/demobench-codespace)

---

## Table of Contents

- [Quick Start](#quick-start)
- [Services](#services)
- [Dashboard](#dashboard)
- [Starting and Stopping Services](#starting-and-stopping-services)
- [Environment Variables](#environment-variables)
- [Data Persistence](#data-persistence)
- [Service Dependencies](#service-dependencies)
- [Special Setup: SFTP](#special-setup-sftp)
- [Special Setup: FHIR Web App](#special-setup-fhir-web-app)
- [Adding a New Service](#adding-a-new-service)
- [Architecture](#architecture)

---

## Quick Start

### 1. Open in GitHub Codespaces

Click the badge above, or go to **Code → Codespaces → New codespace on main**.

The Codespace will automatically:
- Install Node.js dependencies for the dashboard and all Node.js services
- Copy `.env.example` → `.env` with safe defaults
- Create persistent data directories
- Start **core services** (PostgreSQL, Dashboard, Portainer)

### 2. Configure your `.env`

The `.env` file is pre-populated with safe defaults. You only need to edit it if you want to:
- Change auth tokens/API keys from defaults
- Add **required secrets** for optional services (LiteLLM, New Relic, SFTP)

```bash
# The file was already created for you. Open it to review:
code .env
```

Key variables that need real values for certain services:

| Variable | Service | Notes |
|----------|---------|-------|
| `OPENAI_API_KEY` | LiteLLM, Open WebUI | At least one LLM key required |
| `ANTHROPIC_API_KEY` | LiteLLM, Open WebUI | At least one LLM key required |
| `NEW_RELIC_LICENSE_KEY` | New Relic OTel | Starts with `NRAK-` |
| `NGROK_AUTHTOKEN` | SFTP | Required for external SFTP access |
| `FHIR_WEB_API_BASE_URL` | FHIR Web App | Set to forwarded port 3001 URL in Codespaces |

### 3. Start services

```bash
# Start everything
docker compose --profile all up -d

# Or start specific profiles
docker compose --profile core --profile apis up -d
docker compose --profile sse up -d
```

### 4. Open the Dashboard

The dashboard auto-opens at port **4500** when the Codespace starts.

Navigate to it in the **Ports** tab or open: `http://localhost:4500`

---

## Services

<!-- SERVICE_TABLE_START -->
| Service | ID | Category | Profile | Port | Required Secrets | Depends On | Source |
|---------|-----|----------|---------|------|-----------------|------------|--------|
| **LiteLLM Proxy** | `litellm` | AI | `ai` | `4000` | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | — | [source](https://github.com/lbrenman/litellm-codespace) |
| **Open WebUI** | `open-webui` | AI | `ai` | `8081` | `LITELLM_MASTER_KEY` | litellm | [source](https://github.com/lbrenman/open-webui-codespace) |
| **FHIR R4 API** | `fhir-api` | APIs | `apis` | `3001` | — | — | [source](https://github.com/lbrenman/fhir-r4-api-codepsace) |
| **FHIR R4 Web App** | `fhir-web` | APIs | `apis` | `3002` | — | fhir-api | [source](https://github.com/lbrenman/fhir-r4-web-codespace) |
| **Multi-API Mock Server** | `multi-api-mock` | APIs | `apis` | `3000` | — | — | [source](https://github.com/lbrenman/multi-api-mock-server) |
| **SFTP Server** | `sftp` | Infra | `sftp` | `3022` | `NGROK_AUTHTOKEN` | — | [source](https://github.com/lbrenman/sftp-codespace) |
| **Jaeger Tracing** | `jaeger` | Observability | `observability` | `16686` | — | — | [source](https://github.com/lbrenman/jaeger-codespace) |
| **New Relic OTel Collector** | `new-relic-otel` | Observability | `observability` | `4318` | `NEW_RELIC_LICENSE_KEY` | — | [source](https://github.com/lbrenman/New-Relic-OTel-Collector-CodeSpace) |
| **Keycloak** | `keycloak` | Security | `security` | `8080` | — | — | [source](https://github.com/lbrenman/keycloak-dev-codespace) |
| **MS Presidio** | `presidio` | Security | `security` | `5002` | — | — | [source](https://github.com/lbrenman/presidio-codespaces) |
| **Metric SSE Server** | `metric-sse` | Streaming | `sse` | `3003` | — | — | [source](https://github.com/lbrenman/nodejs-express-sse-mock-metrics-server-codespace) |
| **US Railway Mock SSE Server** | `railway-sse` | Streaming | `sse` | `3004` | — | — | [source](https://github.com/lbrenman/NodeJSExpress-US-Railway-Mock-SSE-Server-for-CodeSpace) |
<!-- SERVICE_TABLE_END -->

> **Note:** The table above is auto-generated from `services/*/service.json` manifests.
> After adding or editing a service manifest, run `npm run docs` to regenerate it.

---

## Dashboard

The DemoBench Dashboard at **port 4500** provides:

- **Service cards** — status, health, missing secrets, dependency warnings
- **Start / Stop / Restart** controls for each service
- **Live log viewer** — tail logs for any running container
- **Auto-refresh** every 10 seconds
- **Portainer** at port 9000 for full Docker management

The dashboard auto-discovers services from `services/*/service.json` — no code changes needed when you add new services.

---

## Starting and Stopping Services

### Profiles

Each service belongs to a profile. Use `--profile` flags to start groups:

| Profile | Services |
|---------|----------|
| `core` | PostgreSQL, Dashboard, Portainer |
| `apis` | Multi-API Mock, FHIR API, FHIR Web |
| `sse` | Metric SSE, Railway SSE |
| `ai` | LiteLLM, Open WebUI |
| `security` | Presidio (3 containers), Keycloak |
| `observability` | Jaeger, New Relic OTel Collector |
| `sftp` | SFTP Server |
| `all` | Everything |

### Common commands

```bash
# Start all services
docker compose --profile all up -d

# Start only APIs
docker compose --profile core --profile apis up -d

# Start multiple profiles
docker compose --profile core --profile apis --profile sse up -d

# Stop a specific service
docker compose stop fhir-api

# Restart a specific service
docker compose restart multi-api-mock

# Stop an entire profile (stops and removes containers)
docker compose --profile apis down

# Stop everything
docker compose --profile all down

# View logs for a service
docker compose logs -f fhir-api

# View last 100 lines
docker compose logs --tail=100 keycloak
```

### Starting a single service without its full profile

You can start any service directly — just make sure its dependencies are running:

```bash
# Start postgres first (if not already running)
docker compose up -d postgres

# Then start just the FHIR API
docker compose up -d fhir-api
```

---

## Environment Variables

All configuration lives in `.env` (copied from `.env.example` on first run).

```bash
# Copy and edit
cp .env.example .env
code .env
```

Variables follow a `<SERVICE>_<SETTING>` naming convention, e.g.:
- `MOCK_API_AUTH_MODE` — auth mode for the multi-api-mock service
- `FHIR_API_KEY` — API key for the FHIR API
- `LITELLM_MASTER_KEY` — master key for the LiteLLM proxy

See `.env.example` for the full list with inline documentation.

---

## Data Persistence

All persistent data is stored in `./data/` (gitignored) using Docker bind mounts:

| Path | Contents |
|------|----------|
| `./data/postgres/` | Shared PostgreSQL data (mock API, FHIR, dashboard logs) |
| `./data/keycloak-postgres/` | Keycloak's dedicated PostgreSQL data |
| `./services/litellm/data/` | LiteLLM SQLite database |
| `./services/open-webui/data/` | Open WebUI SQLite database and uploads |
| `./services/sftp/upload/` | SFTP uploaded files |
| `./services/keycloak/imports/` | Keycloak realm JSON files (auto-imported on start) |

Data survives Codespace **stop/start** cycles. It is lost only if the Codespace is **deleted** or **rebuilt**.

### Resetting data

```bash
# Reset and re-seed a specific service
docker compose exec multi-api-mock npm run seed:clear

# Reset all Node.js service data
docker compose exec fhir-api npm run seed:clear
docker compose exec multi-api-mock npm run seed:clear

# Nuclear reset (removes ALL postgres data)
docker compose --profile all down
rm -rf data/postgres data/keycloak-postgres
docker compose --profile core up -d
```

---

## Service Dependencies

Some services depend on others being reachable. The dashboard will warn you when a dependency is not running:

| Service | Requires |
|---------|----------|
| **FHIR Web App** | fhir-api must be running |
| **Open WebUI** | Works best with litellm running |
| **Multi-API Mock** | PostgreSQL |
| **FHIR API** | PostgreSQL |
| **Keycloak** | keycloak-db (auto-started with the `security` profile) |

---

## Special Setup: SFTP

GitHub Codespaces only forward **HTTP** ports. SFTP uses raw TCP (SSH), which cannot be forwarded directly. To expose the SFTP server to external clients, use ngrok:

```bash
# 1. Start the SFTP service
docker compose --profile sftp up -d

# 2. Install ngrok (one-time)
sudo apt-get update -y && sudo apt-get install -y wget unzip
wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.zip
unzip -o ngrok-v3-stable-linux-amd64.zip

# 3. Authenticate ngrok (requires free account at ngrok.com)
./ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>

# 4. Create TCP tunnel
./ngrok tcp 3022
# Output: Forwarding tcp://0.tcp.ngrok.io:12326 -> localhost:3022

# 5. Connect from external client
sftp -P 12326 foo@0.tcp.ngrok.io
# Password: pass
```

For local access (within the Codespace), ngrok is not needed:
```bash
sftp -P 3022 foo@localhost
# Password: pass
```

---

## Special Setup: FHIR Web App

The FHIR Web App runs in the **browser** and makes API calls directly to the FHIR API. In Codespaces, the browser cannot reach `localhost:3001` — it must use the publicly forwarded URL.

**Steps:**

1. Start the apis profile: `docker compose --profile core --profile apis up -d`
2. In the **Ports** tab, find port `3001` (FHIR API)
3. Right-click → **Port Visibility → Public**
4. Copy the forwarded URL (e.g. `https://your-codespace-3001.preview.app.github.dev`)
5. Edit `.env`:
   ```
   FHIR_WEB_API_BASE_URL=https://your-codespace-3001.preview.app.github.dev
   ```
6. Restart the FHIR Web service:
   ```bash
   docker compose restart fhir-web
   ```

---

## Adding a New Service

Adding a new service requires touching exactly **4 things**:

### 1. Create `services/<your-service>/service.json`

This is the single source of truth for your service's metadata. The dashboard auto-discovers it.

```json
{
  "id": "my-new-service",
  "name": "My New Service",
  "description": "Short description shown in the dashboard.",
  "profile": "apis",
  "composeService": "my-new-service",
  "port": 3005,
  "healthPath": "/health",
  "uiPath": "/",
  "category": "APIs",
  "dependsOn": [],
  "requiredSecrets": [],
  "tags": ["rest", "mock"],
  "docsUrl": "https://github.com/you/your-repo",
  "notes": null
}
```

**Field reference:**

| Field | Required | Description |
|-------|----------|-------------|
| `id` | ✅ | Unique ID — matches the folder name |
| `name` | ✅ | Display name in the dashboard |
| `description` | ✅ | Short description shown on the service card |
| `profile` | ✅ | Docker Compose profile that starts this service |
| `composeService` | ✅ | Docker Compose service name (usually same as `id`) |
| `port` | ✅ | Primary HTTP port |
| `healthPath` | ✅ | HTTP path for health polling (`null` to skip) |
| `uiPath` | — | Path opened when user clicks "Open" in dashboard |
| `category` | ✅ | Dashboard grouping: `APIs`, `AI`, `Security`, `Observability`, `Streaming`, `Infra` |
| `dependsOn` | — | Array of `id`s — dashboard warns if deps aren't running |
| `requiredSecrets` | — | Env var names — dashboard flags if missing from `.env` |
| `tags` | — | Array of tags shown on the card |
| `docsUrl` | — | Link to source repo or docs |
| `notes` | — | Freeform callout shown on the card (yellow warning box) |

### 2. Add your service to `docker-compose.yml`

Add one service block with the matching profile:

```yaml
  my-new-service:
    build:
      context: ./services/my-new-service
      dockerfile: Dockerfile
    profiles: [apis, all]          # must include 'all'
    restart: unless-stopped
    environment:
      PORT: ${MY_SERVICE_PORT:-3005}
    ports:
      - "${MY_SERVICE_PORT:-3005}:3005"
    networks: [demobench]
```

### 3. Add env vars to `.env.example`

```bash
# -----------------------------------------------------------------------------
# My New Service
# Port: 3005
# -----------------------------------------------------------------------------
MY_SERVICE_PORT=3005
MY_SERVICE_API_KEY=changeme
```

Then copy to `.env`:
```bash
# Merge new vars into your .env (or just re-copy and re-fill)
grep "MY_SERVICE" .env.example >> .env
```

### 4. Regenerate the README service table

```bash
npm run docs
```

This reads all `service.json` files and updates the service table in this README automatically.

### That's it

The dashboard will show your new service on the next page refresh (or within 10 seconds via auto-refresh). No dashboard code changes are needed.

---

## Architecture

```
demobench-codespace/
├── .devcontainer/
│   ├── devcontainer.json       # Single devcontainer config
│   ├── post-create.sh          # Runs once on Codespace creation
│   └── post-start.sh           # Runs on every Codespace resume
│
├── services/                   # One folder per service
│   ├── multi-api-mock/
│   │   ├── service.json        ← manifest (auto-discovered by dashboard)
│   │   ├── Dockerfile
│   │   └── src/...
│   ├── fhir-api/
│   ├── fhir-web/
│   ├── metric-sse/
│   ├── railway-sse/
│   ├── litellm/
│   │   └── config/
│   │       └── litellm_config.yaml
│   ├── open-webui/
│   ├── presidio/
│   ├── keycloak/
│   │   └── imports/            # Drop realm JSON files here
│   ├── jaeger/
│   ├── new-relic-otel/
│   │   └── otel-collector-config.yaml
│   └── sftp/
│
├── dashboard/                  # Node.js + React orchestrator
│   ├── src/
│   │   ├── server.js           # Express backend
│   │   ├── lib/
│   │   │   ├── manifest.js     # Auto-discovers service.json files
│   │   │   ├── docker.js       # Dockerode wrapper
│   │   │   ├── health.js       # HTTP health checker
│   │   │   └── db.js           # Activity log (PostgreSQL)
│   │   └── routes/
│   │       ├── services.js     # GET/POST service control
│   │       ├── containers.js   # Docker container list
│   │       ├── logs.js         # Log streaming (SSE)
│   │       └── activity.js     # Activity history
│   └── client/                 # React frontend (Vite)
│       └── src/
│           └── App.jsx
│
├── scripts/
│   ├── postgres-init.sql       # Schema setup on first postgres start
│   └── generate-docs.js        # Regenerates README service table
│
├── data/                       # Gitignored persistent data
│   ├── postgres/
│   └── keycloak-postgres/
│
├── docker-compose.yml          # All services with profiles
├── .env.example                # All env vars with defaults
├── .env                        # Your local config (gitignored)
├── .gitignore
├── package.json                # Root package (npm run docs)
└── README.md
```

### Design Principles

- **Single `docker-compose.yml`** — all services, hand-edited, profiles for selective startup
- **`service.json` manifests** — dashboard, health checks, dependency warnings, and the README table are all driven by these files
- **One PostgreSQL instance** with schemas per service (`mock_api`, `fhir`, `dashboard_logs`); Keycloak gets a dedicated container because it requires its own database
- **No source code duplication** — each service folder contains the complete, runnable source
- **Env vars everywhere** — all ports, credentials, and feature flags are in `.env` with safe defaults, so `cp .env.example .env` is sufficient to run without editing anything

### Port Allocation

| Port | Service |
|------|---------|
| 3000 | Multi-API Mock |
| 3001 | FHIR API |
| 3002 | FHIR Web |
| 3003 | Metric SSE |
| 3004 | Railway SSE |
| 3022 | SFTP |
| 4000 | LiteLLM |
| 4317 | New Relic OTel (gRPC) |
| 4318 | New Relic OTel (HTTP) |
| 4500 | Dashboard |
| 5001 | Presidio Anonymizer |
| 5002 | Presidio Analyzer |
| 5003 | Presidio Image Redactor |
| 5432 | PostgreSQL |
| 8080 | Keycloak |
| 8081 | Open WebUI |
| 9000 | Portainer |
| 13133 | OTel Collector Health |
| 16686 | Jaeger UI |
| 14250 | Jaeger gRPC |
| 14268 | Jaeger HTTP |
