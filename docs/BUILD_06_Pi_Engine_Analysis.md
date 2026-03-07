# pi-agent-core 集成分析

## 什么是 pi-agent-core？

pi-agent-core 是 pi-mono 的核心引擎，提供：

### 核心能力

| 能力 | 描述 |
|------|------|
| **Agent Loop** | 完整的 AI 推理循环 |
| **Tool Execution** | 标准化工具执行 |
| **Session Management** | 会话状态管理 |
| **Context Compaction** | 上下文压缩 |
| **Streaming** | 真正的流式响应 |

### OpenClaw 使用方式

```typescript
import { runEmbeddedPiAgent } from '@mariozechner/pi-agent-core';

const result = await runEmbeddedPiAgent({
  model: 'claude-3-opus',
  messages: [...],
  tools: [...],
  onChunk: (chunk) => { ... }
});
```

## LivingCode 当前架构

```
用户输入
    ↓
Agent (关键词匹配)
    ↓
Skills Registry
    ↓
执行 → UI响应
```

## 是否需要集成？

### 当前 LivingCode 优势

| 方面 | 状态 |
|------|------|
| 业务意图识别 | ✅ 关键词 + LLM |
| Skills 自动调用 | ✅ 12个 Skills |
| Session 管理 | ✅ 内存+持久化 |
| Memory | ✅ 自动记录 |
| Heartbeat | ✅ 后台任务 |

### pi-agent-core 能带来什么

| 新能力 | 必要性 |
|--------|--------|
| 真正的 Tool Calling | ⚠️ MiniMax 不支持 |
| 流式 token 输出 | ⚠️ 业务场景不需要 |
| 复杂推理链 | ⚠️ 简单业务不需要 |
| 编程能力 | ❌ 非编程场景 |

## 结论

**不建议现在集成 pi-agent-core**

理由：
1. **体积太大** - ~3MB vs 我们的 ~50KB
2. **复杂性高** - 学习/维护成本大
3. **需求不匹配** - pi 主要面向编程/通用 AI
4. **当前够用** - 业务对话场景已满足

## 未来可选方案

如果未来能力，可以：

需要更强大的1. **轻量级工具抽象** - 参考 pi 的工具签名
2. **增强流式响应** - 自己实现 SSE
3. **按需引入** - 只引入需要的模块

---

**建议：保持当前架构，持续迭代**
