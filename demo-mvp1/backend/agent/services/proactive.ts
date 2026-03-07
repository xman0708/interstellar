/**
 * 主动行为服务 - LivingCode 主动服务
 */

import { SessionManager } from '../session/sessionManager.js';
import { runSelfDiagnosis } from './selfDiagnosis.js';

// 主动行为配置
const PROACTIVE_CONFIG = {
  enabled: true,
  interval: 60000, // 1分钟检查一次
  notifications: [] as any[]
};

/**
 * 主动行为管理器
 */
export class ProactiveManager {
  private static instance: ProactiveManager;
  private timer: NodeJS.Timeout | null = null;
  private lastDiagnosis: any = null;
  
  static getInstance(): ProactiveManager {
    if (!ProactiveManager.instance) {
      ProactiveManager.instance = new ProactiveManager();
    }
    return ProactiveManager.instance;
  }
  
  /**
   * 启动主动行为
   */
  start(): void {
    if (this.timer) return;
    
    console.log('[Proactive] 启动主动行为服务');
    
    // 定期执行主动行为
    this.timer = setInterval(() => {
      this.runProactiveTasks();
    }, PROACTIVE_CONFIG.interval);
    
    // 立即执行一次
    setTimeout(() => this.runProactiveTasks(), 5000);
  }
  
  /**
   * 停止主动行为
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[Proactive] 停止主动行为服务');
    }
  }
  
  /**
   * 执行主动任务
   */
  private async runProactiveTasks(): Promise<void> {
    console.log('[Proactive] 执行主动任务...');
    
    try {
      // 1. 自我诊断
      await this.checkHealth();
      
      // 2. 会话检查
      await this.checkSessions();
      
      // 3. 定时提醒
      await this.checkReminders();
      
    } catch (e) {
      console.error('[Proactive] 任务执行失败:', e);
    }
  }
  
  /**
   * 健康检查
   */
  private async checkHealth(): Promise<void> {
    const diag = runSelfDiagnosis();
    this.lastDiagnosis = diag;
    
    if (diag.overall === 'critical') {
      this.addNotification({
        type: 'error',
        title: '系统警告',
        message: `LivingCode 健康状况: ${diag.overall}`,
        timestamp: new Date().toISOString()
      });
    } else if (diag.overall === 'warning') {
      // 检查具体问题
      for (const issue of diag.issues) {
        if (issue.includes('内存') || issue.includes('会话')) {
          this.addNotification({
            type: 'warning',
            title: '健康提醒',
            message: issue,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }
  
  /**
   * 会话检查
   */
  private async checkSessions(): Promise<void> {
    try {
      const sessions = SessionManager.getAllSessions();
      const activeSessions = sessions.filter((s: any) => s.messages?.length > 0);
      
      // 如果会话太多，发送通知
      if (activeSessions.length > 50) {
        this.addNotification({
          type: 'info',
          title: '会话管理',
          message: `当前活跃会话: ${activeSessions.length}，建议清理`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error('[Proactive] 会话检查失败:', e);
    }
  }
  
  /**
   * 提醒检查
   */
  private async checkReminders(): Promise<void> {
    // 这里可以添加定时提醒逻辑
    // 例如：每日总结、定期清理等
  }
  
  /**
   * 添加通知
   */
  addNotification(notification: any): void {
    PROACTIVE_CONFIG.notifications.unshift(notification);
    
    // 保留最近20条
    if (PROACTIVE_CONFIG.notifications.length > 20) {
      PROACTIVE_CONFIG.notifications = PROACTIVE_CONFIG.notifications.slice(0, 20);
    }
    
    console.log('[Proactive] 新通知:', notification.title, notification.message);
  }
  
  /**
   * 获取通知
   */
  getNotifications(): any[] {
    return PROACTIVE_CONFIG.notifications;
  }
  
  /**
   * 清除通知
   */
  clearNotifications(): void {
    PROACTIVE_CONFIG.notifications = [];
  }
  
  /**
   * 获取状态
   */
  getStatus(): any {
    return {
      running: this.timer !== null,
      lastDiagnosis: this.lastDiagnosis,
      notificationCount: PROACTIVE_CONFIG.notifications.length
    };
  }
}

// 导出单例
export const ProactiveManagerInstance = ProactiveManager.getInstance();
