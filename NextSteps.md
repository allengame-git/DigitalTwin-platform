# Next Steps & Handover Guide

This document outlines the current state of the LLRWD DigitalTwin Platform (specifically the Geology Module) and provides detailed instructions for the next phase of development.

## 📌 Context for Next Agent

### Current Status (as of 2026-02-05)

The **Geology Module** is robust and functionally complete for an MVP.

- **Borehole Visualization**: Fully implemented with InstancedMesh, LOD, and lithology segmentation.
- **Reference Data**: TWD97 coordinate conversion, Fault Planes (Normal/Reverse/Slip) with valid 3D geometry and Info Panels.
- **Interaction**: Robust click/hover handling on Boreholes and Faults.
- **Authentication**: Secure JWT flow with `httpOnly` cookie refresh, session persistence, and hydration checks.
- **Data**: Still using **Mock Data** (`boreholeStore.ts`, `StructureLines.tsx`), ready for API insertion.
- **UI/UX**: Refined premium styling for info panels, Layer management, and performance monitoring.

### Critical Implementation Details

- **Borehole Interaction**: We use `onClick` on `InstancedMesh`. *Important*: We added a `key` prop to the mesh (`key={isIconMode ? 'icon' : 'detail'}`) to force React to remount the component when switching between Geometry types (Sphere vs Cylinder). **Do not remove this key**, or the click handler will break after zooming out/in.
- **Data Sync**: The Detail Panel uses the *same* layer data as the 3D scene. This is ensured in `boreholeStore.ts` by using `borehole.layers` from the state rather than regenerating it.
- **Controls**: `MapControls` has `enableDamping={false}` to prevent sliding inertia, providing precise clicking interaction.
- **Terrain**: The mock terrain has `maxElevation: 300` to match borehole heights, and `raycast={() => null}` to allow clicking through it.

---

## 🚀 Immediate Next Steps (Priority High)

### 1. API Integration (Replace Mock Data)

The current application runs on generated mock data. The most critical next step is to connect to the real backend.

- **Action**: In `src/stores/boreholeStore.ts`, replace `generateMockBoreholes` and the timeout-based `fetchBoreholes` with actual API calls.
- **Reference**: See `src/types/api.ts` (if exists) or create an API service layer (e.g., using `axios` or `fetch`).
- **Endpoint Requirements**:
  - `GET /api/boreholes`: Should return the list of boreholes with basic info (x, y, elevation, totalDepth).
  - `GET /api/boreholes/{id}`: Should return detailed data including layers, properties, and photos.

### 2. Asset Replacement

Currently using placeholder colors and generated noisemaps.

- **Terrain**: Replace `TerrainMesh`'s mock elevation generator with a real **DEM (Digital Elevation Model)** loader (e.g., GeoTIFF or Heightmap texture).
- **Imagery**: Replace `ImageryPlane`'s solid color with actual **Orthophoto Tiles** (e.g., WMTS or static textures).
- **3D Tiles**: The `GeologyTiles` component is set up but likely needs a real `url` pointing to a Tileset (e.g., Cesium ion or local server) representing the broader geological context.

### 3. Engineering Module (New Feature)

Start developing the "Engineering Design" module.

- **Goal**: Visualize planned structures (tunnels, disposal pits, silos).
- **Components**: Create new components in `src/components/scene/engineering/` (e.g., `TunnelMesh`, `FacilityModel`).
- **Integration**: Add a new route/page or a toggle in the UI to switch between "Geology View" and "Engineering View".

---

## 🛠 Technical Debt & Visual Polish

### 1. Color Legend

- **Issue**: Users see colored borehole segments but don't know what rock type "Brown" or "Grey" represents.
- **Task**: Implement a `Legend` component in the UI (e.g., bottom-right floating panel) mapping `GEOLOGY_COLORS` to lithology names.

### 2. Unit Tests

- **Status**: Zero unit coverage.
- **Task**: Set up Vitest or Jest. Add tests for:
  - `utils/coordinates.ts` (TWD97 conversion correctness).
  - `utils/lod.ts` (Level calculation logic).
  - `boreholeStore.ts` (State actions).

### 3. Performance Tuning (Large Scale)

- **Monitoring**: Keep an eye on the `PerfromanceMonitor` when loading >2000 boreholes.
- **Optimization**: If frame drops occur, look into `three-bvh` for raycasting optimization, or use a WebWorker for parsing API data.

---

## 📂 File Structure Guidance

If you are adding new features, please follow this structure:

```
src/
  stores/       # Logic & State (Zustand)
  components/
    scene/      # 3D Objects only
    overlay/    # 2D UI (HTML/CSS)
  hooks/        # Reusable hook logic
  utils/        # Pure functions
```

**Good luck!**
