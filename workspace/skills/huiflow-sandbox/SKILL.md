---
name: huiflow-sandbox
description: |
  HuiFlow 动态代码执行沙箱。用于处理非标需求、数据清洗、临时脚本执行。
  当用户说"帮我处理一下"、"提取数据"、"写个脚本"时激活。
---

# HuiFlow Sandbox Skill

在 Node.js vm 沙箱中执行动态生成的代码。

## 使用场景

1. **数据提取**：从非结构化文本中提取结构化数据
2. **格式转换**：将一种数据格式转换为另一种
3. **临时脚本**：一次性数据处理需求

## 执行方式

```typescript
{
  "action": "execute",
  "code": "// JavaScript 代码",
  "input": { ... }  // 可选，输入数据
}
```

## 沙箱限制

- **允许**：
  - JSON.parse/stringify
  - 正则表达式
  - 数组/对象操作
  - 字符串处理

- **禁止**：
  - fs 文件系统访问
  - network 网络请求
  - child_process 子进程
  - eval 嵌套执行

## 示例

### 提取飞书文档数据

```javascript
// 输入：飞书导出的非规则文本
const input = `
张三 2026-03-01 项目A 8h
李四 2026-03-01 项目B 7h
`;

// 解析逻辑
const lines = input.trim().split('\n');
const result = lines.map(line => {
  const [name, date, project, hours] = line.trim().split(/\s+/);
  return { name, date, project, hours: parseFloat(hours) };
});

return result;
```

### JSON 转换

```javascript
// 输入数组，按字段分组
const input = [
  { name: "张三", dept: "技术部" },
  { name: "李四", dept: "产品部" }
];

const grouped = {};
input.forEach(item => {
  if (!grouped[item.dept]) grouped[item.dept] = [];
  grouped[item.dept].push(item.name);
});

return grouped;
```

## 返回格式

```json
{
  "success": true,
  "result": { ... },
  "executionTime": 15
}
```

## 错误处理

```json
{
  "success": false,
  "error": "SyntaxError: Unexpected token...",
  "message": "代码执行失败"
}
```

## 安全铁律

> **禁止执行的代码模式**
> - 任何包含 `require`、`import` 的代码
> - 任何访问 `process`、`global` 的代码
> - 任何无限循环（while(true) 等）
> - 任何超过 5 秒执行的代码

超时或违规代码会被自动终止。
