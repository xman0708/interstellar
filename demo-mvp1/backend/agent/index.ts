/**
 * Agent Runtime v6 - 智能技能执行
 * 
 * 特点：
 * - 多轮意图识别
 * - 技能执行 + 重试机制
 * - 错误回退
 * - 循环检测
 * - 上下文记忆
 */

import { buildSystemPrompt } from './prompt.js';
import { SessionManager, type Session } from './session/sessionManager.js';
import { dataToUIResponse } from './agent-ui.js';
import type { UIResponse } from './skills/ui.js';
import { getLevel } from './services/brain.js';
import { executeSkill, getSkillList, SKILLS } from './skills/registry.js';
import { recordInteraction, getSmartLevel, getOptimizationSuggestions } from './services/evolution.js';
import { classifyIntent, classifyIntentSimple, type IntentResult } from './services/intentClassifier.js';
import { executeSelfCoder } from './skills/selfCoderSkill.js';
import { runAgentLoop } from './services/agentLoop.js';

const API_KEY = process.env.MINIMAX_API_KEY || '';
const BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/anthropic';
const MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.5';

const MAX_RETRIES = 2;
const MAX_ITERATIONS = 3;
const MAX_CODE_LOOPS = 3;

// 简单的上下文存储（内存中）
const sessionContext: Map<string, { pendingEmail?: { to: string; subject: string; body: string } }> = new Map();

export interface AgentRequest {
  message: string;
  sessionId?: string;
  context?: Record<string, any>;
}

export interface AgentResponse {
  sessionId: string;
  ui: UIResponse;
  skillUsed?: string;
  turns?: number;
  brain?: any;
}

/**
 * 获取会话上下文
 */
function getSessionContext(sessionId: string) {
  if (!sessionContext.has(sessionId)) {
    sessionContext.set(sessionId, {});
  }
  return sessionContext.get(sessionId)!;
}

/**
 * 策略1：精确关键词匹配
 */
function detectByKeywords(message: string): { intent: string; params: any } | null {
  const msg = message.toLowerCase();
  
  const keywordMap: Record<string, string[]> = {
    'api.projects.list': ['项目列表', '有哪些项目', '项目', 'projects'],
    'api.tasks.list': ['任务', '待办', 'todo', '任务列表'],
    // 邮件 - 发送才触发
    'email.send': ['发邮件', '发送邮件', '发送', '发出去', '发吧', 'send email'],
    'email.list': ['邮件列表', '有哪些邮件', '查看邮件', 'email list'],
    'email.unread': ['未读邮件', '新邮件'],
    'calendar.today': ['今日会议', '今天会议', '今天有啥会', 'calendar'],
    'calendar.upcoming': ['接下来', '即将', '一会'],
    'api.stats.work-hours': ['工时', '加班', '工作时长'],
    'api.stats.project-progress': ['项目进度', '进度'],
    'knowledge.search': ['知识库', '查知识', '查一下'],
    // 浏览器/网络
    'browser.search': ['搜索', '上网', '搜索一下', 'google', '查一下'],
    'browser.open': ['打开', '访问', '浏览网页'],
    'weather.get': ['天气', '多少度', '冷不冷', '热不热'],
    // 自我编程 (优先级高)
    'self.coder': ['修改代码', '改一下代码', '添加功能', '加个接口', '添加接口', '修改server', '在server.ts', '添加一个', '加一个', '新增接口', 'server.ts中', 'server.ts', '自己升级', '升级代码', '升级模块', '自我升级', '改一下', '优化代码', '重构'],
    // 代码
    'code.run': ['运行代码', '执行代码', '跑一下', 'run code'],
    'code.solve': ['帮我写', '写一个', '计算', '处理', '找出', '去重', '排序', '过滤', '求和'],
    'code.generate': ['生成代码', 'create code'],
  };
  
  for (const [intent, keywords] of Object.entries(keywordMap)) {
    for (const kw of keywords) {
      if (msg.includes(kw)) {
        return { intent, params: {} };
      }
    }
  }
  return null;
}

/**
 * 策略2：LLM 意图识别
 */
