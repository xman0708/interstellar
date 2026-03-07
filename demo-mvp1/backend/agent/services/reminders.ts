/**
 * Task Reminder System - 任务提醒系统
 */

import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_PATH = path.join(__dirname, '../../../workspace');
const REMINDERS_FILE = path.join(WORKSPACE_PATH, 'reminders.json');

export interface Reminder {
  id: string;
  title: string;
  time: string;       // ISO时间
  repeat?: 'daily' | 'weekly';
  message?: string;
  done: boolean;
}

/**
 * 获取所有提醒
 */
export function getAll(): Reminder[] {
  if (fs.existsSync(REMINDERS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(REMINDERS_FILE, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * 保存提醒
 */
function save(reminders: Reminder[]): void {
  fs.writeFileSync(REMINDERS_FILE, JSON.stringify(reminders, null, 2));
}

/**
 * 添加提醒
 */
export function add(data: { title: string; time: string; repeat?: string }): Reminder {
  const reminders = getAll();
  const reminder: Reminder = {
    id: `r_${Date.now()}`,
    title: data.title,
    time: data.time,
    repeat: data.repeat as any,
    done: false,
  };
  
  reminders.push(reminder);
  save(reminders);
  
  return reminder;
}

/**
 * 删除提醒
 */
export function remove(id: string): boolean {
  const reminders = getAll();
  const filtered = reminders.filter(r => r.id !== id);
  
  if (filtered.length === reminders.length) return false;
  
  save(filtered);
  return true;
}

/**
 * 标记完成
 */
export function complete(id: string): boolean {
  const reminders = getAll();
  const reminder = reminders.find(r => r.id === id);
  
  if (!reminder) return false;
  
  reminder.done = true;
  save(reminders);
  return true;
}

/**
 * 获取待办提醒
 */
export function getPending(): Reminder[] {
  return getAll().filter(r => !r.done);
}

/**
 * 检查到期提醒
 */
export function getDue(): Reminder[] {
  const now = new Date();
  return getPending().filter(r => {
    const reminderTime = new Date(r.time);
    return reminderTime <= now;
  });
}
