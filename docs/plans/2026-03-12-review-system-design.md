# 審查作業系統設計文件

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create implementation plan from this design.

**Goal:** 建立以會議為單位的審查作業系統，讓審查委員在 3D 場景中留下標記與意見，並產生正式會議記錄文件。

**日期:** 2026-03-12

---

## 一、核心概念

審查作業（ReviewSession）是一場會議的數位記錄。參與者在 3D 場景中針對特定位置留下標記（ReviewMarker），每個標記附帶自動截圖和討論串（ReviewComment）。審查作業掛在專案層級，可跨模組討論。結案後產生 PDF 會議記錄，存檔供未來下載。

---

## 二、資料模型

### ReviewSession（審查作業）

```prisma
model ReviewSession {
  id           String   @id @default(uuid())
  projectId    String
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title        String
  description  String?
  status       ReviewStatus @default(draft)
  conclusion   String?              // 會後結論，optional
  scheduledAt  DateTime?            // 預定時間
  concludedAt  DateTime?
  pdfUrl       String?              // 產生的 PDF 檔案路徑
  createdBy    String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  markers      ReviewMarker[]
  participants ReviewParticipant[]

  @@index([projectId])
  @@map("review_sessions")
}

enum ReviewStatus {
  draft
  active
  concluded
}
```

### ReviewParticipant（參與者）

```prisma
model ReviewParticipant {
  id        String   @id @default(uuid())
  sessionId String
  session   ReviewSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      String   @default("participant")  // "host" | "participant"
  joinedAt  DateTime @default(now())

  @@unique([sessionId, userId])
  @@map("review_participants")
}
```

### ReviewMarker（標記）

```prisma
model ReviewMarker {
  id            String   @id @default(uuid())
  sessionId     String
  session       ReviewSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  moduleId      String
  module        Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  title         String
  description   String?
  status        MarkerStatus @default(open)
  priority      MarkerPriority @default(medium)
  positionX     Float
  positionY     Float
  positionZ     Float
  cameraPositionX Float
  cameraPositionY Float
  cameraPositionZ Float
  cameraTargetX   Float
  cameraTargetY   Float
  cameraTargetZ   Float
  screenshotUrl String?
  createdBy     String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  comments      ReviewComment[]

  @@index([sessionId])
  @@index([moduleId])
  @@map("review_markers")
}

enum MarkerStatus {
  open
  in_progress
  resolved
}

enum MarkerPriority {
  low
  medium
  high
}
```

### ReviewComment（討論串）

```prisma
model ReviewComment {
  id        String   @id @default(uuid())
  markerId  String
  marker    ReviewMarker @relation(fields: [markerId], references: [id], onDelete: Cascade)
  content   String
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([markerId])
  @@map("review_comments")
}
```

---

## 三、API 設計

### Review Session CRUD

```
GET    /api/review?projectId=xxx           取得專案所有審查作業（含 marker 統計）
POST   /api/review                         建立審查作業
GET    /api/review/:id                     取得審查作業詳情（含 markers + comments + participants）
PUT    /api/review/:id                     更新審查作業（title/description/status/conclusion）
DELETE /api/review/:id                     刪除審查作業（admin only，需確認）
```

### Review Marker CRUD

```
POST   /api/review/:sessionId/markers      新增標記（含截圖上傳 multipart）
GET    /api/review/:sessionId/markers      取得審查的所有標記
PUT    /api/review/markers/:markerId       更新標記（title/description/status/priority）
DELETE /api/review/markers/:markerId       刪除標記
```

### Review Comment

```
POST   /api/review/markers/:markerId/comments   新增留言
PUT    /api/review/comments/:commentId           更新留言
DELETE /api/review/comments/:commentId           刪除留言
```

### Participants

```
POST   /api/review/:sessionId/participants       新增參與者
DELETE /api/review/:sessionId/participants/:userId  移除參與者
```

### PDF 匯出

```
POST   /api/review/:sessionId/export-pdf   產生 PDF 並存檔，回傳 URL
GET    /api/review/:sessionId/pdf          下載既有 PDF
```

### 權限

- 建立/刪除審查作業：admin, engineer
- 新增標記/留言：admin, engineer, viewer（所有參與者）
- 更新標記狀態：admin, engineer, 標記建立者
- 匯出 PDF：所有參與者
- 瀏覽：專案成員

---

## 四、前端架構

### 新增檔案

```
src/
├── stores/reviewStore.ts              # Zustand store
├── pages/
│   ├── ReviewListPage.tsx             # 審查列表頁
│   └── ReviewDetailPage.tsx           # 審查詳情頁
├── components/review/
│   ├── ReviewModePanel.tsx            # 3D 場景內的審查側邊面板
│   ├── ReviewMarkerPin.tsx            # 3D pin 元件（R3F Html）
│   ├── ReviewMarkerDetail.tsx         # 標記詳情 + 討論串（右下角面板）
│   ├── ReviewSessionForm.tsx          # 建立/編輯審查表單 modal
│   ├── ReviewMarkerForm.tsx           # 新增標記表單 modal
│   └── ReviewExportButton.tsx         # PDF 匯出按鈕
├── api/review.ts                      # API client
└── types/review.ts                    # TypeScript 型別
```

