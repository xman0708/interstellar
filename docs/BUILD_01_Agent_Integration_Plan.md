# LivingCode 建设文档 #1：基于 OpenClaw 设计理念的 Agent 集成规划

## 背景

参考 OpenClaw 主工程的 Agent 设计，为 LivingCode/HuiFlow 系统规划 AI Agent 集成方案。

## 参考来源

- OpenClaw `docs/concepts/agent.md` - Agent 运行时核心概念
- OpenClaw `docs/concepts/agent-loop.md` - Agent 循环生命周期
- OpenClaw `docs/concepts/agent-workspace.md` - Agent 工作区设计

## 一、OpenClaw Agent 核心要素

### 1. Workspace（工作区）
- 唯一工作目录，用于文件工具和上下文
- 包含 bootstrap 文件：AGENTS.md、SOUL.md、TOOLS.md、USER.md 等
- 支持 skills 目录

### 2. Bootstrap 文件
| 文件 | 用途 |
|------|------|
| AGENTS.md | 操作指令，内存使用方式 |
| SOUL.md | 人设、边界、语气 |
| USER.md | 用户信息 |
| TOOLS.md | 工具笔记（本地约定） |
| HEARTBEAT.md | 心跳检查清单 |
| BOOTSTRAP.md | 首次运行仪式（一次性） |

### 3. Agent Loop
- 入口：消息输入 → 上下文组装 → 模型推理 → 工具执行 → 流式响应
- 支持 hook 拦截（before_model_resolve、before_tool_call 等）
- 支持 session 管理和历史

### 4. Skills
- 技能是从特定目录加载的可复用能力
- 位置：bundled、managed、workspace

## 二、LivingCode 集成方案

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    HuiFlow 系统                       │
├─────────────────┬─────────────────┬─────────────────┤
│  神经末梢层      │  调度与反思大脑   │   持久化基座     │
│  (Vue3 前端)    │  (Node.js BFF)  │   (Java/Go)     │
├─────────────────┴─────────────────┴─────────────────┤
│              OpenClaw Agent Runtime                 │
│         (集成到 Node.js 调度层)                      │
├─────────────────────────────────────────────────────┤
│  Workspace (~/livingcode-workspace)                 │
│  - AGENTS.md / SOUL.md / TOOLS.md / USER.md         │
│  - skills/ / memory/                                 │
└─────────────────────────────────────────────────────┘
```

### 2.2 集成策略

#### Phase 1：基础 Workspace 搭建
1. 创建 `~/livingcode-workspace` 目录
2. 初始化 bootstrap 文件
3. 配置 OpenClaw Node.js SDK（或自行实现简化版）

#### Phase 2：Skills 设计
参考 OpenClaw skills 机制，为 HuiFlow 设计：
- `feishu-bitable-skill`：飞书多维表格操作
- `http-api-skill`：调用现有 Java/Go API
- `vm-sandbox-skill`：动态代码执行沙箱

#### Phase 3：Agent Loop 集成
- 复用 OpenClaw 的 pi-agent-core
- 或自行实现简化版循环：
  1. 接收用户自然语言输入
  2. 组装上下文（system prompt + history）
  3. 调用 LLM 推理
  4. 执行工具（调用 API、写文件等）
  5. 流式返回结果

### 2.3 关键技术决策

| 决策点 | 方案 | 理由 |
|--------|------|------|
| Agent Runtime | 集成 pi-agent-core | 与 OpenClaw 保持一致 |
| Workspace 存储 | 本地文件系统 | 简单可靠 |
| Session 管理 | JSONL 文件 | 兼容 OpenClaw 格式 |
| Skills 机制 | 继承 OpenClaw | 降低学习成本 |

## 三、下一步行动

- [ ] 创建 LivingCode 专用 workspace 目录
- [ ] 编写基础 bootstrap 文件
- [ ] 设计第一批 HuiFlow-specific skills
- [ ] 集成 pi-agent-core 到 demo-mvp1 backend

## 建设记录

- **日期**：2026-03-04
- **作者**：OpenClaw Agent
- **版本**：v0.1