async function detectByLLM(message: string, history: any[]): Promise<{ intent: string; params: any } | null> {
  const skills = getSkillList();
  
  const prompt = `用户说：${message}

可用技能：${skills.map(s => s.name).join(', ')}

分析用户意图：
- 如果用户想发邮件 → {"intent": "email.send", "params": {}}
- 如果用户想查项目/任务/邮件/日历/知识库 → 调用对应技能
- 如果用户想处理文件/分析数据/写代码 → {"intent": "code.solve", "params": {}}
- 如果是闲聊或问候 → {"intent": "chat", "params": {}}

返回 JSON：`;

  try {
    const result = await callLLMDirect(prompt);
    const match = result.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.intent && parsed.intent !== 'chat' && (SKILLS[parsed.intent] || parsed.intent.startsWith('code.'))) {
        return parsed;
      }
    }
  } catch (e) {
    console.log('[Intent] LLM detect failed:', e);
  }
  return null;
}

/**
 * 从用户消息中提取邮件参数
 */
async function extractEmailParams(message: string): Promise<{ to: string; subject: string; body: string }> {
  const prompt = `从用户消息中提取邮件信息：
用户消息：${message}
返回 JSON：{"to": "收件人", "subject": "主题", "body": "正文"}`;

  try {
    const result = await callLLMDirect(prompt);
    const match = result.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        to: parsed.to || 'unknown@example.com',
        subject: parsed.subject || '无主题',
        body: parsed.body || message
      };
    }
  } catch (e) {
    console.log('[EmailParams] Extract failed:', e);
  }
  return { to: 'unknown@example.com', subject: '无主题', body: message };
}

/**
 * 从用户消息中提取搜索关键词
 */
