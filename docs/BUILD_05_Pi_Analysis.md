# LivingCode 与 pi-agent-core 对比分析

## pi-agent-core 核心特性

OpenClaw 使用的 pi-agent-core 有以下优秀设计：

### 1. 嵌入式 Agent Session

```typescript
// 直接实例化，不走 RPC
import { createAgentSession } from 'pi-coding-agent';
const session = createAgentSession(config);
```

### 2. 工具系统

| 特性 | 描述 |
|------|------|
| 工具注册 | 统一的 Tool 定义格式 |
| 执行签名 | 标准化的 execute(params) 接口 |
| 适配器 | 不同包之间的签名适配 |

### 3. 会话管理

- 生命周期完全控制
- 事件流式处理
- 压缩/分叉支持

### 4. 模型抽象

- 多提供商支持
- 自动故障转移
- 流式响应

## LivingCode 当前实现

LivingCode 已经实现了类似的架构：

| 模块 | pi-agent-core | LivingCode | 状态 |
|------|---------------|------------|------|
| Agent Loop | ✅ | ✅ | 已有 |
| Skills/Tools | ✅ | ✅ | 已有 |
| Session | ✅ | ✅ | 已有 |
| 流式响应 | ✅ | ⚠️ | 伪流式 |
| Tool 适配 | ⚠️ | ❌ | 待改进 |

## 是否需要集成 pi-agent-core？

### 方案 A: 当前架构已足够

LivingCode 当前已具备：
- ✅ 意图识别 + Skills 自动调用
- ✅ MiniMax M2.5 集成
- ✅ Session + Memory
- ✅ Heartbeat 后台任务

**优点**：
- 轻量 (~500行 vs ~5000行)
- 简单易懂
- 易于定制

### 方案 B: 集成 pi-agent-core

**优点**：
- 更强大的工具系统
- 真正的 Tool Calling
- 更好的流式处理
- 社区维护

**缺点**：
- 体积大 (~3MB)
- 学习成本高
- 定制困难

## 建议

**当前阶段：保持现状**

理由：
1. LivingCode 已满足 HuiFlow 业务需求
2. pi-agent-core 主要面向编程场景
3. 轻量架构更适合快速迭代

**未来可考虑**：
- 引入部分工具抽象
- 增强 Tool Calling 支持

---

*参考: OpenClaw docs/zh-CN/pi.md*
