/**
 * 外部服务集成 - 邮件/日历/通知
 * 
 * 模拟真实第三方服务集成
 */

import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_PATH = path.join(__dirname, '../../../workspace');

// 模拟邮件数据
export const emails = [
  {
    id: 'E001',
    from: 'zhangsan@company.com',
    fromName: '张三',
    to: 'li@company.com',
    subject: '项目进度汇报',
    preview: '本周项目进度已完成75%，预计下周完成...',
    time: '2026-03-05 10:30',
    read: false,
    important: true,
  },
  {
    id: 'E002',
    from: 'wangwu@company.com',
    fromName: '王五',
    to: 'li@company.com',
    subject: '代码审查邀请',
    preview: '请帮忙审查 PR #123 的代码改动...',
    time: '2026-03-05 09:15',
    read: false,
    important: false,
  },
  {
    id: 'E003',
    from: 'system@company.com',
    fromName: '系统',
    to: 'li@company.com',
    subject: '周报提醒',
    preview: '请在本周五前提交本周工作总结...',
    time: '2026-03-05 08:00',
    read: true,
    important: true,
  },
];

// 模拟日历事件
export const calendarEvents = [
  {
    id: 'C001',
    title: '项目周会',
    start: '2026-03-05 14:00',
    end: '2026-03-05 15:00',
    attendees: ['张三', '李四', '王五'],
    location: '会议室A',
    reminder: 15,
  },
  {
    id: 'C002',
    title: '代码审查',
    start: '2026-03-05 16:00',
    end: '2026-03-05 17:00',
    attendees: ['李四', '赵六'],
    location: '线上',
    reminder: 10,
  },
  {
    id: 'C003',
    title: 'Sprint 计划会',
    start: '2026-03-06 10:00',
    end: '2026-03-06 11:30',
    attendees: ['全体'],
    location: '会议室B',
    reminder: 30,
  },
];

// 通知类型
export interface Notification {
  id: string;
  type: 'email' | 'calendar' | 'system' | 'mention';
  title: string;
  content: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

// 获取未读邮件数
export function getUnreadEmails(): number {
  return emails.filter(e => !e.read).length;
}

// 获取今日事件
export function getTodayEvents(): typeof calendarEvents {
  const today = new Date().toISOString().split('T')[0];
  return calendarEvents.filter(e => e.start.startsWith(today));
}

// 获取即将到来的事件（next hours）
export function getUpcomingEvents(hours: number = 2): typeof calendarEvents {
  const now = new Date();
  const future = new Date(now.getTime() + hours * 60 * 60 * 1000);
  
  return calendarEvents.filter(e => {
    const eventStart = new Date(e.start);
    return eventStart >= now && eventStart <= future;
  });
}

// 检查是否有重要邮件
export function getImportantEmails(): typeof emails {
  return emails.filter(e => e.important && !e.read);
}

// 标记邮件为已读
export function markEmailRead(id: string): boolean {
  const email = emails.find(e => e.id === id);
  if (email) {
    email.read = true;
    return true;
  }
  return false;
}

// 读取 Memory 中的用户偏好
export function getUserPreferences(): any {
  const prefsFile = path.join(WORKSPACE_PATH, 'preferences.json');
  if (fs.existsSync(prefsFile)) {
    return JSON.parse(fs.readFileSync(prefsFile, 'utf-8'));
  }
  return { notifications: true, emailCheckInterval: 5 };
}

// 保存用户偏好
export function saveUserPreferences(prefs: any): void {
  const prefsFile = path.join(WORKSPACE_PATH, 'preferences.json');
  fs.writeFileSync(prefsFile, JSON.stringify(prefs, null, 2));
}
