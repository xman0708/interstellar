# 双环自演进架构 (Dual-Loop Self-Evolution Architecture)

该架构分为两个核心循环：**执行环（L1）** 负责快速响应用户，**演进环（L2）** 负责复盘、学习和自我重构。

## 1. 核心组件设计

### A. 感知层 (The Sensory Layer) - “数字神经末梢”
* **统一观察器 (Unified Observer)**：不只是记录 Log，而是捕获“上下文快照”。包括堆栈信息、CPU/内存状态、用户情绪、安全拦截反馈等。
* **语义事件总线 (Semantic Event Bus)**：将系统行为转化为结构化的“经验元数据”（Experience Metadata）。

### B. 决策层 (The Cognitive Layer) - “大脑”
* **意图解释器 (Intent Interpreter)**：将用户模糊的需求转化为具体的 Plan。
* **策略评估器 (Strategy Evaluator)**：对 Plan 进行安全性（如执行审计）和成本评估。

### C. 演进层 (The Evolutionary Layer) - “免疫与突变”
* **反思引擎 (Reflection Engine)**：异步扫描“执行环”中的失败案例，根因分析并生成对策。
* **代码实验室 (Sandbox Lab)**：隔离的 Docker 沙箱环境，在推送生产环境前验证新生成的脚本和修复。

## 2. 知识沉淀与自我重写
系统会将分析结果与解决方案沉淀至 RAG（向量数据库）中，作为记忆基础。下一次遇到类似情况时，大脑将跳过盲试，直接采用已演进的最优解。
