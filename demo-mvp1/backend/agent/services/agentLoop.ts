/**
 * PI-Mono Style Agent Loop - 智能版 v2
 * 
 * 升级：
 * - 向量相似度意图匹配
 * - Agent 自主决策
 * - 用户习惯学习
 * - 并行执行
 */

import { TOOLS, executeTool } from './toolRegistry.js';
import { analyzeIntentSmart } from './smartIntent.js';
import { runAgent, agentDecision } from './agentDecision.js';
import { recordQuery, recordAction, getRecommendations } from './userHabits.js';
import { addMessage, updateContext, enhanceWithContext, getContext } from './sessionMemory.js';

const API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-saV7qhcrLNkCCmQs-wF1Y4vCm_EGwQtCgh2NaB5LuG0JAUiNGqpTd3VPTSmbwOY-JZ6HVmq4Hk6FnD5RGhoVs94zdvusv5qifTaNBX492VkOUWc7xkuTgo0';

/**
 * 分析用户意图 - 智能版（使用向量相似度）
 */
function analyzeIntent(message: string): { name: string; params: any } | null {
  // 使用智能意图分析
  const intents = analyzeIntentSmart(message);
  
  if (intents.length > 0 && intents[0].confidence > 0.5) {
    console.log('[AgentLoop] Smart intent matched:', intents[0].name, 'confidence:', intents[0].confidence);
    return { name: intents[0].name, params: intents[0].params };
  }
  
  // 回退到旧的关键词匹配
  return analyzeIntentLegacy(message);
}

/**
 * 旧版意图分析（兼容）
 */
function analyzeIntentLegacy(message: string): { name: string; params: any } | null {
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
  
  // 页面滚动
  if (msg.includes('滚动') || msg.includes('向上') || msg.includes('向下') || msg.includes('到底部') || msg.includes('到顶部')) {
    let direction: any = 'down';
    if (msg.includes('向上')) direction = 'up';
    else if (msg.includes('向下') || msg.includes('下翻')) direction = 'down';
    else if (msg.includes('顶') || msg.includes('开头')) direction = 'top';
    else if (msg.includes('底') || msg.includes('结尾')) direction = 'bottom';
    return { name: 'browser.scroll', params: { direction } };
  }
  
  // 点击按钮
  if (msg.includes('点击') || msg.includes('按') || msg.includes('确认') || msg.includes('提交')) {
    const buttonMatch = message.match(/点击[的]?(.*?)(?:按钮|$)/) || message.match(/按(.*?)(?:按钮|$)/);
    if (buttonMatch) {
      return { name: 'browser.clickButton', params: { description: buttonMatch[1] || message } };
    }
  }
  
  // 填写表单
  if (msg.includes('填写') || msg.includes('填') || msg.includes('输入')) {
    // 提取表单数据
    const dataMatch = message.match(/填写?(.+)/);
    if (dataMatch) {
      const dataStr = dataMatch[1];
      // 简单解析: 姓名xxx 邮箱xxx
      const data: Record<string, string> = {};
      const patterns = [
        /姓名[:：]?\s*(\S+)/,
        /邮箱[:：]?\s*(\S+@\S+)/,
        /电话[:：]?\s*(\S+)/,
        /密码[:：]?\s*(\S+)/,
      ];
      for (const p of patterns) {
        const m = dataStr.match(p);
        if (m) {
          if (p.toString().includes('姓名')) data.name = m[1];
          else if (p.toString().includes('邮箱')) data.email = m[1];
          else if (p.toString().includes('电话')) data.phone = m[1];
          else if (p.toString().includes('密码')) data.password = m[1];
        }
      }
      if (Object.keys(data).length > 0) {
        return { name: 'browser.autoFill', params: { data } };
      }
    }
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
  
  // 提取数据
  if (msg.includes('提取') || msg.includes('获取') || msg.includes('抓取') || msg.includes('导出')) {
    if (msg.includes('数据') || msg.includes('表格') || msg.includes('图片') || msg.includes('链接')) {
      const patterns: Record<string, string> = {
        '表格': 'table', '表': 'table',
        '图片': 'image', '图': 'image',
        '链接': 'link', '商品': 'product', '新闻': 'news'
      };
      let pattern = 'links';
      for (const [k, v] of Object.entries(patterns)) {
        if (msg.includes(k)) { pattern = v; break; }
      }
      return { name: 'browser.extractData', params: { pattern } };
    }
  }
  
  // 标签页操作
  if (msg.includes('新标签') || msg.includes('打开新') || msg.includes('新建页面')) {
    const urlMatch = message.match(/(?:https?:\/\/)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
    return { name: 'browser.newTab', params: { url: urlMatch ? 'https://' + urlMatch[1] : '' } };
  }
  if (msg.includes('切换') && (msg.includes('标签') || msg.includes('页面') || msg.includes('tab'))) {
    const numMatch = message.match(/第?(\d+)/);
    return { name: 'browser.switchTab', params: { index: numMatch ? parseInt(numMatch[1]) - 1 : 0 } };
  }
  if (msg.includes('关闭') && (msg.includes('标签') || msg.includes('页面') || msg.includes('tab'))) {
    return { name: 'browser.closeTab', params: {} };
  }
  if (msg.includes('所有标签') || msg.includes('标签页列表')) {
    return { name: 'browser.listTabs', params: {} };
  }
  
  // 下载功能
  if (msg.includes('下载') || msg.includes('保存') || msg.includes('另存')) {
    if (msg.includes('pdf') || msg.includes('PDF') || msg.includes('页面')) {
      return { name: 'browser.saveAsPdf', params: {} };
    }
    return { name: 'browser.smartDownload', params: { message } };
  }
  
  return null;
}

/**
 * PI-Mono 风格 Agent Loop - 智能版
 */
// 启用 Agent 自主决策模式
const USE_AGENT_DECISION = true;

export async function runAgentLoop(userMessage: string, history: any[] = [], sessionId: string = 'default'): Promise<{ response: string; toolCalls: string[] }> {
  console.log('[AgentLoop] Processing:', userMessage);
  
  // 记录用户查询
  recordQuery(userMessage);
  
  // 增强消息（理解代词和省略）
  const enhancedMessage = enhanceWithContext(userMessage, sessionId);
  if (enhancedMessage !== userMessage) {
    console.log('[AgentLoop] Enhanced message:', enhancedMessage);
  }
  
  // 添加到会话记忆
  addMessage(sessionId, 'user', userMessage);
  
  // 获取上下文
  const context = getContext(sessionId);
  const contextMessages = context.recentMessages.map(m => ({ role: m.role, content: m.content }));
  
  // 尝试 Agent 自主决策（如果启用）
  if (USE_AGENT_DECISION) {
    try {
      const agentResult = await runAgent(enhancedMessage, contextMessages);
      
      if (agentResult.results && agentResult.results.length > 0) {
        // 记录执行的工具
        for (const r of agentResult.results) {
          recordAction(r.tool);
        }
        
        console.log('[AgentLoop] Agent decision:', agentResult.reasoning);
        console.log('[AgentLoop] Executed', agentResult.results.length, 'tools');
        
        // 保存助手回复到记忆
        addMessage(sessionId, 'assistant', agentResult.response);
        
        // 更新上下文
        if (agentResult.results.length > 0) {
          updateContext(sessionId, agentResult.reasoning, agentResult.results[0].tool, {});
        }
        
        return {
          response: agentResult.response,
          toolCalls: agentResult.results.map((r: any) => r.tool)
        };
      }
    } catch (e) {
      console.log('[AgentLoop] Agent decision failed, fallback to legacy');
    }
  }
  
  // 回退到传统模式
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
