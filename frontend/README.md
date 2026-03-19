# Chat UI — Frontend

Generic streaming chat UI for the System Design Mentor backend.
Built with React 18 and TypeScript.

---

## Quick Start

```bash
chmod +x dev.sh
./dev.sh          # starts dev server on http://localhost:3000
```

On first run, if no `.env` exists it copies `.env.example` to `.env` and exits — edit the file then re-run.

---

## Configuration

All configuration is via `REACT_APP_*` environment variables.

```bash
cp .env.example .env
# edit .env as needed
```

The only variable required in production is `REACT_APP_API_BASE_URL`.
See [docs/configuration.md](docs/configuration.md) for the full reference.

---

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | Component tree, hooks, services, data flow |
| [Configuration](docs/configuration.md) | All `REACT_APP_*` variables and their defaults |
| [Getting Started](docs/getting-started.md) | Install, run, test, build |
| [Integration Guide](docs/integration-guide.md) | How to wire a different backend |

---

## Commands

```bash
./dev.sh              # start dev server (default)
./dev.sh build        # production build → build/
./dev.sh test         # run all tests once
./dev.sh typecheck    # tsc --noEmit
```
