/**
 * Intent Classifier - LLM 意图识别
 * 
 * 每句话都先过 LLM 判断用户真正想做什么
 */

const API_KEY = process.env.MINIMAX_API_KEY || '';

export interface IntentResult {
  intent: 'skill' | 'self_coder' | 'chat' | 'unknown';
  skillName?: string;
  action?: string;
  target?: string;
  params?: Record<string, any>;
  confidence: number;
  message: string;
  needsClarify: boolean;
  clarification?: string;
}

// 可用技能列表（用于 LLM 参考）
const SKILL_MANIFEST = `
## 可用技能

### 业务 API
- api.projects.list: 获取项目列表
- api.tasks.list: 获取任务列表
- api.stats.work-hours: 获取工时统计
- api.stats.project-progress: 获取项目进度

### 邮件
- email.list: 查看邮件列表
- email.unread: 查看未读邮件
- email.send: 发送邮件

### 日历
- calendar.today: 今日会议
- calendar.upcoming: 即将到来的会议

### 知识库
- knowledge.search: 搜索知识库

### 浏览器
- browser.search: 搜索网页
- browser.open: 打开网页

### 天气
- weather.get: 查询天气

### 代码
- code.run: 运行代码
- code.solve: 代码解题
- code.generate: 生成代码

### 自我编程
- self.coder: 修改/升级 LivingCode 自己的代码

### 自我感知
- self.awareness: 了解自己的能力边界
`;

const INTENT_PROMPT = `你是一个意图分类器。根据用户消息，判断用户真正想做什么。

${SKILL_MANIFEST}

## 判断规则

1. 如果用户想让你修改/升级/优化 LivingCode 自己的代码 → intent: "self_coder"
2. 如果用户想执行某个具体技能（如查邮件、看天气）→ intent: "skill"
3. 如果用户只是聊天、问问题 → intent: "chat"
4. 如果不确定用户想做什么 → intent: "unknown"

## 输出格式 (JSON)

{
  "intent": "skill|self_coder|chat|unknown",
  "skillName": "技能名（如 email.list）",
  "action": "动作（如 query, update, create）",
  "target": "目标（如 email, calendar）",
  "confidence": 0.0-1.0,
  "needsClarify": true|false,
  "clarification": "如果需要澄清，说明要问什么"
}

## 示例

用户: "帮我查查有哪些邮件"
→ {"intent": "skill", "skillName": "email.list", "action": "query", "target": "email", "confidence": 0.95, "needsClarify": false}

用户: "你自己升级下邮件模块"
→ {"intent": "self_coder", "action": "upgrade", "target": "email module", "confidence": 0.9, "needsClarify": false}

用户: "今天天气怎么样"
→ {"intent": "skill", "skillName": "weather.get", "action": "query", "target": "weather", "confidence": 0.95, "needsClarify": false}

用户: "你好"
→ {"intent": "chat", "confidence": 0.95, "needsClarify": false}

用户: "帮我优化下代码"
→ {"intent": "self_coder", "action": "optimize", "target": "code", "confidence": 0.85, "needsClarify": true, "clarification": "你想优化哪个文件或模块？"}

---

用户消息: "{{MESSAGE}}"

请直接输出 JSON，不要其他内容:`;

/**
 * 使用 LLM 进行意图识别 (使用 fetch)
 */
export async function classifyIntent(message: string): Promise<IntentResult> {
  try {
    // 先用简单匹配作为后备
    const simpleResult = classifyIntentSimple(message);
    if (simpleResult.intent !== 'chat') {
      return simpleResult;
    }
    
    const prompt = INTENT_PROMPT.replace('{{MESSAGE}}', message);
    
    const response = await fetch('https://api.minimaxi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.5',
        messages: [
          { role: 'system', content: '你是一个意图分类器，直接输出 JSON。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      console.error('[IntentClassifier] API error:', response.status);
      // API 失败时使用简单匹配
      return simpleResult;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        intent: result.intent || 'unknown',
        skillName: result.skillName,
        action: result.action,
        target: result.target,
        confidence: result.confidence || 0.5,
        needsClarify: result.needsClarify || false,
        clarification: result.clarification,
        message
      };
    }
    
    // 解析失败，返回简单匹配结果
    return simpleResult;
    
  } catch (error) {
    console.error('[IntentClassifier] Error:', error);
    // 出错时使用简单匹配
    return classifyIntentSimple(message);
  }
}

/**
 * 简单版本（不调用 LLM，快速匹配）
 */
export function classifyIntentSimple(message: string): IntentResult {
  const msg = message.toLowerCase();
  
  // 自我编程关键词
  const selfCoderKeywords = ['改一下', '修改代码', '升级', '优化', '重构', '添加功能', '自己', '自我'];
  if (selfCoderKeywords.some(kw => msg.includes(kw))) {
    return {
      intent: 'self_coder',
      action: 'modify',
      confidence: 0.7,
      message,
      needsClarify: true,
      clarification: '你想修改哪个模块或文件？'
    };
  }
  
  // 技能关键词
  const skillKeywords: Record<string, string[]> = {
    'email.list': ['邮件列表', '有哪些邮件', '查看邮件'],
    'email.send': ['发邮件', '发送邮件'],
    'weather.get': ['天气', '多少度'],
    'calendar.today': ['今日会议', '今天会议'],
    'knowledge.search': ['知识库', '查知识'],
    'browser.search': ['搜索', '上网'],
  };
  
  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    if (keywords.some(kw => msg.includes(kw))) {
      return {
        intent: 'skill',
        skillName: skill,
        confidence: 0.8,
        message,
        needsClarify: false
      };
    }
  }
  
  // 默认 chat
  return {
    intent: 'chat',
    confidence: 0.5,
    message,
    needsClarify: false
  };
}
