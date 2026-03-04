# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

DO NOT GIVE ME HIGH LEVEL SHIT, IF I ASK FOR FIX OR EXPLANATION, I WANT ACTUAL CODE OR EXPLANATION!!! I DON'T WANT "Here's how you can blablabla"

- 檔案刪除功能，只限制在專案管理專案資料夾內。
- 本機是mac os系統進行開發，開發時需提高通用性，同時考慮不同系統之間的泛用性。
- Always response in Traditional Chinese
- Be casual unless otherwise specified
- Be terse
- Suggest solutions that I didn't think about—anticipate my needs
- Treat me as an expert
- Be accurate and thorough
- Give the answer immediately. Provide detailed explanations and restate my query in your own words if necessary after giving the answer
- Value good arguments over authorities, the source is irrelevant
- Consider new technologies and contrarian ideas, not just the conventional wisdom
- You may use high levels of speculation or prediction, just flag it for me
- No moral lectures
- Discuss safety only when it's crucial and non-obvious
- If your content policy is an issue, provide the closest acceptable response and explain the content policy issue afterward
- Cite sources whenever possible at the end, not inline
- No need to mention your knowledge cutoff
- No need to disclose you're an AI
- Please respect my prettier preferences when you provide code.
- Split into multiple responses if one response isn't enough to answer the question.
- Does not use emoji to design UI

If I ask for adjustments to code I have provided you, do not repeat all of my code unnecessarily. Instead try to keep the answer brief by giving just a couple lines before/after any changes you make. Multiple code blocks are ok.

## Project Overview

LLRWD DigitalTwin Platform — a web-based 3D geological visualization system for low-level radioactive waste disposal site analysis. Visualizes boreholes, 3D geology models, terrain/DEM, satellite imagery, fault structures, geophysics surveys, and groundwater surfaces using WebGL.

## Development Commands

```bash
# Frontend (from project root)
npm run dev          # Vite dev server on :5173
npm run build        # tsc && vite build
npm run preview      # Preview production build

# Backend (from server/)
cd server
npm run dev          # nodemon + ts-node on :3001
npm run start        # ts-node index.ts (production)

# Database
docker start llrwd-postgres                    # PostgreSQL on port 5433
cd server && npx prisma db push                # Sync schema to DB
cd server && npx prisma generate               # Regenerate Prisma client
cd server && npx prisma studio                 # DB admin UI

# Python processing (from server/)
source venv/bin/activate                       # Activate Python venv
pip install pyvista numpy trimesh rasterio scipy Pillow pandas
```

No test suite is configured yet.

## Architecture

```
Frontend (React 19 + Vite 7)  →  API proxy (/api, /uploads)  →  Backend (Express 5 + Prisma 7)
     ↓                                                              ↓              ↓
Three.js / R3F / Zustand                                      PostgreSQL    Python scripts
```

**Frontend** (`src/`): React 19, TypeScript 5.9, Three.js 0.182 + React Three Fiber 9.5, Zustand 5 for state, ECharts for charts, Lucide icons. Path alias `@/*` → `src/*`.

**Backend** (`server/`): Express 5.2, TypeScript (CommonJS), Prisma 7 ORM with PostgreSQL (port 5433, DB name `llrwddb`). Multer for uploads, Sharp for image processing, JWT auth.

**Python scripts** (`server/scripts/`): Heavy computation offloaded via `child_process.spawn`:

- `geology_mesh_builder.py` — Voxel CSV → GLB mesh (Marching Cubes isosurface via PyVista)
- `terrain_processor.py` — GeoTIFF/CSV → 16-bit heightmap PNG + hillshade + satellite fusion
- `water_level_processor.py` — CSV/DAT/TXT → interpolated heightmap (SciPy griddata)

## Key Architecture Patterns

### State Management

~15 Zustand stores in `src/stores/`, one per domain (boreholeStore, layerStore, terrainStore, etc.). Each follows the pattern: state fields + async action methods. Layer visibility persisted to localStorage.

### 3D Rendering

- **InstancedMesh** for 800+ boreholes (single draw call)
- **LOD** switching by camera distance (icon → column chart → detailed texture), configured in `src/config/three.ts`
- **Clipping Plane** for real-time cross-sections synced to terrain bounds
- Logarithmic depth buffer to prevent z-fighting

### Coordinate System

TWD97 (Taiwan local, meters). Each project has configurable origin (originX/originY) and northAngle. Conversion utilities in `src/utils/coordinates.ts`.

### Multi-Project Data Isolation

All data is project-scoped via `projectId`. API calls must include project context. Routes in `server/routes/` (13 modules).

### File Upload Pipeline

Express route (Multer) → save temp file → spawn Python subprocess → monitor stdout JSON progress → store metadata in Prisma → cleanup temps.

### Auth

JWT (HS256) with refresh tokens in HTTP-only cookies. Middleware in `server/middleware/auth.ts`.

## Project Structure (key directories)

```
src/
├── components/scene/     # 3D scene: GeologyCanvas, BoreholeInstances, TerrainMesh, WaterLevelSurface, ClippingPlane
├── components/overlay/   # UI panels over 3D: LayerPanel, BoreholeDetailPanel, ClippingToolPanel
├── components/controls/  # Interactive controls
├── components/data/      # Data upload sections
├── stores/               # Zustand stores (~15)
├── pages/                # Route pages (GeologyPage, DataManagementPage, ProjectDashboard)
├── types/                # TypeScript interfaces
├── config/               # three.ts (LOD/rendering), lithologyConfig.ts, permissions.ts
└── utils/                # coordinates.ts, lod.ts, colorRamps.ts

server/
├── routes/               # 13 Express route modules
├── scripts/              # Python processors (geology, terrain, water level)
├── prisma/schema.prisma  # Full database schema
├── middleware/            # auth.ts, errorLogger.ts
├── lib/prisma.ts         # Prisma client singleton
└── uploads/              # File storage (geology-models/, terrain/, imagery/, etc.)
```

## Environment Variables

**Frontend** (`.env`): `VITE_API_BASE_URL`, `VITE_SENTRY_DSN`

**Backend** (`server/.env`):

- `DATABASE_URL` — PostgreSQL connection (default: `postgresql://postgres:postgres@localhost:5433/llrwddb?sslmode=disable`)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `FRONTEND_URL` (CORS origin, default `http://localhost:5173`)
- `PORT` (default 3001)

## Conventions

- Commit messages: `feat:`, `fix:`, `docs:`, `refactor:` prefixes. Messages may be in English or Chinese.
- Database changes: edit `server/prisma/schema.prisma`, then `npx prisma db push && npx prisma generate`.
- Vite proxies `/api/*` and `/uploads/*` to the backend in dev mode.
- Frontend uses strict TypeScript; backend uses CommonJS module system.
- All uploaded files go to `server/uploads/` organized by type subdirectory.
