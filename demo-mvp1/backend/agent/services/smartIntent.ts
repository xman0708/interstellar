/**
 * 智能意图匹配服务
 * 使用向量相似度和多意图识别
 */

// 意图模式定义
interface IntentPattern {
  name: string;           // 工具名
  keywords: string[];     // 关键词
  weight: number;         // 权重
  examples: string[];     // 示例
  required?: string[];    // 必须包含的词
}

const INTENT_PATTERNS: IntentPattern[] = [
  // 天气
  { name: 'get_weather', keywords: ['天气', '温度', '多少度', '冷', '热'], weight: 1.0, examples: ['今天天气怎么样', '北京天气', '明天温度'] },
  
  // 邮件
  { name: 'list_emails', keywords: ['邮件', '邮箱', '收件箱'], weight: 1.0, examples: ['查看邮件', '我的邮件'], required: ['查看', '看'] },
  { name: 'unread_emails', keywords: ['未读', '新邮件'], weight: 1.5, examples: ['未读邮件', '有哪些新邮件'] },
  
  // 日历/会议
  { name: 'today_meetings', keywords: ['今天', '今日', '日程'], weight: 1.2, examples: ['今天有什么会议', '今日日程'], required: ['会议', '日程'] },
  { name: 'upcoming_meetings', keywords: ['接下来', '即将', '一会'], weight: 1.0, examples: ['接下来有什么会议'] },
  
  // 项目/任务
  { name: 'list_projects', keywords: ['项目', '项目列表'], weight: 1.5, examples: ['有哪些项目', '项目列表'] },
  { name: 'list_tasks', keywords: ['任务', '待办', 'todo'], weight: 1.5, examples: ['我的任务', '待办事项'] },
  { name: 'list_tasks', keywords: ['工时', '加班'], weight: 1.0, examples: ['查看工时', '加班情况'] },
  
  // 知识库
  { name: 'search_knowledge', keywords: ['知识库', '查知识', '搜索'], weight: 1.0, examples: ['搜索知识库', '查一下'] },
  
  // 浏览器
  { name: 'web_search', keywords: ['搜索', '上网', '查一下', 'google', '百度'], weight: 1.2, examples: ['搜索Python教程', '查一下'] },
  { name: 'browser.open', keywords: ['打开', '访问', '浏览'], weight: 1.0, examples: ['打开百度', '访问github'] },
  { name: 'browser.scroll', keywords: ['滚动', '向上', '向下', '顶部', '底部'], weight: 2.0, examples: ['向上滚动', '到底部'] },
  { name: 'browser.clickButton', keywords: ['点击', '按', '确认', '提交'], weight: 1.5, examples: ['点击提交', '确认'] },
  { name: 'browser.autoFill', keywords: ['填写', '填', '输入'], weight: 1.5, examples: ['填写表单', '输入姓名'] },
  { name: 'browser.saveAsPdf', keywords: ['pdf', '保存', '另存'], weight: 2.0, examples: ['保存为PDF'] },
  { name: 'browser.extractData', keywords: ['提取', '获取', '导出'], weight: 1.5, examples: ['提取数据', '导出表格'] },
  { name: 'browser.listTabs', keywords: ['标签页', 'tabs'], weight: 1.5, examples: ['列出标签页'] },
  { name: 'browser.newTab', keywords: ['新标签', '新建页面'], weight: 1.5, examples: ['新建标签页'] },
  
  // 天气
  { name: 'weather.get', keywords: ['天气', '温度'], weight: 1.0 },
  
  // 编程/代码
  { name: 'solve_problem', keywords: ['代码', '编程', '算法', '怎么', '如何'], weight: 0.8, examples: ['Python怎么写', '排序算法'] },
  { name: 'self_coder', keywords: ['改代码', '修改', '升级', '优化', '重构', '添加功能'], weight: 2.0, examples: ['帮我改一下代码'] },
];

