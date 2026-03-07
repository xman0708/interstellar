/**
 * Dashboard - 仪表板数据
 */

import { SessionManager } from '../session/sessionManager.js';
import { loadProfile, getUserStats } from './profile.js';
import { getAll as getKnowledge } from './knowledge.js';

// 模拟外部数据
const mockEmails = [
  { id: 'E001', from: '张三', subject: '项目进度汇报', read: false },
  { id: 'E002', from: '王五', subject: '代码审查邀请', read: false },
];

const mockCalendar = [
  { id: 'C001', title: '项目周会', start: '2026-03-05 14:00' },
];

/**
 * 获取仪表板数据
 */
export function getDashboard(): any {
  const sessions = SessionManager.listSessions();
  const userStats = getUserStats();
  const knowledge = getKnowledge();
  
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = mockCalendar.filter(e => e.start.startsWith(today));
  const unreadEmails = mockEmails.filter(e => !e.read);
  
  return {
    // 会话
    sessions: {
      total: sessions.length,
      active: sessions.length,
    },
    
    // 用户
    user: userStats,
    
    // 今日概览
    today: {
      events: todayEvents.length,
      unreadEmails: unreadEmails.length,
      knowledgeItems: knowledge.length,
    },
    
    // 快捷操作
    quickActions: [
      { id: 'projects', label: '项目', icon: '📊' },
      { id: 'tasks', label: '任务', icon: '✅' },
      { id: 'emails', label: '邮件', icon: '📧' },
      { id: 'calendar', label: '日历', icon: '📅' },
      { id: 'knowledge', label: '知识库', icon: '📚' },
    ],
    
    // 时间
    timestamp: new Date().toISOString(),
  };
}
