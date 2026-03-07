# LivingCode Agent Runtime 技术设计

## 一、当前状态

demo-mvp1 后端已具备：
- `/api/generate-ui` - 模拟的 AI 接口（返回固定 JSON）
- Vue 3 前端 + @ai-sdk/vue

## 二、目标架构

```
┌──────────────────────────────────────────────┐
│                 Vue 3 前端                     │
│            CopilotPanel (对话入口)              │
└────────────────────┬─────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────┴─────────────────────────┐
│            Node.js Express 后端                 │
│  ┌─────────────────────────────────────────┐  │
│  │         Agent Runtime (新增)              │  │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐  │  │
│  │  │ Router  │ │ Skills  │ │ Sandbox   │  │  │
│  │  │ Agent   │ │ (api,   │ │ Executor  │  │  │
│  │  │         │ │  ui,    │ │           │  │  │
│  │  │         │ │ sandbox)│ │           │  │  │
│  │  └─────────┘ └─────────┘ └──────────┘  │  │
│  └─────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────┴───────┐        ┌───────┴───────┐
│  Java/Go API  │        │  vm-sandbox   │
│  (现有服务)    │        │  (动态执行)    │
└───────────────┘        └───────────────┘
```

## 三、API 设计

### 3.1 Agent 对话接口

```typescript
// POST /api/agent/chat
interface AgentChatRequest {
  message: string;           // 用户自然语言输入
  sessionId?: string;        // 会话 ID（可选）
  context?: {               // 额外上下文（可选）
    projectId?: string;
    [key: string]: any;
  };
}

interface AgentChatResponse {
  sessionId: string;         // 会话 ID
  ui: UIResponse;            // UI 指令/数据
  // 流式响应时使用 SSE
}
```

### 3.2 UI 响应类型

```typescript
type UIResponse = ChartResponse | TableResponse | ActionResponse | TextResponse;

interface ChartResponse {
  type: 'chart';
  title: string;
  chartType: 'bar' | 'line' | 'pie';
  data: { label: string; value: number }[];
}

interface TableResponse {
  type: 'table';
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, any>[];
}

interface ActionResponse {
  type: 'action';
  action: string;           // 'OPEN_TASK_MODAL' 等
  payload?: Record<string, any>;
}

interface TextResponse {
  type: 'text';
  content: string;
}
```

## 四、Agent Loop 实现

### 4.1 核心流程

```
1. 接收用户消息
2. 加载会话历史（可选）
3. 构建 System Prompt
   - AGENTS.md 内容
   - Skills 描述
   - 会话历史
4. 调用 LLM (使用 @ai-sdk)
5. 解析 LLM 响应
   - 如果是工具调用 → 执行工具 → 返回结果 → 再次调用 LLM
   - 如果是最终响应 → 返回 UI 指令
6. 返回响应（流式或非流式）
```

### 4.2 System Prompt 示例

```
你是 HuiFlow 的 AI 助手。

## 你的能力
1. 调用后端 API 获取数据
2. 在沙箱中执行代码处理数据
3. 返回 UI 指令让前端渲染

## Skills
- huiflow-api: 调用后端 API
- huiflow-sandbox: 动态代码执行
- huiflow-ui: 生成 UI 指令

## 响应格式
必须返回以下格式之一：
- { type: 'chart', ... }
- { type: 'table', ... }
- { type: 'action', action: 'OPEN_XXX_MODAL', ... }
- { type: 'text', content: '...' }
```

## 五、实现计划

### Phase 1: 基础架构（1-2天）
- [ ] 扩展 server.ts，增加 /api/agent/chat 端点
- [ ] 实现 System Prompt 构建
- [ ] 实现基本的 LLM 调用

### Phase 2: Skills 集成（1-2天）
- [ ] 实现 huiflow-api skill（HTTP 调用）
- [ ] 实现 huiflow-sandbox skill（vm 执行）
- [ ] 实现 huiflow-ui skill（响应构建）

### Phase 3: 完善（1天）
- [ ] 会话管理（历史记录）
- [ ] 流式响应（可选）
- [ ] 错误处理

## 六、技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| LLM SDK | @ai-sdk/openai | 轻量、兼容性好 |
| Sandbox | Node.js vm2 或原生 vm | 安全隔离 |
| Session | 内存 + JSONL 文件 | 简单可靠 |
| Skills | 本地加载 | 复用 workspace |

## 七、文件位置

```
demo-mvp1/backend/
├── server.ts              # 主服务（已存在）
├── agent/
│   ├── index.ts           # Agent 入口
│   ├── loop.ts           # Agent Loop
│   ├── skills/
│   │   ├── api.ts        # API skill
│   │   ├── sandbox.ts    # Sandbox skill
│   │   └── ui.ts         # UI skill
│   ├── prompt.ts         # System Prompt 构建
│   └── session.ts        # 会话管理
```