async function extractSearchQuery(message: string): Promise<string> {
  // 直接从消息中提取
  const patterns = [
    /(?:搜索|google|上网查|查一下)\s*(.+)/i,
    /(.+?)(?:怎么|如何|是什么|教程)/,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // 如果没匹配到，返回原消息
  return message.trim();
}

/**
 * 智能代码执行循环
 */
async function smartCodeExecute(message: string): Promise<UIResponse> {
  console.log('[SmartCode] Starting autonomous code execution');
  
  let code = '';
  
  const generatePrompt = `写JavaScript代码：${message}
直接输出代码，用console.log输出结果。不要其他内容。`;

  try {
    let rawCode = await callLLMDirect(generatePrompt);
    const codeMatch = rawCode.match(/```[\s\S]*?```/);
    if (codeMatch) {
      code = codeMatch[0].replace(/```\w*\n?/g, '').trim();
    } else {
      code = rawCode.trim();
    }
    code = code.split('\n').filter(l => !l.match(/^(以下是|代码|这样|下面是)/)).join('\n');
    console.log('[SmartCode] Generated:', code.substring(0, 100));
  } catch (e: any) {
    return { type: 'text', content: `代码生成失败: ${e.message}` };
  }
  
  for (let loop = 0; loop < MAX_CODE_LOOPS; loop++) {
    console.log(`[SmartCode] Loop ${loop + 1}: executing...`);
    
    const execResult = await executeSkill('sandbox.execute', { code, input: null });
    const result = execResult.data || execResult;
    
    if (result.success) {
      console.log('[SmartCode] Success!', result.result);
      let output = result.result;
      if (!output || output === '执行完成（无输出）') output = '代码执行完成';
      if (typeof output === 'object') output = JSON.stringify(output, null, 2);
      
      return { 
        type: 'text', 
        content: `✅ 执行成功！\n\n\`\`\`\n${output}\n\`\`\`` 
      };
    }
    
    const lastError = result.error || '未知错误';
    console.log(`[SmartCode] Error: ${lastError}`);
    
    const fixPrompt = `修复代码错误。错误：${lastError}。原代码：${code}。直接输出修复后的代码，用console.log输出结果。`;

    try {
      let rawFix = await callLLMDirect(fixPrompt);
      const fixMatch = rawFix.match(/```[\s\S]*?```/);
      if (fixMatch) {
        code = fixMatch[0].replace(/```\w*\n?/g, '').trim();
      } else {
        code = rawFix.trim();
      }
      code = code.split('\n').filter(l => !l.match(/^(以下是|代码|这样|下面是|修复)/)).join('\n');
      console.log('[SmartCode] Fixed:', code.substring(0, 100));
    } catch (e: any) {
      return { type: 'text', content: `❌ 执行失败: ${lastError}\n\n修复代码失败: ${e.message}` };
    }
  }
  
  return { type: 'text', content: `❌ 执行多次仍未成功\n\n代码:\n\`\`\`\n${code}\n\`\`\`` };
}

/**
 * 智能技能执行器
 */
async function smartExecute(message: string, history: any[]): Promise<{ intent: string; result: any; ui: UIResponse } | null> {
  const triedIntents = new Set<string>();
  
  // ===== 检查是否是回答澄清问题 =====
  // 如果上一条消息是 clarification，直接执行 self_coder
  const lastAIMessage = history.filter(m => m.role === 'assistant').pop();
  const isAnsweringClarification = lastAIMessage?.content?.includes('你想') && 
    (lastAIMessage.content.includes('？') || lastAIMessage.content.includes('?'));
  
  if (isAnsweringClarification) {
    console.log('[SmartExec] User answered clarification, executing self.coder...');
    const coderResult = await executeSelfCoder(message);
    return {
      intent: 'self.coder',
      result: coderResult,
      ui: { type: 'text', content: coderResult.message }
    };
  }
  
  // ===== 新增: LLM Intent Classifier =====
  console.log('[SmartExec] Using LLM Intent Classifier...');
  const llmIntent = await classifyIntent(message);
  console.log('[SmartExec] LLM Intent:', JSON.stringify(llmIntent));
  
  // 如果需要澄清，返回澄清问题
  if (llmIntent.needsClarify && llmIntent.clarification) {
    return {
      intent: 'clarification',
      result: null,
      ui: { type: 'text', content: llmIntent.clarification }
    };
  }
  
  // 处理 self_coder 意图
  if (llmIntent.intent === 'self_coder') {
    console.log('[SmartExec] Executing self.coder...');
    const coderResult = await executeSelfCoder(message);
    return {
      intent: 'self.coder',
      result: coderResult,
      ui: { type: 'text', content: coderResult.message }
    };
  }
  
  // 处理 skill 意图
  if (llmIntent.intent === 'skill' && llmIntent.skillName) {
    console.log(`[SmartExec] Executing skill: ${llmIntent.skillName}`);
    try {
      const result = await executeSkill(llmIntent.skillName, { message });
      const ui = dataToUIResponse(result);
      return {
        intent: llmIntent.skillName,
        result,
        ui
      };
    } catch (e: any) {
      console.log('[SmartExec] Skill failed:', e.message);
    }
  }
  
  // ===== 原有逻辑作为后备 =====
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    console.log(`[SmartExec] Fallback Iteration ${iteration + 1}`);
    
    let intentResult = detectByKeywords(message);
    
    if (!intentResult || triedIntents.has(intentResult.intent)) {
      intentResult = await detectByLLM(message, history);
    }
    
    if (!intentResult || intentResult.intent === 'chat') {
      break;
    }
    
    let intent = intentResult.intent;
    triedIntents.add(intent);
    
    let skillParams = { message, ...intentResult.params };
    
    // 根据意图类型提取参数
    if (intent === 'email.send') {
      console.log('[SmartExec] Extracting email params...');
      const emailParams = await extractEmailParams(message);
      skillParams = { ...skillParams, ...emailParams };
    } else if (intent === 'browser.search') {
      // 提取搜索关键词
      const searchMatch = message.match(/(?:搜索|google|上网查|查一下)\s*(.+)/i);
      if (searchMatch) {
        skillParams.query = searchMatch[1].trim();
      } else {
        // 用 LLM 提取
        const searchQuery = await extractSearchQuery(message);
        skillParams.query = searchQuery;
      }
      console.log('[SmartExec] Search query:', skillParams.query);
    } else if (intent === 'browser.open') {
      // 处理打开网页请求 - 优先打开URL
      let url = '';
      
      // 匹配英文URL
      const urlMatch = message.match(/(https?:\/\/[^\s]+)|(www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
      if (urlMatch) {
        url = urlMatch[1] || urlMatch[2];
        if (url && !url.startsWith('http')) {
          url = 'https://' + url;
        }
      }
      
      // 如果没有URL，尝试匹配中文关键词
      if (!url) {
        // 检查是否提到具体的网站名
        const siteMatch = message.match(/(百度|谷歌|google|知乎|b站|淘宝|京东|微博|抖音)/);
        if (siteMatch) {
          // 打开对应网站
          const sites: Record<string, string> = {
            '百度': 'https://www.baidu.com',
            '谷歌': 'https://www.google.com',
            'google': 'https://www.google.com',
            '知乎': 'https://www.zhihu.com',
            'b站': 'https://www.bilibili.com',
            '淘宝': 'https://www.taobao.com',
            '京东': 'https://www.jd.com',
            '微博': 'https://weibo.com',
            '抖音': 'https://www.douyin.com'
          };
          url = sites[siteMatch[1]] || '';
        }
        
        // 如果还是没有，提取关键词搜索
        if (!url) {
          const keywords = message.replace(/(打开|访问|浏览)/g, '').trim();
          if (keywords) {
            skillParams.query = keywords;
            intent = 'browser.search';
          }
        }
      }
      
      if (url) {
        skillParams.url = url;
      }
    } else if (intent === 'weather.get') {
      // 提取城市
      const cityMatch = message.match(/(?:北京|上海|广州|深圳|杭州|南京|武汉|成都|西安|重庆)(?:天气|的天气)?/);
      if (cityMatch) {
        skillParams.city = cityMatch[1] || cityMatch[0].replace('天气', '');
      } else {
        // 默认北京
        skillParams.city = '北京';
      }
    }
    
    for (let retry = 0; retry <= MAX_RETRIES; retry++) {
      try {
        console.log(`[SmartExec] Executing ${intent} (retry=${retry})`);
        
        const result = await executeSkill(intent, skillParams);
        const ui = formatResult(intent, result);
        
        return { intent, result, ui };
        
      } catch (error: any) {
        console.log(`[SmartExec] Error: ${error.message}`);
        if (retry < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }
  }
  
  return null;
}

/**
 * 格式化技能结果
 */
function formatResult(intent: string, result: any): UIResponse {
  console.log('[FormatResult] intent:', intent, 'result keys:', Object.keys(result || {}));
  const data = result.data || result;
  const items = Array.isArray(data) ? data : (data.items || data.data || []);
  
  let text = '';
  
  switch (intent) {
    case 'api.projects.list':
      if (items.length === 0) {
        text = '暂无项目';
      } else {
        const done = items.filter((p: any) => p.status === '已完成').length;
        text = `共${items.length}个项目，${done}个已完成：\n`;
        items.forEach((p: any) => {
          const emoji = p.status === '已完成' ? '✅' : '🔄';
          text += `${emoji} ${p.name} ${p.progress}%\n`;
        });
      }
      break;
      
    case 'api.tasks.list':
      if (items.length === 0) {
        text = '暂无任务';
      } else {
        const done = items.filter((t: any) => t.status === 'done' || t.status === '已完成').length;
        text = `共${items.length}个任务，${done}个已完成：\n`;
        items.forEach((t: any) => {
          const emoji = t.status === 'done' || t.status === '已完成' ? '✅' : '🔲';
          text += `${emoji} ${t.title || t.name}\n`;
        });
      }
      break;
      
    case 'calendar.today':
    case 'calendar.upcoming':
      if (items.length === 0) {
        text = '没有会议安排 🎉';
      } else {
        text = `有${items.length}个会议：\n`;
        items.forEach((e: any) => {
          const time = e.start?.substring(11, 16) || e.time || '';
          text += `📅 ${e.title} ${time}\n`;
        });
      }
      break;
      
    case 'email.list':
    case 'email.unread':
      if (items.length === 0) {
        text = '没有邮件 📭';
      } else {
        const unread = items.filter((e: any) => !e.read).length;
        text = `${items.length}封邮件`;
        if (unread > 0) text += `，${unread}封未读 📧`;
        text += '\n';
        items.slice(0, 3).forEach((e: any) => {
          const unreadMark = e.read ? '' : '🔴';
          text += `${unreadMark} ${e.from}: ${e.subject}\n`;
        });
      }
      break;
      
    case 'email.send':
      if (data.success) {
        text = `✅ 邮件发送成功！\n\n📧 收件人: ${data.email?.to || 'unknown'}\n📝 主题: ${data.email?.subject || '无主题'}`;
      } else {
        text = `❌ 发送失败: ${data.error}`;
      }
      break;
      
    case 'browser.search':
      if (data.action === 'smart-search' && data.results) {
        let t = `✅ 搜索完成: "${data.query}"\n\n📱 浏览器窗口已显示: ${data.title}\n\n🔗 可打开的链接：\n\n`;
        data.results.slice(0, 8).forEach((r: any, i: number) => {
          t += `${i + 1}. ${r.title}\n`;
        });
        t += `\n💡 说"打开第X个"可以打开对应页面`;
        text = t.substring(0, 500);
      } else if (data.action === 'open-result') {
        text = `✅ 已打开: ${data.title}\n\n📱 浏览器窗口已显示页面`;
      } else if (data.success && data.results) {
        text = `🔍 搜索结果：\n`;
        data.results.slice(0, 5).forEach((r: any, i: number) => {
          text += `${i + 1}. ${r.title}\n`;
        });
      } else {
        text = `❌ 搜索失败: ${data.error || '未知'}`;
      }
      break;
      
    case 'browser.browse':
      if (data.success) {
        text = `🌐 ${data.title}\n${data.url}\n\n${data.content?.substring(0, 500)}...`;
      } else {
        text = `❌ 浏览失败: ${data.error}`;
      }
      break;
      
    case 'weather.get':
      if (data.success) {
        text = `🌤️ ${data.city}今日天气 (${data.source || 'wttr.in'})\n\n`;
        text += `📌 ${data.condition}\n`;
        text += `🌡️ 温度: ${data.temp}°C (体感 ${data.feels}°C)\n`;
        text += `💧 湿度: ${data.humidity}%\n`;
        text += `🌬️ 风速: ${data.wind} km/h`;
      } else if (data.error?.includes('Network') || data.error?.includes('fetch')) {
        text = `🌧️ 天气服务暂时无法访问网络。

你可以：
1. 直接告诉我你在哪个城市
2. 或者上网搜一下告诉我`;
      } else {
        text = `❌ 天气查询失败: ${data.error}`;
      }
      break;
      
    case 'browser.search':
      console.log('[FormatResult] browser.search case, data:', JSON.stringify(data).substring(0, 200));
      if (data.action === 'smart-search' && data.results) {
        let t = `✅ 搜索完成: "${data.query}"\n\n📱 浏览器窗口已显示: ${data.title}\n\n🔗 可打开的链接：\n\n`;
        data.results.slice(0, 8).forEach((r: any, i: number) => {
          t += `${i + 1}. ${r.title}\n`;
        });
        t += `\n💡 说"打开第X个"可以打开对应页面`;
        text = t.substring(0, 500);
      } else if (data.success && data.results) {
        text = `🔍 搜索结果：\n`;
        data.results.slice(0, 5).forEach((r: any, i: number) => {
          text += `${i + 1}. ${r.title}\n`;
        });
      } else {
        text = `❌ 搜索失败: ${data.error || '未知'}`;
      }
      break;
      
    default:
      if (items.length > 0) {
        text = JSON.stringify(items, null, 2).substring(0, 300);
      } else {
        text = JSON.stringify(data, null, 2).substring(0, 200);
      }
  }
  
  return { type: 'text', content: text };
}

/**
 * 调用 LLM
 */
async function callLLM(message: string, history: any[]): Promise<string> {
  const systemPrompt = await buildSystemPrompt();
  
  const messages = [{ role: 'user', content: [{ type: 'text', text: message }] }];
  
  for (const m of history.slice(-6)) {
    if (m.content && m.content.trim()) {
      messages.unshift({ role: m.role, content: [{ type: 'text', text: m.content.substring(0, 200) }] });
    }
  }
  
  const body: any = { model: MODEL, max_tokens: 500, messages, system: systemPrompt };
  
  const response = await fetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) throw new Error(`LLM error: ${response.status}`);
  
  const data = await response.json();
  return (data.content || []).map((b: any) => b.type === 'text' ? b.text : '').join('');
}

async function callLLMDirect(prompt: string): Promise<string> {
  const body: any = {
    model: MODEL, max_tokens: 512,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
  };
  
  const response = await fetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) throw new Error(`LLM error: ${response.status}`);
  
  const data = await response.json();
  return (data.content || []).map((b: any) => b.type === 'text' ? b.text : '').join('');
}

/**
 * Agent 主入口
 */
export async function agentChat(request: AgentRequest): Promise<AgentResponse> {
  const { message, sessionId } = request;
  
  console.log('\n========== Agent Turn ==========');
  console.log('[Agent] Message:', message);
  
  const session = SessionManager.getSession(sessionId);
  const turns = Math.floor(session.messages.length / 2);
  const history = session.getHistory();
  
  session.addMessage({ role: 'user', content: message });
  
  // ===== PI-Mono Style Agent Loop =====
  console.log('[Agent] Using PI-Mono style agent loop...');
  
  try {
    const result = await runAgentLoop(message, history, session.id);
    
    session.addMessage({ role: 'assistant', content: result.response });
    
    return {
      sessionId: session.id,
      ui: { type: 'text', content: result.response },
      skillUsed: result.toolCalls[0] || 'chat',
      turns,
      brain: getSmartLevel()
    };
  } catch (error: any) {
    console.error('[Agent] Agent loop error:', error);
    
    // Fallback to old logic
    console.log('[Agent] Falling back to old logic...');
    return await agentChatFallback(request, session, history, turns);
  }
}

/**
 * Fallback - 原有逻辑
 */
async function agentChatFallback(request: AgentRequest, session: any, history: any[], turns: number): Promise<AgentResponse> {
  const { message } = request;
  const msg = message.toLowerCase();
  let ui: UIResponse;
  let skillUsed: string | undefined;
  const ctx = getSessionContext(session.id);
  
  // 检查上下文：待发送的邮件
  const isWriteEmail = msg.includes('写邮件') || msg.includes('创建邮件') || msg.includes('起草邮件');
  const wantsToSend = msg.includes('发送') || msg.includes('发吧') || msg.includes('发出去');
  
  if (ctx.pendingEmail && wantsToSend) {
    console.log('[Agent] Sending pending email from context');
    const result = await executeSkill('email.send', ctx.pendingEmail);
    ui = formatResult('email.send', { success: true, data: result });
    skillUsed = 'email.send';
    ctx.pendingEmail = undefined;
  } else if (isWriteEmail) {
    // 起草邮件，保存到上下文
    console.log('[Agent] Drafting email, saving to context');
    const emailParams = await extractEmailParams(message);
    ctx.pendingEmail = emailParams;
    ui = { 
      type: 'text', 
      content: `📝 邮件已准备好：\n\n📧 收件人: ${emailParams.to}\n📝 主题: ${emailParams.subject}\n\n💡 输入"发送"或"发吧"即可发送这封邮件` 
    };
  } else {
    const codeKeywords = ['写代码', '生成代码', '处理', '计算', '读取', '分析'];
    const isCodeRequest = codeKeywords.some(kw => msg.includes(kw));
    
    if (isCodeRequest) {
      console.log('[Agent] Code request, using smart code execution');
      ui = await smartCodeExecute(message);
      skillUsed = 'code.auto';
    } else {
      const execResult = await smartExecute(message, history);
      
      if (execResult) {
        ui = execResult.ui;
        skillUsed = execResult.intent;
        console.log('[Agent] Skill executed:', execResult.intent);
        
      } else {
        console.log('[Agent] Fallback to LLM chat');
        try {
          const responseText = await callLLM(message, history);
          ui = { type: 'text', content: responseText };
        } catch (error: any) {
          console.log('[Agent] LLM error:', error.message);
          ui = { type: 'text', content: '抱歉，我遇到了一些问题。请稍后再试。' };
        }
      }
    }
  }
  
  session.addMessage({ role: 'assistant', content: JSON.stringify(ui) });
  
  // 记录进化数据
  recordInteraction(!!skillUsed, skillUsed, message.substring(0, 20));
  
  console.log('[Agent] UI Type:', ui.type);
  console.log('========== End Turn ==========\n');
  
  return { sessionId: session.id, ui, skillUsed, turns, brain: getSmartLevel() };
}

export { SessionManager };
