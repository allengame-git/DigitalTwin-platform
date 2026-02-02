# Data Model: 地質資料展示模組

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Borehole   │──1:N──│   Layer     │       │   Photo     │
│             │       │             │       │             │
└──────┬──────┘       └─────────────┘       └──────┬──────┘
       │                                           │
       └──────────────────1:N──────────────────────┘

┌─────────────────────┐       ┌─────────────────────┐
│ GeologicalStructure │       │   GeologyModel      │
│                     │       │   (3D Tiles ref)    │
└─────────────────────┘       └─────────────────────┘

┌─────────────────────┐
│   GuidedTourConfig  │
│   (JSON external)   │
└─────────────────────┘
```

## Entities

### Borehole (鑽孔)

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | string (UUID) | 唯一識別碼 | PK, Required |
| name | string | 孔位名稱 (e.g., "BH-001") | Required, Unique |
| x | number | 孔口 X 座標 (WGS84 經度) | Required |
| y | number | 孔口 Y 座標 (WGS84 緯度) | Required |
| z | number | 孔口 Z 座標 (高程, 公尺) | Required |
| depth | number | 總深度 (公尺) | Required, >0 |
| waterLevel | number | 地下水位深度 (公尺) | Nullable |
| drillingDate | Date | 鑽探日期 | Nullable |
| createdAt | Date | 建立時間 | Auto |
| updatedAt | Date | 更新時間 | Auto |

**Relationships**:

- Has many `Layer`
- Has many `Photo`

### Layer (地層)

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | string (UUID) | 唯一識別碼 | PK |
| boreholeId | string (UUID) | 所屬鑽孔 | FK → Borehole.id, Required |
| topDepth | number | 頂深 (公尺) | Required, ≥0 |
| bottomDepth | number | 底深 (公尺) | Required, >topDepth |
| lithology | string | 岩性描述 | Required |
| lithologyCode | string | 岩性代碼 (用於著色) | Nullable |
| properties | JSON | 物性數據 (密度、強度等) | Nullable |

**Validation Rules**:

- `bottomDepth > topDepth`
- 同一鑽孔的 layers 深度不可重疊

### Photo (岩芯照片)

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | string (UUID) | 唯一識別碼 | PK |
| boreholeId | string (UUID) | 所屬鑽孔 | FK → Borehole.id, Required |
| depthFrom | number | 照片起始深度 | Required |
| depthTo | number | 照片結束深度 | Required |
| imageUrl | string | 圖片 URL | Required |
| thumbnailUrl | string | 縮圖 URL | Nullable |

### GeologicalStructure (地質構造)

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | string (UUID) | 唯一識別碼 | PK |
| type | enum | 構造類型 | 'fault' / 'fold' / 'strike_dip' |
| name | string | 構造名稱 | Nullable |
| geometry | GeoJSON | 空間幾何 | Required |
| strike | number | 走向 (度) | For strike_dip only |
| dip | number | 傾角 (度) | For strike_dip only |
| attributes | JSON | 其他屬性 | Nullable |

### GeologyModel (地質模型參照)

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | string (UUID) | 唯一識別碼 | PK |
| name | string | 模型名稱 | Required |
| tilesetUrl | string | 3D Tiles URL | Required |
| layerCount | number | 地層數量 | Required |
| boundingBox | JSON | 範圍框 | Required |

### GuidedTourConfig (導覽配置)

外部 JSON 檔案格式 (`/public/tours/geology-tour.json`):

```typescript
interface GuidedTourConfig {
  id: string;
  name: string;
  description: string;
  steps: TourStep[];
}

interface TourStep {
  id: string;
  title: string;
  description: string;
  cameraPosition: {
    longitude: number;
    latitude: number;
    height: number;
  };
  cameraTarget?: {
    longitude: number;
    latitude: number;
    height: number;
  };
  duration: number; // 顯示秒數
  highlightEntities?: string[]; // 要高亮的實體 ID
}
```

## TypeScript Interfaces

```typescript
// src/types/geology.ts

export interface Borehole {
  id: string;
  name: string;
  coordinates: {
    x: number;  // WGS84 longitude
    y: number;  // WGS84 latitude
    z: number;  // elevation (m)
  };
  depth: number;
  waterLevel: number | null;
  drillingDate: Date | null;
  layers: Layer[];
  photos: Photo[];
}

export interface Layer {
  id: string;
  boreholeId: string;
  topDepth: number;
  bottomDepth: number;
  lithology: string;
  lithologyCode: string | null;
  properties: Record<string, number>;
}

export interface Photo {
  id: string;
  boreholeId: string;
  depthFrom: number;
  depthTo: number;
  imageUrl: string;
  thumbnailUrl: string | null;
}

export interface GeologicalStructure {
  id: string;
  type: 'fault' | 'fold' | 'strike_dip';
  name: string | null;
  geometry: GeoJSON.Geometry;
  strike?: number;
  dip?: number;
  attributes: Record<string, unknown>;
}

export interface GeologyModel {
  id: string;
  name: string;
  tilesetUrl: string;
  layerCount: number;
  boundingBox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
}
```

## Database Schema (PostgreSQL + PostGIS)

```sql
CREATE TABLE boreholes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  location GEOMETRY(PointZ, 4326) NOT NULL,
  depth NUMERIC NOT NULL CHECK (depth > 0),
  water_level NUMERIC,
  drilling_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_boreholes_location ON boreholes USING GIST(location);

CREATE TABLE layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borehole_id UUID NOT NULL REFERENCES boreholes(id) ON DELETE CASCADE,
  top_depth NUMERIC NOT NULL CHECK (top_depth >= 0),
  bottom_depth NUMERIC NOT NULL,
  lithology VARCHAR(255) NOT NULL,
  lithology_code VARCHAR(50),
  properties JSONB,
  CONSTRAINT depth_order CHECK (bottom_depth > top_depth)
);

CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borehole_id UUID NOT NULL REFERENCES boreholes(id) ON DELETE CASCADE,
  depth_from NUMERIC NOT NULL,
  depth_to NUMERIC NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT
);

CREATE TABLE geological_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('fault', 'fold', 'strike_dip')),
  name VARCHAR(255),
  geometry GEOMETRY NOT NULL,
  strike NUMERIC,
  dip NUMERIC,
  attributes JSONB
);

CREATE INDEX idx_structures_geometry ON geological_structures USING GIST(geometry);
```
