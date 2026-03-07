/**
 * PI-Mono Style Agent Loop - 智能版
 * 
 * LLM 主动决定要做什么，不犹豫
 */

import { TOOLS, executeTool } from './toolRegistry.js';

const API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-saV7qhcrLNkCCmQs-wF1Y4vCm_EGwQtCgh2NaB5LuG0JAUiNGqpTd3VPTSmbwOY-JZ6HVmq4Hk6FnD5RGhoVs94zdvusv5qifTaNBX492VkOUWc7xkuTgo0';

/**
 * 分析用户意图，返回最合适的工具
 */
function analyzeIntent(message: string): { name: string; params: any } | null {
  const msg = message.toLowerCase();
  
  // 天气
  if (msg.includes('天气')) {
    // 尝试提取城市
    const cities = ['北京', '上海', '广州', '深圳', '杭州', '南京', '成都'];
    for (const city of cities) {
      if (msg.includes(city)) {
        return { name: 'get_weather', params: { city } };
      }
    }
    return { name: 'get_weather', params: { city: '上海' } };
  }
  
  // 邮件 - 查列表
  if (msg.includes('邮件') || msg.includes('邮箱')) {
    if (msg.includes('未读')) {
      return { name: 'unread_emails', params: {} };
    }
    return { name: 'list_emails', params: {} };
  }
  
  // 发送邮件
  if (msg.includes('发邮件') || msg.includes('发送邮件')) {
    // 需要提取参数，这里简化处理
    return { name: 'list_emails', params: {} };
  }
  
  // 会议
  if (msg.includes('会议') || msg.includes('日程')) {
    if (msg.includes('今天') || msg.includes('今日')) {
      return { name: 'today_meetings', params: {} };
    }
    return { name: 'upcoming_meetings', params: {} };
  }
  
  // 项目
  if (msg.includes('项目')) {
    return { name: 'list_projects', params: {} };
  }
  
  // 任务
  if (msg.includes('任务') || msg.includes('待办') || msg.includes('todo')) {
    return { name: 'list_tasks', params: {} };
  }
  
  // 工时
  if (msg.includes('工时') || msg.includes('加班')) {
    return { name: 'work_hours', params: {} };
  }
  
  // 知识库
  if (msg.includes('知识库') || msg.includes('查知识')) {
    const queryMatch = message.match(/搜索|查询|关于(.+)/);
    return { name: 'search_knowledge', params: { query: queryMatch?.[1] || message } };
  }
  
  // 搜索网页
  if (msg.includes('搜索') || msg.includes('上网') || msg.includes('查一下')) {
    const queryMatch = message.match(/搜索|上网|查一下(.+)/);
    return { name: 'web_search', params: { query: queryMatch?.[1] || message } };
  }
  
  // 自我编程 - 关键词
  const selfCoderKeywords = ['改代码', '修改代码', '升级', '优化', '重构', '添加功能', '自己', '自我', '升级模块'];
  if (selfCoderKeywords.some(kw => msg.includes(kw))) {
    return { name: 'self_coder', params: { request: message } };
  }
  
  // 代码问题
  if (msg.includes('代码') || msg.includes('编程') || msg.includes('算法')) {
    return { name: 'solve_problem', params: { problem: message } };
  }
  
  return null;
}

/**
 * PI-Mono 风格 Agent Loop - 智能版
 */
export async function runAgentLoop(userMessage: string, history: any[] = []): Promise<{ response: string; toolCalls: string[] }> {
  console.log('[AgentLoop] Analyzing intent...');
  
  // 智能分析意图
  const toolCall = analyzeIntent(userMessage);
  
  if (toolCall) {
    console.log('[AgentLoop] Using tool:', toolCall.name);
    
    // 执行工具
    try {
      const result = await executeTool(toolCall.name, toolCall.params);
      console.log('[AgentLoop] Tool result:', JSON.stringify(result).slice(0, 200));
      
      // 格式化结果为回复
      let response = '';
      
      if (toolCall.name === 'get_weather') {
        const data = result?.data || result;
        if (result?.success && data) {
          response = `🌤️ ${data.city || '上海'}今日天气\n\n📌 ${data.condition}\n🌡️ 温度: ${data.temp}°C (体感 ${data.feels}°C)\n💧 湿度: ${data.humidity}%`;
        } else {
          response = '抱歉，天气服务暂时无法获取';
        }
      } else if (toolCall.name === 'list_emails') {
        if (result?.success && result?.data) {
          const emails = result.data;
          const unread = emails.filter((e: any) => e.unread).length;
          response = `${emails.length}封邮件，${unread}封未读 📧\n`;
          emails.slice(0, 5).forEach((e: any) => {
            response += `${e.unread ? '🔴' : '⚪'} ${e.from}: ${e.subject}\n`;
          });
        } else {
          response = '暂时无法获取邮件列表';
        }
      } else if (toolCall.name === 'today_meetings') {
        if (result?.success && result?.data) {
          const events = result.data;
          if (events.length === 0) {
            response = '📅 今天没有会议安排';
          } else {
            response = `📅 今日会议 (${events.length}个)\n`;
            events.forEach((e: any) => {
              response += `• ${e.title} - ${e.start}\n`;
            });
          }
        } else {
          response = '暂时无法获取会议';
        }
      } else if (toolCall.name === 'list_projects') {
        if (result?.success && result?.data) {
          const projects = result.data;
          response = `📊 项目列表 (${projects.length}个)\n`;
          projects.forEach((p: any) => {
            response += `• ${p.name}: ${p.status}\n`;
          });
        } else {
          response = '暂时无法获取项目';
        }
      } else if (toolCall.name === 'list_tasks') {
        if (result?.success && result?.data) {
          const tasks = result.data;
          response = `📋 任务列表 (${tasks.length}个)\n`;
          tasks.forEach((t: any) => {
            response += `• ${t.title} [${t.status || 'todo'}]\n`;
          });
        } else {
          response = '暂时无法获取任务';
        }
      } else if (toolCall.name === 'work_hours') {
        if (result?.success && result?.data) {
          const data = result.data;
          response = `⏱️ 工时统计\n\n`;
          for (const [name, hours] of Object.entries(data)) {
            response += `• ${name}: ${hours}小时\n`;
          }
        } else {
          response = '暂时无法获取工时';
        }
      } else if (toolCall.name === 'self_coder') {
        // 自我编程
        return { response: '好的，我来帮你修改代码。让我分析一下当前项目结构...', toolCalls: [toolCall.name] };
      } else if (toolCall.name === 'web_search') {
        if (result?.success) {
          response = `🔍 搜索结果:\n\n${result.data?.slice(0, 500) || '无结果'}`;
        } else {
          response = '搜索失败: ' + (result?.error || '未知错误');
        }
      } else {
        // 默认 JSON 格式化
        response = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      }
      
      return { response, toolCalls: [toolCall.name] };
    } catch (error: any) {
      console.error('[AgentLoop] Tool error:', error);
      return { response: `执行出错: ${error.message}`, toolCalls: [] };
    }
  }
  
  // 没有匹配的工具，直接用 LLM 回复
  console.log('[AgentLoop] No tool matched, using LLM...');
  
  const messages: any[] = [
    { role: 'system', content: '你是 LivingCode，一个智能助手。用中文简洁回复用户。' }
  ];
  
  for (const msg of history.slice(-4)) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });
  
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
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '抱歉，我不知道如何回答';
    
    return { response: content, toolCalls: [] };
  } catch (error) {
    return { response: '抱歉，出错了', toolCalls: [] };
  }
}