// 计算字符串相似度
function similarity(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  if (aLower === bLower) return 1.0;
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;
  
  // 简单的词重叠计算
  const aWords = new Set(aLower.split(/[\s,，,。.]+/).filter(w => w.length > 1));
  const bWords = new Set(bLower.split(/[\s,，,。.]+/).filter(w => w.length > 1));
  
  let overlap = 0;
  for (const w of bWords) {
    if (aWords.has(w)) overlap += 1;
    else {
      // 检查子串
      for (const aw of aWords) {
        if (aw.includes(w) || w.includes(aw)) {
          overlap += 0.5;
          break;
        }
      }
    }
  }
  
  return overlap / Math.max(aWords.size, bWords.size);
}

// 智能意图分析
export function analyzeIntentSmart(message: string): { name: string; params: any; confidence: number }[] {
  const msg = message.toLowerCase();
  const results: { name: string; params: any; score: number }[] = [];
  
  for (const pattern of INTENT_PATTERNS) {
    let score = 0;
    
    // 检查必须包含的词
    if (pattern.required) {
      const hasRequired = pattern.required.some(r => msg.includes(r));
      if (!hasRequired) continue;
    }
    
    // 关键词匹配
    for (const kw of pattern.keywords) {
      if (msg.includes(kw.toLowerCase())) {
        score += pattern.weight;
      }
    }
    
    // 示例匹配
    if (pattern.examples) {
      for (const ex of pattern.examples) {
        const sim = similarity(msg, ex.toLowerCase());
        if (sim > 0.5) {
          score += sim * pattern.weight;
        }
      }
    }
    
    if (score > 0) {
      results.push({ 
        name: pattern.name, 
        params: extractParams(message, pattern.name),
        score 
      });
    }
  }
  
  // 按分数排序，返回前3个
  results.sort((a, b) => b.score - a.score);
  
  // 只返回置信度 > 0.5 的
  const filtered = results.filter(r => r.score >= 0.5).slice(0, 3);
  
  return filtered.map(r => ({
    name: r.name,
    params: r.params,
    confidence: Math.min(r.score / 3, 1.0)  // 归一化到 0-1
  }));
}

// 从消息中提取参数
function extractParams(message: string, intent: string): any {
  const params: any = {};
  
  // 城市提取
  if (intent === 'get_weather' || intent === 'weather.get') {
    const cities = ['北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '武汉', '西安', '重庆'];
    for (const city of cities) {
      if (message.includes(city)) {
        params.city = city;
        break;
      }
    }
    if (!params.city) params.city = '上海';
  }
  
  // 数字提取
  const numMatch = message.match(/第(\d+)/);
  if (numMatch) {
    params.index = parseInt(numMatch[1]) - 1;
  }
  
  // 滚动方向
  if (intent === 'browser.scroll') {
    if (message.includes('向上')) params.direction = 'up';
    else if (message.includes('下') || message.includes('底')) params.direction = 'down';
    else if (message.includes('顶') || message.includes('开头')) params.direction = 'top';
    else if (message.includes('底') || message.includes('结尾')) params.direction = 'bottom';
    else params.direction = 'down';
  }
  
  // 提取搜索词
  if (intent === 'web_search' || intent === 'search_knowledge') {
    const patterns = [
      /(?:搜索|上网|查一下|google|百度)\s*(.+)/i,
      /(?:关于|找)\s*(.+)/i,
    ];
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        params.query = match[1].trim();
        break;
      }
    }
    if (!params.query) {
      params.query = message.replace(/搜索|上网|查一下/g, '').trim();
    }
  }
  
  // URL 提取
  const urlMatch = message.match(/(?:https?:\/\/)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
  if (urlMatch) {
    params.url = 'https://' + urlMatch[1];
  }
  
  // 表单数据提取
  if (intent === 'browser.autoFill') {
    const data: Record<string, string> = {};
    const nameMatch = message.match(/姓名[:：]?\s*(\S+)/);
    const emailMatch = message.match(/邮箱[:：]?\s*(\S+@\S+)/);
    const phoneMatch = message.match(/电话[:：]?\s*(\S+)/);
    if (nameMatch) data.name = nameMatch[1];
    if (emailMatch) data.email = emailMatch[1];
    if (phoneMatch) data.phone = phoneMatch[1];
    if (Object.keys(data).length > 0) {
      params.data = data;
    }
  }
  
  return params;
}

export default { analyzeIntentSmart };
