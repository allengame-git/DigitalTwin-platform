# Adaptive Scene Lighting Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 場景範圍驅動燈光/影子參數自適應，支援 10m~10km 場景

**Architecture:** FacilityScene DB 新增 `sceneBounds` 欄位，前端 FacilityEnvironment 改為動態計算燈光參數。場景管理 UI 新增寬/深/高輸入，預設自動根據模型 bbox 計算。

---

## 1. DB Schema

`FacilityScene` 新增：
- `sceneBounds Json?` — `{ width: number, depth: number, height: number }` 單位：米
- null 表示自動計算

## 2. 動態燈光計算

`range = max(width, depth)` 作為基準：

| 參數 | 公式 |
|------|------|
| 光源位置 | `[range*0.3, range*0.5, -range*0.2]` |
| shadow camera 範圍 | `+-range * 0.6` |
| shadow map | 固定 4096 |
| shadow camera far | `range * 1.5` |
| shadow bias | `-0.0003` |
| shadow normalBias | `range * 0.00002` |
| 地面大小 | `range * 2` |
| grid | 大小 `range`，格線數 `clamp(range/10, 20, 200)` |
| fog near/far | `range * 1.0` / `range * 5.0` |

## 3. 自動計算 fallback

sceneBounds 為 null 時，用 modelBboxCenters 計算所有模型的 bounding box 最大跨距。

## 4. UI

場景管理表單新增 3 欄位：場景寬度/場景深度/場景高度（選填，空=自動）。
