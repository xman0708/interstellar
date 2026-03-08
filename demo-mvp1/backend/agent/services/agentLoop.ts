/**
 * PI-Mono Style Agent Loop - ReAct 多轮循环版
 * 
 * 架构：
 * 1. LLM 生成 <thought> + <tool_call>
 * 2. 执行工具 → 返回 tool_result  
 * 3. LLM 继续推理 → 可能再调工具 → 循环
 * 4. 直到: lifecycle: end / error / abort / timeout
 */

import { executeTool } from './toolRegistry.js';
import { recordQuery, recordAction } from './userHabits.js';
import { addMessage, getContext } from './sessionMemory.js';
import { runReActLoop } from './reactLoop.js';

const API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-saV7qhcrLNkCCmQs-wF1Y4vCm_EGwQtCgh2NaB5LuG0JAUiNGqpTd3VPTSmbwOY-JZ6HVmq4Hk6FnD5RGhoVs94zdvusv5qifTaNBX492VkOUWc7xkuTgo0';
const MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.5';

const MAX_ITERATIONS = 10;
const MAX_TIMEOUT = 600000;

// 可用工具
const TOOLS_SCHEMA = [
  { name: 'get_weather', description: '查询城市天气', params: { city: 'string' } },
  { name: 'list_emails', description: '查看邮件列表', params: {} },
  { name: 'unread_emails', description: '查看未读邮件', params: {} },
  { name: 'today_meetings', description: '查看今日会议', params: {} },
  { name: 'upcoming_meetings', description: '查看 upcoming meetings', params: {} },
  { name: 'list_projects', description: '查看项目列表', params: {} },
  { name: 'list_tasks', description: '查看任务列表', params: {} },
  { name: 'web_search', description: '搜索网页', params: { query: 'string' } },
  { name: 'browser.open', description: '打开网页', params: { url: 'string' } },
  { name: 'browser.scroll', description: '页面滚动', params: { direction: 'string' } },
  { name: 'browser.clickButton', description: '点击按钮', params: { description: 'string' } },
  { name: 'browser.autoFill', description: '填写表单', params: { data: 'object' } },
  { name: 'browser.extractData', description: '提取页面数据', params: { pattern: 'string' } },
  { name: 'browser.saveAsPdf', description: '保存为PDF', params: {} },
  { name: 'solve_problem', description: '编程问题解答', params: { problem: 'string' } },
  { name: 'self_coder', description: '代码修改生成', params: { request: 'string' } },
];

const TOOLS_DESCRIPTION = TOOLS_SCHEMA.map(t => 
  `- ${t.name}: ${t.description}`
).join('\n');

/**
 * ReAct 主循环
 */
export async function runAgentLoop(
  userMessage: string, 
  history: any[] = [], 
  sessionId: string = 'default'
): Promise<{ 
  response: string; 
  toolCalls: string[];
  thoughts?: string[];
  lifecycle?: string;
}> {
  console.log('\n========== ReAct Loop ==========');
  console.log('[ReAct] User:', userMessage);
  
  // 记录用户查询
  recordQuery(userMessage);
  addMessage(sessionId, 'user', userMessage);
  
  // 构建消息
  const messages: any[] = [
    { 
      role: 'system', 
      content: `你是 LivingCode，一个智能浏览器助手。
        
可用工具:
${TOOLS_DESCRIPTION}

输出格式（严格 JSON）:
{"thought": "你的思考", "action": "工具名或null", "params": {}或null, "lifecycle": "continue|end|error|abort"}

规则:
1. 先思考(thought)当前情况
2. 需要工具时调用(action)，不需要则action=null
3. lifecycle=continue继续循环，end表示完成，error报错，abort中断
4. 直接输出 JSON` 
    }
  ];
  
  // 添加历史
  for (const msg of history.slice(-8)) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });
  
  const thoughts: string[] = [];
  const toolCalls: string[] = [];
  const startTime = Date.now();
  
  // ReAct 循环
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // 超时检查
    if (Date.now() - startTime > MAX_TIMEOUT) {
      console.log('[ReAct] Timeout');
      return { response: '任务执行超时', toolCalls, thoughts, lifecycle: 'timeout' };
    }
    
    console.log(`\n[ReAct] Iteration ${i + 1}/${MAX_ITERATIONS}`);
    
    try {
      // 调用 LLM
      const response = await fetch('https://api.minimaxi.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: 800,
          temperature: 0.3
        })
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // 解析 JSON
      let parsed;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        else parsed = { thought: content, action: null, lifecycle: 'end' };
      } catch { 
        parsed = { thought: content, action: null, lifecycle: 'end' };
      }
      
      const { thought, action, params, lifecycle } = parsed;
      console.log('[ReAct] Thought:', thought?.slice(0, 80));
      console.log('[ReAct] Action:', action, '| Lifecycle:', lifecycle);
      
      thoughts.push(thought);
      messages.push({ role: 'assistant', content: JSON.stringify({ thought, action, params, lifecycle }) });
      
      // 检查生命周期
      if (lifecycle === 'end') {
        addMessage(sessionId, 'assistant', thought);
        console.log('[ReAct] Done! Tools used:', toolCalls.length);
        return { response: thought, toolCalls, thoughts, lifecycle: 'end' };
      }
      
      if (lifecycle === 'error' || lifecycle === 'abort') {
        return { response: `任务${lifecycle}: ${thought}`, toolCalls, thoughts, lifecycle };
      }
      
      // 执行工具
      if (action && params) {
        try {
          console.log('[ReAct] Executing:', action, params);
          const result = await executeTool(action, params);
          
          toolCalls.push(action);
          recordAction(action);
          
          const observation = result?.success 
            ? JSON.stringify(result.data || result)
            : JSON.stringify({ error: result?.error || 'Unknown error' });
          
          console.log('[ReAct] Result:', observation?.slice(0, 100));
          messages.push({ role: 'user', content: `Observation: ${observation}` });
          
        } catch (e: any) {
          console.error('[ReAct] Tool error:', e);
          messages.push({ role: 'user', content: `Observation: ${e.message}` });
        }
      }
      
    } catch (e: any) {
      console.error('[ReAct] Error:', e);
      return { response: `执行出错: ${e.message}`, toolCalls, thoughts, lifecycle: 'error' };
    }
  }
  
  return { 
    response: '达到最大迭代次数', 
    toolCalls, 
    thoughts, 
    lifecycle: 'timeout' 
  };
}

export default { runAgentLoop };
