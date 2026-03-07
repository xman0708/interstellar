/**
 * PI-Mono Style Agent Loop
 * 
 * LLM 决定使用工具，然后执行工具
 */

import { TOOLS, executeTool } from './toolRegistry.js';

const API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-saV7qhcrLNkCCmQs-wF1Y4vCm_EGwQtCgh2NaB5LuG0JAUiNGqpTd3VPTSmbwOY-JZ6HVmq4Hk6FnD5RGhoVs94zdvusv5qifTaNBX492VkOUWc7xkuTgo0';

const MAX_LOOP = 3;

/**
 * 解析工具调用
 */
function extractToolCalls(text: string): { name: string; params: any }[] {
  const calls: { name: string; params: any }[] = [];
  const toolNames = Object.keys(TOOLS);
  
  for (const name of toolNames) {
    if (text.includes(name) || text.includes(TOOLS[name].description.slice(0, 20))) {
      // 尝试提取参数
      const params: any = {};
      
      // 提取城市
      const cityMatch = text.match(/(?:城市|在|北京|上海|广州|深圳)([^\s，。,]{2,6})/);
      if (cityMatch) {
        params.city = cityMatch[1];
      }
      
      // 提取查询
      const queryMatch = text.match(/(?:搜索|查询|关于)([^\n]{2,30})/);
      if (queryMatch) {
        params.query = queryMatch[1].trim();
      }
      
      // 提取请求
      const requestMatch = text.match(/(?:修改|升级|优化|添加)([^\n]{2,50})/);
      if (requestMatch) {
        params.request = requestMatch[1].trim();
      }
      
      calls.push({ name, params });
    }
  }
  
  return calls;
}

/**
 * PI-Mono 风格 Agent Loop
 */
export async function runAgentLoop(userMessage: string, history: any[] = []): Promise<{ response: string; toolCalls: string[] }> {
  const tools = TOOLS;
  const toolList = Object.values(tools).map(t => `- ${t.name}: ${t.description}`).join('\n');
  
  const messages: any[] = [
    { role: 'system', content: `你是一个智能助手 LivingCode。

## 可用工具
${toolList}

## 规则
- 用户问天气 → 调用 get_weather
- 用户查邮件 → 调用 list_emails
- 用户要你改代码 → 调用 self_coder
- 其他直接回复

直接回复用户，不需要展示工具调用过程。` }
  ];
  
  // 添加最近2轮历史
  for (const msg of history.slice(-4)) {
    messages.push({ role: msg.role, content: msg.content });
  }
  
  messages.push({ role: 'user', content: userMessage });
  
  console.log('[AgentLoop] Starting...');
  
  // 第一轮：LLM 决定如何回复
  try {
    const response = await fetch('https://api.minimaxi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.5',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`LLM error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';
    
    console.log('[AgentLoop] LLM response:', content.slice(0, 100));
    
    // 检测是否需要执行工具
    const toolCalls = extractToolCalls(content);
    
    if (toolCalls.length > 0) {
      console.log('[AgentLoop] Detected tool calls:', toolCalls);
      
      // 执行工具
      for (const tc of toolCalls) {
        const result = await executeTool(tc.name, tc.params);
        console.log('[AgentLoop] Tool result:', JSON.stringify(result).slice(0, 100));
        
        // 把工具结果告诉 LLM，让它生成最终回复
        messages.push({ role: 'assistant', content });
        messages.push({ role: 'system', content: `工具 ${tc.name} 返回结果: ${JSON.stringify(result).slice(0, 500)}` });
        
        const finalResponse = await fetch('https://api.minimaxi.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify({
            model: 'MiniMax-M2.5',
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            max_tokens: 1000,
            temperature: 0.7
          })
        });
        
        const finalData = await finalResponse.json();
        content = finalData.choices?.[0]?.message?.content || content;
      }
    }
    
    return { response: content, toolCalls: toolCalls.map(t => t.name) };
  } catch (error) {
    console.error('[AgentLoop] Error:', error);
    throw error;
  }
}
