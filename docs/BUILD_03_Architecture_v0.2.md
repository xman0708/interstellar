# LivingCode Agent 技术架构 v0.2

## 一、当前架构

```
┌─────────────────────────────────────────────────────┐
│                    Vue 3 前端                        │
│              CopilotPanel (对话入口)                  │
└────────────────────┬────────────────────────────────┘
                     │ HTTP
┌────────────────────┴────────────────────────────────┐
│              Node.js Express 后端                   │
│  ┌─────────────────────────────────────────────┐   │
│  │           Agent Runtime (v2)                 │   │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────────┐  │   │
│  │  │  LLM    │ │ Skills  │ │   Session    │  │   │
│  │  │ (Minimax│ │ Executor│ │   Manager    │  │   │
│  │  │ Tool    │ │         │ │              │  │   │
│  │  │ Calling │ │         │ │              │  │   │
│  │  └─────────┘ └─────────┘ └──────────────┘  │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## 二、核心模块

### 2.1 Agent Loop

```
用户消息
   ↓
Session Manager (获取/创建会话)
   ↓
System Prompt Builder (构建提示)
   ↓
LLM (调用 Minimax API)
   ↓
Tool Executor (执行 Skills)
   ↓
Response Parser (解析为 UI 指令)
   ↓
返回 UI 响应
```

### 2.2 Tools (Skills)

| Tool | 功能 |
|------|------|
| call_api | 调用后端 REST API |
| run_sandbox | 在 vm 沙箱执行代码 |

### 2.3 UI 响应类型

| Type | 用途 |
|------|------|
| chart | 数据可视化 |
| table | 列表展示 |
| action | 触发页面操作 |
| text | 文本回复 |

## 三、API 设计

### 3.1 对话接口

```typescript
POST /api/agent/chat
{
  message: string;      // 用户输入
  sessionId?: string;  // 会话 ID
  context?: object;    // 额外上下文
}

Response:
{
  sessionId: string;
  ui: UIResponse;
}
```

### 3.2 会话管理

```
GET    /api/agent/sessions           # 列表
GET    /api/agent/sessions/:id       # 详情
DELETE /api/agent/sessions/:id       # 删除
```

## 四、文件结构

```
backend/
├── server.ts                    # Express 入口
├── agent/
│   ├── index.ts                 # Agent Loop + Tool Calling
│   ├── prompt.ts                # System Prompt 构建
│   ├── session/
│   │   └── sessionManager.ts    # 会话管理
│   └── skills/
│       ├── ui.ts                # UI 类型
│       └── executor.ts          # Skills 执行器
└── .env                        # 环境变量
```

## 五、参考 OpenClaw 的特性

- [x] Workspace + Bootstrap 文件
- [x] Session 管理
- [x] Tool Calling
- [ ] Streaming (待实现)
- [ ] Memory 自动flush (待实现)
- [ ] Model Failover (待实现)

## 六、下一步

1. **流式响应** - Server-Sent Events
2. **真实 API** - 对接 HuiFlow 现有服务
3. **Memory** - 长期记忆机制
4. **Skills 完善** - 更多业务能力
