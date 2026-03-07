/**
 * Heartbeat - 心跳任务系统 v2
 * 
 * 支持从 HEARTBEAT.md 加载配置并执行任务
 */

import * as fs from 'fs';
import * as path from 'path';
import { SessionManager } from './session/sessionManager.js';
import { 
  emails, 
  calendarEvents, 
  getUnreadEmails, 
  getTodayEvents, 
  getUpcomingEvents,
  getImportantEmails,
  type Notification 
} from './services/external.js';
import { runSelfEvolution } from './services/selfEvolution.js';

const WORKSPACE_PATH = path.join(__dirname, '../../../workspace');
const HEARTBEAT_FILE = path.join(WORKSPACE_PATH, 'HEARTBEAT.md');

export interface HeartbeatTask {
  name: string;
  interval: number;
  lastRun: number;
  execute: () => Promise<Notification | Notification[] | null>;
}

export interface HeartbeatConfig {
  enabled: boolean;
  tasks: {
    name: string;
    interval: number;
    enabled: boolean;
  }[];
}

class HeartbeatManager {
  private tasks: Map<string, HeartbeatTask> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private config: HeartbeatConfig = { enabled: true, tasks: [] };
  private notifications: Notification[] = [];
  
  /**
   * 加载配置
   */
  loadConfig(): HeartbeatConfig {
    if (!fs.existsSync(HEARTBEAT_FILE)) {
      return this.getDefaultConfig();
    }
    
    const content = fs.readFileSync(HEARTBEAT_FILE, 'utf-8');
    const lines = content.split('\n');
    const config: HeartbeatConfig = { enabled: true, tasks: [] };
    
    for (const line of lines) {
      if (line.trim().startsWith('#') || !line.trim()) continue;
      if (line.includes('enabled') && line.includes('false')) {
        config.enabled = false;
        continue;
      }
      
      const match = line.match(/- \[([ x])\] (\w+)\s*-\s*(.+?)(?:\s*\(每(\d+)分钟\))?$/);
      if (match) {
        const [, checked, name, desc, interval] = match;
        config.tasks.push({
          name,
          interval: interval ? parseInt(interval) * 60 * 1000 : 60 * 60 * 1000,
          enabled: checked === 'x'
        });
      }
    }
    
    return config;
  }
  
  private getDefaultConfig(): HeartbeatConfig {
    return {
      enabled: true,
      tasks: [
        { name: 'health_check', interval: 60 * 1000, enabled: true },
        { name: 'cleanup_sessions', interval: 5 * 60 * 1000, enabled: true },
        { name: 'self_evolution', interval: 5 * 60 * 1000, enabled: true },
        { name: 'fetch_emails', interval: 5 * 60 * 1000, enabled: true },
      ]
    };
  }
  
  /**
   * 注册任务
   */
  registerTask(
    name: string, 
    interval: number, 
    execute: () => Promise<Notification | Notification[] | null>
  ): void {
    this.tasks.set(name, { name, interval, lastRun: 0, execute });
  }
  
  /**
   * 启动
   */
  start(interval: number = 60000): void {
    this.config = this.loadConfig();
    
    if (!this.config.enabled) {
      console.log('[Heartbeat] Disabled');
      return;
    }
    
    if (this.intervalId) return;
    
    console.log(`[Heartbeat] Starting (interval: ${interval}ms)`);
    
    this.intervalId = setInterval(() => this.tick(), interval);
  }
  
  /**
   * 停止
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  /**
   * 执行轮询
   */
  private async tick(): Promise<void> {
    const now = Date.now();
    
    for (const taskConfig of this.config.tasks) {
      if (!taskConfig.enabled) continue;
      
      const task = this.tasks.get(taskConfig.name);
      if (!task) continue;
      
      if (now - task.lastRun >= task.interval) {
        console.log(`[Heartbeat] Running: ${task.name}`);
        try {
          const result = await task.execute();
          if (result) {
            const notifs = Array.isArray(result) ? result : [result];
            this.notifications.push(...notifs);
            console.log(`[Heartbeat] Generated ${notifs.length} notifications`);
          }
          task.lastRun = now;
        } catch (error: any) {
          console.error(`[Heartbeat] ${task.name} error:`, error.message);
        }
      }
    }
  }
  
  /**
   * 获取通知
   */
  getNotifications(): Notification[] {
    return this.notifications;
  }
  
  /**
   * 清除通知
   */
  clearNotifications(): void {
    this.notifications = [];
  }
  
  /**
   * 获取状态
   */
  getStatus(): any {
    return {
      running: this.intervalId !== null,
      enabled: this.config.enabled,
      tasks: Array.from(this.tasks.values()).map(t => ({
        name: t.name,
        interval: t.interval,
        lastRun: t.lastRun
      })),
      notificationCount: this.notifications.length
    };
  }
  
  reloadConfig(): void {
    this.config = this.loadConfig();
  }
}

// 预定义任务
export function setupHeartbeatTasks(heartbeat: HeartbeatManager): void {
  
  // 健康检查
  heartbeat.registerTask('health_check', 60 * 1000, async () => {
    const sessions = SessionManager.listSessions();
    console.log(`[Health] Sessions: ${sessions.length}, Notifications: ${heartbeat.getNotifications().length}`);
    return null;
  });
  
  // 清理会话
  heartbeat.registerTask('cleanup_sessions', 5 * 60 * 1000, async () => {
    const cleaned = SessionManager.cleanup(24 * 60 * 60 * 1000);
    if (cleaned > 0) console.log(`[Cleanup] Removed ${cleaned} sessions`);
    return null;
  });
  
  // 自我进化 (每5分钟一次)
  heartbeat.registerTask('self_evolution', 5 * 60 * 1000, async () => {
    console.log('[Evolution] Starting self-evolution cycle...');
    try {
      await runSelfEvolution();
      return {
        id: 'self_evolution',
        type: 'system',
        title: '自我进化完成',
        content: 'LivingCode 已完成一次自我诊断和优化',
        time: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('[Evolution] Error:', error);
      return null;
    }
  });
  
  // 检查邮件
  heartbeat.registerTask('fetch_emails', 5 * 60 * 1000, async () => {
    const unread = getUnreadEmails();
    const important = getImportantEmails();
    
    if (unread > 0) {
      return {
        id: `email_notif_${Date.now()}`,
        type: 'email',
        title: '新邮件通知',
        content: `您有 ${unread} 封未读邮件${important.length > 0 ? `，其中 ${important.length} 封重要` : ''}`,
        time: new Date().toISOString(),
        read: false
      };
    }
    return null;
  });
  
  // 检查日历
  heartbeat.registerTask('check_calendar', 10 * 60 * 1000, async () => {
    const upcoming = getUpcomingEvents(2);
    
    if (upcoming.length > 0) {
      const next = upcoming[0];
      return {
        id: `calendar_notif_${Date.now()}`,
        type: 'calendar',
        title: '即将到来的会议',
        content: `${next.title} 将在 ${next.start} 开始`,
        time: new Date().toISOString(),
        read: false
      };
    }
    return null;
  });
  
  // 系统状态
  heartbeat.registerTask('system_stats', 15 * 60 * 1000, async () => {
    const sessions = SessionManager.listSessions();
    const memory = SessionManager.getTodayMemory();
    
    return {
      id: `system_${Date.now()}`,
      type: 'system',
      title: '系统状态',
      content: `活跃会话: ${sessions.length}, Memory: ${memory.length} chars`,
      time: new Date().toISOString(),
      read: true
    };
  });
}

export { HeartbeatManager };
export default HeartbeatManager;