### 路由

```
/project/:code/reviews                 → ReviewListPage（審查列表）
/project/:code/reviews/:sessionId      → ReviewDetailPage（審查詳情）
```

### 審查模式 UX

**進入審查模式：**
1. 模組 3D 場景的側邊欄底部新增「審查模式」按鈕（橘色主題）
2. 點擊後展開 ReviewModePanel，選擇既有 session 或建立新的
3. 場景中顯示該 session 在此模組的所有 ReviewMarkerPin

**新增標記流程：**
1. 審查模式下點擊 3D 模型表面 → Raycasting 取得交點座標
2. 前端自動擷取 Canvas 截圖（`gl.domElement.toDataURL('image/jpeg', 0.8)`）
3. 跳出 ReviewMarkerForm（標題、說明、優先級）
4. 提交 → multipart POST 上傳截圖 + 建立 marker → 3D pin 出現

**3D Pin 渲染（ReviewMarkerPin）：**
- 使用 `@react-three/drei` 的 `<Html>` 在 3D 座標渲染 pin icon
- 顏色依狀態：紅（open）、黃（in_progress）、綠（resolved）
- 點擊 pin → 展開 ReviewMarkerDetail 面板 + 飛到該視角
- `distanceFactor` 控制遠距縮放

**跨模組導航：**
- ReviewModePanel 的 marker 列表顯示所有模組的標記（依模組 icon + 名稱分群）
- 點擊其他模組的 marker → navigate 到 `/project/:code/module/:moduleId` 並帶上 `?review=sessionId&marker=markerId`
- 目標模組載入後自動開啟審查模式、飛到 marker 位置

**討論串互動：**
- ReviewMarkerDetail 面板（右下角，類似 TransformInputPanel 位置）
- 顯示：截圖預覽、標記資訊、狀態切換、討論串
- 底部輸入框可直接回覆

### ProjectDashboard 入口

在模組卡片區塊下方新增「審查作業」區塊：
- 顯示最近 3 筆審查作業摘要
- 「查看全部」按鈕進入 ReviewListPage
- 「新增審查」按鈕

---

## 五、PDF 匯出

### 技術方案

使用 `pdfkit`（Node.js），後端產生 PDF：

1. 前端呼叫 `POST /api/review/:sessionId/export-pdf`
2. 後端查詢完整資料（session + markers + comments + participants + user names）
3. 組裝 PDF 內容：
   - 封面：標題、日期、狀態、參與者名單
   - 結論段落（如果有）
   - 依模組分章節，每個 marker 包含：
     - 截圖（嵌入圖片）
     - 標題、位置座標（轉 TWD97）、優先級、狀態
     - 討論串（時間序列）
   - 尾頁：議題統計（open/in_progress/resolved 各幾個）、產生時間
4. 存檔到 `server/uploads/reviews/{sessionId}/report.pdf`
5. 更新 `ReviewSession.pdfUrl`
6. 回傳下載 URL

### 截圖存儲

- 前端截圖壓縮為 JPEG（quality 0.8），限制寬度 1280px
- 上傳到 `server/uploads/reviews/{sessionId}/screenshots/`
- DB 存相對路徑 `/uploads/reviews/{sessionId}/screenshots/{markerId}.jpg`

---

## 六、與既有 Annotation 框架的關係

現有的 `annotations.ts`（記憶體儲存）和 `src/components/annotation/` 是早期 MVP 框架。新的 Review 系統完全取代其功能：

- **不複用** annotation 的後端 route（記憶體儲存不可靠）
- **不複用** annotation 的前端元件（佔位符品質）
- 保留 `AnnotationsPage` 路由但改為 redirect 到 `/reviews`
- 後續可清理 annotation 相關程式碼

---

## 七、權限矩陣

| 動作 | Admin | Engineer | Viewer |
|------|-------|----------|--------|
| 建立審查作業 | ✓ | ✓ | ✗ |
| 刪除審查作業 | ✓ | ✗ | ✗ |
| 新增/編輯標記 | ✓ | ✓ | ✓（需為參與者） |
| 新增留言 | ✓ | ✓ | ✓（需為參與者） |
| 更新標記狀態 | ✓ | ✓ | 建立者本人 |
| 結束審查 | ✓ | ✓（host） | ✗ |
| 匯出 PDF | ✓ | ✓ | ✓（參與者） |
| 瀏覽審查記錄 | ✓ | ✓ | ✓（被指派專案） |

---

## 八、未來擴展預留

- **ReviewSession.conclusion** 可作為正式簽核流程的基礎文件
- **ReviewParticipant.role** 預留 host/participant，未來可擴展 reviewer/approver
- **MarkerStatus** 可擴展更多狀態（如 deferred、wont_fix）
- **多輪審查** 可透過同一專案建立多個 session 自然支援
