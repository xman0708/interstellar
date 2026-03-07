/**
 * Session 管理 + Memory 持久化
 * 
 * 参考 OpenClaw: memory/YYYY-MM-DD.md + MEMORY.md
 */

import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_PATH = path.join(__dirname, '../../../workspace');
const MEMORY_DIR = path.join(WORKSPACE_PATH, 'memory');

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export interface SessionContext {
  pendingEmail?: {
    to: string;
    subject: string;
    body: string;
  };
  lastSkill?: string;
  lastResult?: any;
}

export interface Session {
  id: string;
  createdAt: Date;
  messages: Message[];
  context: SessionContext;
  addMessage: (message: Message) => void;
  getHistory: () => { role: string; content: string }[];
  setContext: (ctx: Partial<SessionContext>) => void;
  getContext: () => SessionContext;
}

/**
 * 内存会话管理器 + 磁盘持久化
 */
class SessionManagerClass {
  private sessions: Map<string, Session> = new Map();
  private maxHistoryLength = 30;
  private currentSessionId: string | null = null;
  
  constructor() {
    // 确保 memory 目录存在
    if (!fs.existsSync(MEMORY_DIR)) {
      fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }
  }
  
  /**
   * 获取或创建会话
   */
  getSession(sessionId?: string): Session {
    const id = sessionId || this.currentSessionId || this.generateId();
    
    if (id && this.sessions.has(id)) {
      this.currentSessionId = id;
      return this.sessions.get(id)!;
    }
    
    const session = this.createSession(id);
    this.currentSessionId = id;
    return session;
  }
  
  /**
   * 生成会话 ID
   */
  private generateId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 创建新会话
   */
  private createSession(id: string): Session {
    const messages: Message[] = [];
    let context: SessionContext = {};
    
    const session: Session = {
      id,
      createdAt: new Date(),
      messages,
      context,
      setContext: (newCtx: Partial<SessionContext>) => {
        context = { ...context, ...newCtx };
      },
      getContext: () => context,
      addMessage: (message: Message) => {
        messages.push(message);
        
        // 限制历史长度
        if (messages.length > this.maxHistoryLength) {
          messages.splice(0, messages.length - this.maxHistoryLength);
        }
        
        // 自动写入 Memory（每3条消息写一次）
        if (messages.length % 3 === 0) {
          this.writeToMemory(id, message);
        }
      },
      getHistory: () => {
        return messages.map(m => ({ role: m.role, content: m.content }));
      },
    };
    
    this.sessions.set(id, session);
    console.log('[Session] Created new session:', id);
    
    return session;
  }
  
  /**
   * 写入 Memory 文件
   */
  private writeToMemory(sessionId: string, lastMessage: Message): void {
    const today = new Date().toISOString().split('T')[0];
    const memoryFile = path.join(MEMORY_DIR, `${today}.md`);
    
    const timestamp = new Date().toISOString();
    const content = `[${timestamp}] Session: ${sessionId}\n${lastMessage.role}: ${lastMessage.content.substring(0, 100)}...\n\n`;
    
    fs.appendFileSync(memoryFile, content, 'utf-8');
  }
  
  /**
   * 读取今日 Memory
   */
  getTodayMemory(): string {
    const today = new Date().toISOString().split('T')[0];
    const memoryFile = path.join(MEMORY_DIR, `${today}.md`);
    
    if (fs.existsSync(memoryFile)) {
      return fs.readFileSync(memoryFile, 'utf-8');
    }
    return '';
  }
  
  /**
   * 读取历史 Memory
   */
  getMemoryHistory(days: number = 7): string[] {
    const memories: string[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const memoryFile = path.join(MEMORY_DIR, `${dateStr}.md`);
      
      if (fs.existsSync(memoryFile)) {
        memories.push(fs.readFileSync(memoryFile, 'utf-8'));
      }
    }
    
    return memories;
  }
  
  /**
   * 获取会话历史（转换为 OpenAI 格式）
   */
  getHistory(sessionId?: string): { role: string; content: string }[] {
    const session = this.getSession(sessionId);
    return session.getHistory();
  }
  
  /**
   * 获取会话列表
   */
  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
  
  /**
   * 删除会话
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
  
  /**
   * 清理过期会话
   */
  cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, session] of this.sessions) {
      const age = now - session.createdAt.getTime();
      if (age > maxAgeMs) {
        this.sessions.delete(id);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

export const SessionManager = new SessionManagerClass();
