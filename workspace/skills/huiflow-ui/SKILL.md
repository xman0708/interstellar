---
name: huiflow-ui
description: |
  HuiFlow UI 生成与指令。用于返回展示类数据、图表、表格，或触发页面操作。
  当用户要求查看数据、分析、统计时激活。
---

# HuiFlow UI Skill

生成 Vue 3 前端可渲染的 UI 指令或数据 Schema。

## 返回格式

返回 JSON 对象，包含 `uiType` 字段决定渲染方式：

### 1. AutoChart - 图表

```json
{
  "uiType": "AutoChart",
  "title": "本周工时统计",
  "chartType": "bar",  // bar | line | pie
  "chartData": [
    { "label": "张三", "value": 35 },
    { "label": "李四", "value": 42 },
    { "label": "王五", "value": 28 }
  ],
  "xAxis": "人员",
  "yAxis": "工时"
}
```

### 2. SmartTable - 表格

```json
{
  "uiType": "SmartTable",
  "title": "项目列表",
  "columns": [
    { "key": "name", "label": "项目名称" },
    { "key": "status", "label": "状态" },
    { "key": "owner", "label": "负责人" }
  ],
  "rows": [
    { "name": "HuiFlow演进", "status": "进行中", "owner": "张三" },
    { "name": "前端重构", "status": "已完成", "owner": "李四" }
  ]
}
```

### 3. ActionCommand - 操作指令

```json
{
  "uiType": "ActionCommand",
  "title": "创建任务",
  "command": "OPEN_TASK_MODAL",
  "payload": {
    "projectId": "xxx",
    "defaultAssignee": "当前用户"
  }
}
```

## 响应链路

```
 (自然语言)
User Input    ↓
LLM 分析意图
    ↓
调用 API 获取数据 / 调用沙箱处理数据
    ↓
生成 UI Schema
    ↓
前端渲染组件 (Vue 3)
```

## 前端组件映射

| uiType | 前端组件 | 用途 |
|--------|----------|------|
| AutoChart | `<AutoChart>` | 数据可视化 |
| SmartTable | `<SmartTable>` | 表格展示 |
| ActionCommand | EventBus | 触发页面操作 |

## 示例场景

### 场景1：查询工时

```
用户：上周谁加班最多？
↓
API: GET /api/stats/work-hours?start=2026-02-24&end=2026-03-02
↓
返回：
{
  "uiType": "AutoChart",
  "chartType": "bar",
  "chartData": [...]
}
↓
前端渲染柱状图
```

### 场景2：创建任务

```
用户：帮我创建个任务
↓
返回：
{
  "uiType": "ActionCommand",
  "command": "OPEN_TASK_MODAL"
}
↓
前端打开任务创建弹窗
```

### 场景3：查看流水

```
用户：最近有啥项目在跑？
↓
API: GET /api/projects
↓
返回：
{
  "uiType": "SmartTable",
  "columns": [...],
  "rows": [...]
}
↓
前端渲染表格
```

## 最佳实践

1. **数据在前端处理**：复杂聚合在后端 API 完成
2. **Schema 保持简洁**：避免传输大量原始数据
3. **支持分页**：大数据集使用分页加载
4. **错误友好**：API 失败时返回错误提示，而非空白
