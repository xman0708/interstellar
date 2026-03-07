# 轻松环境下 MVP 技术架构设计方案 (Relaxed Environment MVP Architecture)

在“不考虑沙箱和权限安全隔离”的宽松假设下（完全信任的本地/开发服务器），构建一个具备“错误推演”和“代码热生成与执行”能力的 Living Software MVP，核心在于**极致的控制反转和运行时的自我注入**。

我们推荐使用 **Python + LangChain/LangGraph** 为核心栈，利用 Python 极强的动态和解释特性完成代码的热重载。

---

## 1. 核心技术栈选型

*   **编排与状态流转**：`LangGraph` (用于构建反思型的图结构 Agent，处理重试循环非常优雅)。
*   **LLM 交互基座**：`LangChain` 配合支持长上下文和生成代码能力强的模型（如 Claude 3.5 Sonnet 或 GPT-4o）。
*   **宿主控制与沙箱替代**：Python 内置的 `subprocess`（执行系统命令）、`ast`（语法分析）、`importlib`（热加载模块）。
*   **经验沉淀与外挂记忆**：轻量级本地文件 `TinyDB` 或简单的 `json/markdown` 文件（避免一开始就引入重型向量数据库）。

---

## 2. 架构模块设计：双 Agent 协作模式

MVP 架构只需要两个核心 Agent 节点：**执行者 (Executor)** 和 **抢救者 (Rescuer)**。

### A. Executor Node (执行者节点)
*   **职责**：接收自然语言任务，编写**初步的**代码或 Shell 脚本，并直接在当前环境中执行（没有任何权限限制）。
*   **关键机制：全局拦截**。不论是执行 `subprocess.run()` 报错，还是 `exec()` 抛出 Exception，执行者会立刻停止，并将：
    1.  预期目标 (Goal)
    2.  刚刚执行的失败代码 / 命令 (Failed Code)
    3.  完整的 Traceback 错误堆栈 (Error Log)
    打包抛给 `Rescuer Node`。

### B. Rescuer Node (抢救者节点 - 核心)
*   **职责**：系统报错后的“数字医生”，负责推演错误原因并热生成补丁。
*   **工作流 (The Reflection Loop)**：
    1.  **错误推演 (Reasoning)**：分析 Executor 传来的 Traceback。例如推断出“是因为系统没有安装 `ffmpeg`”或是“Python 语法错误”。
    2.  **热生成策略 (Hot-Patching)**：
        *   *如果是环境问题*：Rescuer 直接生成并运行环境修复命令（如 `pip install xxx` 或 `apt-get install xxx`）。
        *   *如果是代码逻辑错误*：Rescuer 生成一段新的 Python 脚本。
    3.  **动态注入与覆写 (Dynamic Injection)**：
        *   Rescuer 将新代码写入一个本地的 `.tmp_hotfix.py`。
        *   利用 Python 的 `os.system` 或 `importlib` 在主进程旁路重新执行该脚本。
    4.  **循环重试**：将修复后的执行结果重新交还给 Executor 验证，直至成功或达到最大重试次数。

---

## 3. 核心机制详解：代码热生成与执行打通

在这个 MVP 中，“代码怎么生”和“代码怎么跑”是关键。

### 机制一：The "Eval & Exec" Loop (动态求值环)
无需重启，利用 Python 的动态特性。
当 Agent 决定写一段 Python 代码来解决问题时：
```python
# 伪代码：Agent 生成的修复逻辑
generated_code = """
import requests
def fetch_data():
    return requests.get("https://...").json()
fetch_data()
"""
try:
    # 核心：直接在当前进程的内存空间内跑
    result = exec(generated_code, globals(), locals()) 
except Exception as e:
    # 如果再错，把 e 的完整堆栈再喂给 Rescuer 循环。
    pass
```

### 机制二：Shadow Scripting (影子脚本化)
对于复杂的系统级操作或需要依赖第三方库的逻辑，`exec` 可能不够稳，Agent 会转而采用文件级热更：

1.  Agent 发现需要写一段上百行的复杂逻辑。
2.  它在同级目录下新建一个文件 `/tmp_executor/living_task_abc123.py`。
3.  Agent 将生成的代码写入此文件。
4.  Agent 开启一个子进程去运行：`subprocess.run(["python3", "/tmp_executor/living_task_abc123.py"], capture_output=True)`
5.  解析 `stdout` 和 `stderr`。成功则返回，失败则把 `stderr` 送进下一个反思轮次。

### 机制三：生存法则写入 (Rule Persistence)
一旦 `Rescuer` 成功绕过了一个报错（比如它发现必须加 `--no-sandbox` 才能运行 Chrome），它会总结一条经验：
*“在当前 Mac 系统下跑 Chrome 相关操作，必须加上 --no-sandbox 参数”*
并将这句话追加到本地的 `survival_rules.txt` 中。
**Executor 在下一次接单时，Prompt 中会强制先读取 `survival_rules.txt` 作为其基座上下文（System Prompt）。** 这就是进化的 MVP 体现。

---

## 4. MVP 落地步骤建议 (1周内跑通)

1.  **搭好轮子**：用 LangGraph 建一个包含 `[Executor, Rescuer, Router]` 三个节点的图。
2.  **造一个必坑的场景**：给系统一个任务：“抓取某网页并生成一张折线图”。但故意不要在宿主机装 `matplotlib` 和 `requests`。
3.  **观察进化**：
    *   看它第一次执行是不是因为 `ModuleNotFoundError` 挂掉。
    *   看 Rescuer 是不是能查阅错误，自动执行 `pip install`。
    *   看它装完后是不是能自动回来重跑代码并真正生成图片。
4.  **跑通这一跳，生命体软件就完成了“从0到1”的呼吸。**
