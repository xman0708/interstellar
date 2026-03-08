/**
 * Agent 自主决策服务
 * LLM 自主决定调用哪些工具，自动编排任务
 */

import { executeTool } from './toolRegistry.js';
import { getRecommendations, recordAction } from './userHabits.js';

const API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-saV7qhcrLNkCCmQs-wF1Y4vCm_EGwQtCgh2NaB5LuG0JAUiNGqpTd3VPTSmbwOY-JZ6HVmq4Hk6FnD5RGhoVs94zdvusv5qifTaNBX492VkOUWc7xkuTgo0';

// 可用工具列表
const AVAILABLE_TOOLS = [
  { name: 'get_weather', description: '查询天气' },
  { name: 'list_emails', description: '查看邮件列表' },
  { name: 'unread_emails', description: '查看未读邮件' },
  { name: 'today_meetings', description: '查看今日会议' },
  { name: 'upcoming_meetings', description: '查看即将到来的会议' },
  { name: 'list_projects', description: '查看项目列表' },
  { name: 'list_tasks', description: '查看任务列表' },
  { name: 'web_search', description: '搜索网页' },
  { name: 'browser.open', description: '打开网页' },
  { name: 'browser.search', description: '浏览器搜索' },
  { name: 'browser.scroll', description: '页面滚动' },
  { name: 'browser.clickButton', description: '点击按钮' },
  { name: 'browser.autoFill', description: '填写表单' },
  { name: 'browser.extractData', description: '提取页面数据' },
  { name: 'browser.saveAsPdf', description: '保存为PDF' },
  { name: 'solve_problem', description: '编程问题解答' },
  { name: 'self_coder', description: '代码修改/生成' },
];

// 用户习惯推荐
let userHabitsCache: { queries: string[]; actions: string[] } = { queries: [], actions: [] };

function refreshHabits() {
  userHabitsCache = getRecommendations();
}

// LLM 自主决策
export async function agentDecision(message: string, context: string[] = []): Promise<{
  response: string;
  actions: { tool: string; params: any }[];
  reasoning: string;
}> {
  console.log('[AgentDecision] Analyzing:', message);
  
  // 刷新用户习惯
  refreshHabits();
  
  // 构建 prompt
  const systemPrompt = `你是 LivingCode 的智能决策引擎。用户说: "${message}"
  
可用工具:
${AVAILABLE_TOOLS.map(t => `- ${t.name}: ${t.description}`).join('\n')}

用户习惯:
- 常用搜索: ${userHabitsCache.queries.slice(0, 3).join(', ') || '无'}
- 常用操作: ${userHabitsCache.actions.slice(0, 3).join(', ') || '无'}

分析用户意图，选择最合适的工具。返回 JSON 格式:
{
  "reasoning": "你的思考过程",
  "actions": [{"tool": "工具名", "params": {...}}],
  "response": "给用户的简短回复"
}

规则:
1. 如果用户只是聊天，actions 可以为空
2. 优先使用用户习惯中的操作
3. 如果不确定，可以调用工具获取更多信息
4. actions 数组可以包含多个工具，按顺序执行

直接返回 JSON，不要其他内容。`;

  try {
    const response = await fetch('https://api.minimaxi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.5',
        messages: [
          { role: 'system', content: systemPrompt },
          ...context.slice(-4).map((c: any) => ({ role: c.role, content: c.content })),
          { role: 'user', content: message }
        ],
        max_tokens: 800,
        temperature: 0.3
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      
      // 记录用户操作
      if (result.actions && result.actions.length > 0) {
        for (const action of result.actions) {
          recordAction(action.tool);
        }
      }
      
      console.log('[AgentDecision] Decision:', result.reasoning);
      return result;
    }
    
    // 解析失败，使用默认响应
    return {
      response: content || '我理解了',
      actions: [],
      reasoning: '无法解析LLM响应'
    };
  } catch (error: any) {
    console.error('[AgentDecision] Error:', error);
    return {
      response: '抱歉，出错了',
      actions: [],
      reasoning: error.message
    };
  }
}

// 执行决策
export async function executeDecision(actions: { tool: string; params: any }[]): Promise<any[]> {
  const results: any[] = [];
  
  for (const action of actions) {
    try {
      console.log('[AgentDecision] Executing:', action.tool, action.params);
      const result = await executeTool(action.tool, action.params);
      results.push({ tool: action.tool, result });
    } catch (error: any) {
      results.push({ tool: action.tool, error: error.message });
    }
  }
  
  return results;
}

// 组合决策和执行
export async function runAgent(message: string, context: string[] = []): Promise<{
  response: string;
  results: any[];
  reasoning: string;
}> {
  // LLM 决策
  const decision = await agentDecision(message, context);
  
  // 执行动作
  const results = await executeDecision(decision.actions);
  
  return {
    response: decision.response,
    results,
    reasoning: decision.reasoning
  };
}

export default { agentDecision, executeDecision, runAgent };
