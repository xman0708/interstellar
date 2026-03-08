/**
 * 多轮对话记忆服务
 * 记住上下文，理解代词，接续话题
 */

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface SessionMemory {
  sessionId: string;
  messages: Message[];
  lastTopic: string;      // 上一轮话题
  lastIntent: string;     // 上一轮意图
  lastEntities: Record<string, any>; // 上一轮实体
}

// 内存存储
const memories = new Map<string, SessionMemory>();

const MAX_MESSAGES = 10;  // 保留最近10轮

// 获取或创建会话记忆
export function getMemory(sessionId: string): SessionMemory {
  if (!memories.has(sessionId)) {
    memories.set(sessionId, {
      sessionId,
      messages: [],
      lastTopic: '',
      lastIntent: '',
      lastEntities: {}
    });
  }
  return memories.get(sessionId)!;
}

// 添加消息
export function addMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
  const memory = getMemory(sessionId);
  
  memory.messages.push({
    role,
    content,
    timestamp: Date.now()
  });
  
  // 只保留最近的消息
  if (memory.messages.length > MAX_MESSAGES) {
    memory.messages = memory.messages.slice(-MAX_MESSAGES);
  }
}

// 更新话题和意图
export function updateContext(sessionId: string, topic: string, intent: string, entities: Record<string, any>) {
  const memory = getMemory(sessionId);
  memory.lastTopic = topic;
  memory.lastIntent = intent;
  memory.lastEntities = { ...memory.lastEntities, ...entities };
}

// 获取上下文（用于理解代词）
export function getContext(sessionId: string): { 
  recentMessages: Message[]; 
  lastTopic: string;
  lastIntent: string;
  lastEntities: Record<string, any>;
} {
  const memory = getMemory(sessionId);
  return {
    recentMessages: memory.messages.slice(-6),  // 最近6条
    lastTopic: memory.lastTopic,
    lastIntent: memory.lastIntent,
    lastEntities: memory.lastEntities
  };
}

// 理解代词和省略
export function resolveReferences(message: string, sessionId: string): string {
  const memory = getMemory(sessionId);
  let resolved = message;
  
  // 代词映射
  const pronouns: Record<string, string[]> = {
    '它': [memory.lastTopic],
    '这个': [memory.lastTopic],
    '那个': [memory.lastTopic],
    '刚才': [memory.lastIntent],
    '上次': [memory.lastIntent],
  };
  
  for (const [pronoun, refs] of Object.entries(pronouns)) {
    if (resolved.includes(pronoun) && refs[0]) {
      resolved = resolved.replace(pronoun, refs[0]);
    }
  }
  
  // 省略内容补全
  if (resolved === '再试一次' || resolved === '换一个') {
    if (memory.lastIntent) {
      resolved = `再次执行 ${memory.lastIntent}`;
    }
  }
  
  if (resolved === '继续' || resolved === '然后呢') {
    if (memory.lastTopic) {
      resolved = `继续 ${memory.lastTopic}`;
    }
  }
  
  return resolved;
}

// 理解上下文后的消息
export function enhanceWithContext(message: string, sessionId: string): string {
  // 先解析代词
  let enhanced = resolveReferences(message, sessionId);
  
  // 获取上下文
  const ctx = getContext(sessionId);
  
  // 如果消息很短，可能是承接上文
  if (message.length < 10 && ctx.lastTopic) {
    // 补全意图
    if (message.includes('查') || message.includes('看')) {
      enhanced = `查看${ctx.lastTopic}`;
    }
    if (message.includes('搜索')) {
      enhanced = `搜索${ctx.lastEntities.query || ctx.lastTopic}`;
    }
  }
  
  return enhanced;
}

export default {
  getMemory,
  addMessage,
  updateContext,
  getContext,
  resolveReferences,
  enhanceWithContext
};
