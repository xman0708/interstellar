---
name: huiflow-api
description: |
  HuiFlow 后端 API 调用。用于查询数据、创建/更新业务对象、触发业务流程。
  当用户提到查看数据、提交表单、执行操作时激活。
---

# HuiFlow API Skill

调用 HuiFlow 后端 Java/Go 服务 API。

## 基础 URL

```
http://localhost:3000/api
```

（开发环境，生产环境配置见 TOOLS.md）

## 常用 API

### 项目管理

```typescript
// 获取项目列表
GET /api/projects

// 获取项目详情
GET /api/projects/:id

// 创建项目
POST /api/projects
{ "name": "项目名称", "description": "描述" }
```

### 任务管理

```typescript
// 获取任务列表
GET /api/tasks?projectId=xxx

// 创建任务
POST /api/tasks
{ "title": "任务标题", "projectId": "xxx", "assignee": "用户ID" }
```

### 统计分析

```typescript
// 工时统计
GET /api/stats/work-hours?start=2026-03-01&end=2026-03-07

// 项目进度
GET /api/stats/project-progress/:id
```

## 响应格式

成功响应：
```json
{
  "success": true,
  "data": { ... }
}
```

错误响应：
```json
{
  "success": false,
  "error": "错误信息"
}
```

## 使用场景

1. **数据查询**：用户问"上周谁加班最多" → 调用工时统计 API
2. **创建操作**：用户说"帮我创建个任务" → 调用任务创建 API
3. **业务流程**：用户说"提交审批" → 调用审批流程 API

## 安全规则

- 只调用 `/api/*` 路由
- 禁止直接操作数据库
- 敏感操作需要用户确认
