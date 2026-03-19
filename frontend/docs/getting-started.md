# Getting Started

## Prerequisites

- Node.js 18+
- npm
- The backend API running (see backend repo)

---

## Install and Run

```bash
chmod +x dev.sh
./dev.sh
```

On first run, if no `.env` exists the script copies `.env.example` to `.env` and exits — edit the file and re-run.
The dev server starts on http://localhost:3000. API requests to `/api/v1/*` are proxied to `http://localhost:8000` automatically.

---

## Environment Variables

Copy `.env.example` to `.env` and set what you need:

```bash
cp .env.example .env
```

The only variable required in production is `REACT_APP_API_BASE_URL`. See [configuration.md](configuration.md) for the full reference.

---

## Dev Commands

```bash
./dev.sh              # start dev server (default)
./dev.sh build        # production build → build/
./dev.sh test         # run all tests once
./dev.sh typecheck    # tsc --noEmit
```

---

## Running Tests

```bash
./dev.sh test
```

Tests live in `__tests__/` folders co-located with the code they test.
All 18 test suites must pass before merging.

---

## Production Build

```bash
./dev.sh build
```

Outputs to `build/`. Serve as static files behind any web server or CDN.
Set `REACT_APP_API_BASE_URL` to the production backend URL before building.
