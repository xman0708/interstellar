/**
 * 语义理解引擎
 * 真正听懂人话，理解意图+提取实体+容错纠错
 */

interface Entity {
  type: string;
  value: string;
  confidence: number;
}

interface Intent {
  name: string;
  confidence: number;
  entities: Entity[];
  original: string;
  corrected: string;
}

// 实体识别规则
const ENTITY_RULES: Record<string, { pattern: RegExp; type: string }[]> = {
  city: [
    { pattern: /(北京|上海|广州|深圳|杭州|南京|成都|武汉|西安|重庆)/g, type: 'city' },
    { pattern: /在(.+?)的/g, type: 'city' },
  ],
  time: [
    { pattern: /(今天|明天|后天|昨天|前天)/g, type: 'time' },
    { pattern: /(上午|下午|晚上|凌晨)/g, type: 'time' },
    { pattern: /(\d+)点/g, type: 'time' },
  ],
  number: [
    { pattern: /第(\d+)/g, type: 'number' },
    { pattern: /(\d+)个/g, type: 'number' },
  ],
  url: [
    { pattern: /(https?:\/\/)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g, type: 'url' },
  ],
  email: [
    { pattern: /(\S+@\S+\.\S+)/g, type: 'email' },
  ],
  phone: [
    { pattern: /(\d{11,})/g, type: 'phone' },
  ],
};

// 意图修正映射
const CORRECTIONS: Record<string, string> = {
  '查天气': '天气',
  '看天气': '天气',
  '天气怎么样': '天气',
  '天气如何': '天气',
  '查邮件': '邮件',
  '看邮件': '邮件',
  '收邮件': '邮件',
  '查项目': '项目',
  '看项目': '项目',
  '查任务': '任务',
  '看任务': '任务',
  '查东西': '搜索',
  '找东西': '搜索',
  '查资料': '搜索',
};

// 提取实体
function extractEntities(message: string): Entity[] {
  const entities: Entity[] = [];
  
  for (const [type, rules] of Object.entries(ENTITY_RULES)) {
    for (const rule of rules) {
      const matches = message.matchAll(rule.pattern);
      for (const match of matches) {
        entities.push({
          type,
          value: match[1] || match[0],
          confidence: 0.9
        });
      }
    }
  }
  
  return entities;
}

// 意图修正
function correctIntent(message: string): string {
  const msg = message.toLowerCase().replace(/\s/g, '');
  
  // 精确匹配
  if (CORRECTIONS[msg]) {
    return CORRECTIONS[msg];
  }
  
  // 模糊匹配
  for (const [key, value] of Object.entries(CORRECTIONS)) {
    if (msg.includes(key) || key.includes(msg)) {
      return value;
    }
  }
  
  return message;
}

// 理解意图
export function understand(message: string): Intent {
  // 1. 容错纠错
  const corrected = correctIntent(message);
  
  // 2. 提取实体
  const entities = extractEntities(message);
  
  // 3. 意图识别
  const intent = identifyIntent(corrected, entities);
  
  return {
    name: intent,
    confidence: 0.8,
    entities,
    original: message,
    corrected
  };
}

// 意图识别
function identifyIntent(message: string, entities: Entity[]): string {
  const msg = message.toLowerCase();
  
  // 基于关键词和实体判断
  if (entities.some(e => e.type === 'city') || msg.includes('天气')) {
    return 'weather';
  }
  
  if (msg.includes('邮件') || msg.includes('邮箱')) {
    return msg.includes('未读') ? 'unread_emails' : 'emails';
  }
  
  if (msg.includes('会议') || msg.includes('日程')) {
    return msg.includes('今天') ? 'today_meetings' : 'upcoming_meetings';
  }
  
  if (msg.includes('项目')) {
    return 'projects';
  }
  
  if (msg.includes('任务') || msg.includes('待办') || msg.includes('todo')) {
    return 'tasks';
  }
  
  if (msg.includes('搜索') || msg.includes('查') || msg.includes('找')) {
    return 'search';
  }
  
  if (msg.includes('打开') || msg.includes('访问') || msg.includes('浏览')) {
    return 'browse';
  }
  
  if (msg.includes('滚动') || msg.includes('上') || msg.includes('下')) {
    return 'scroll';
  }
  
  if (msg.includes('点击') || msg.includes('按')) {
    return 'click';
  }
  
  if (msg.includes('填写') || msg.includes('填') || msg.includes('输入')) {
    return 'fill';
  }
  
  if (msg.includes('下载') || msg.includes('保存')) {
    return 'download';
  }
  
  if (msg.includes('代码') || msg.includes('编程')) {
    return 'code';
  }
  
  return 'unknown';
}

// 理解并返回结构化结果
export function parse(message: string): {
  intent: string;
  action: string;
  params: Record<string, any>;
  needsContext: boolean;
  correctedMessage: string;
} {
  const understood = understand(message);
  
  // 映射到具体动作
  const actionMap: Record<string, string> = {
    'weather': 'get_weather',
    'emails': 'list_emails',
    'unread_emails': 'unread_emails',
    'today_meetings': 'today_meetings',
    'upcoming_meetings': 'upcoming_meetings',
    'projects': 'list_projects',
    'tasks': 'list_tasks',
    'search': 'web_search',
    'browse': 'browser.open',
    'scroll': 'browser.scroll',
    'click': 'browser.clickButton',
    'fill': 'browser.autoFill',
    'download': 'browser.smartDownload',
    'code': 'solve_problem',
  };
  
  const action = actionMap[understood.name] || 'chat';
  
  // 提取参数
  const params: Record<string, any> = {};
  
  for (const entity of understood.entities) {
    if (entity.type === 'city' && (action === 'get_weather')) {
      params.city = entity.value;
    }
    if (entity.type === 'url') {
      params.url = entity.value.startsWith('http') ? entity.value : 'https://' + entity.value;
    }
    if (entity.type === 'number') {
      params.index = parseInt(entity.value) - 1;
    }
    if (entity.type === 'time') {
      params.time = entity.value;
    }
  }
  
  // 默认参数
  if (action === 'get_weather' && !params.city) {
    params.city = '上海';
  }
  
  if (action === 'web_search' && !params.query) {
    params.query = message.replace(/搜索|查|找/g, '').trim();
  }
  
  return {
    intent: understood.name,
    action,
    params,
    needsContext: understood.name === 'unknown',
    correctedMessage: understood.corrected
  };
}

export default { understand, parse };
