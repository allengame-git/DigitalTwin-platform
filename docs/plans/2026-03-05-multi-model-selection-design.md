# Multi-Model Selection & Multi-Track Animation Design

**Goal:** 將設施模組從單模型選取改為多模型選取，支援分軌動畫編排與批次管理操作。

**Architecture:**
- `selectedModelId: string | null` → `selectedModelIds: string[]` + `focusedModelId: string | null`
- 分軌 Timeline：每個選取模型一個軌道，焦點模型顯示 TransformControls
- 批次操作：刪除、顯示/隱藏、統一 Transform

**Selection Logic:**
- Click → 單選（清空舊選取）
- Cmd/Ctrl + Click → toggle 追加/移除
- focusedModelId = 最後被點擊的模型

**Multi-Track Timeline:**
- 焦點軌道高亮，可新增/更新 keyframe
- 非焦點軌道灰色顯示
- 播放時所有軌道同步

**Batch Operations:**
- 選取 ≥ 2 模型時顯示批次工具列
- 批次刪除（確認對話框）、顯示/隱藏、Transform offset/scale
