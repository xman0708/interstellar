# TOOLS.md - 工具笔记

## 本地工具

### API 调用
- 后端基础 URL: `http://localhost:3000/api`
- 所有业务请求通过 RESTful API

### 动态执行
- 使用 Node.js vm 沙箱
- 禁止 fs/network 访问

## 前端集成

- 使用 Vercel AI SDK
- 接收流式 JSON Schema 响应
- 支持三种 UI 类型：
  - `AutoChart` - 图表渲染
  - `SmartTable` - 表格渲染
  - `ActionCommand` - 指令执行

## 代码位置

- 前端：`demo-mvp1/frontend/`
- 后端：`demo-mvp1/backend/server.ts`
- Workspace: `workspace/`
