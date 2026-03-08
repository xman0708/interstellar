/**
 * 用户习惯学习服务
 * 记住用户的常用操作和偏好
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = '/Users/anhui/code/LivingCode/demo-mvp1/backend/workspace';
const HABITS_FILE = path.join(DATA_DIR, 'user-habits.json');

interface HabitData {
  frequentQueries: string[];      // 常用搜索词
  frequentActions: string[];      // 常用操作
  lastQueries: string[];          // 最近查询
  preferences: Record<string, any>; // 用户偏好
}

// 内存缓存
let habits: HabitData = {
  frequentQueries: [],
  frequentActions: [],
  lastQueries: [],
  preferences: {}
};

// 加载习惯数据
function loadHabits(): HabitData {
  try {
    if (fs.existsSync(HABITS_FILE)) {
      const data = fs.readFileSync(HABITS_FILE, 'utf-8');
      habits = JSON.parse(data);
    }
  } catch (e) {
    console.log('[Habits] Load failed, using defaults');
  }
  return habits;
}

// 保存习惯数据
function saveHabits() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(HABITS_FILE, JSON.stringify(habits, null, 2));
  } catch (e) {
    console.error('[Habits] Save failed:', e);
  }
}

// 记录用户查询
export function recordQuery(query: string) {
  loadHabits();
  
  // 添加到最近查询
  habits.lastQueries = [query, ...habits.lastQueries.filter(q => q !== query)].slice(0, 10);
  
  // 更新常用查询
  const existing = habits.frequentQueries.find(q => q.toLowerCase() === query.toLowerCase());
  if (existing) {
    // 已存在，移到前面
    habits.frequentQueries = [existing, ...habits.frequentQueries.filter(q => q !== existing)];
  } else {
    habits.frequentQueries = [query, ...habits.frequentQueries].slice(0, 20);
  }
  
  saveHabits();
}

// 记录用户操作
export function recordAction(action: string) {
  loadHabits();
  
  const existing = habits.frequentActions.find(a => a.toLowerCase() === action.toLowerCase());
  if (existing) {
    habits.frequentActions = [existing, ...habits.frequentActions.filter(a => a !== existing)];
  } else {
    habits.frequentActions = [action, ...habits.frequentActions].slice(0, 20);
  }
  
  saveHabits();
}

// 记录用户偏好
export function setPreference(key: string, value: any) {
  loadHabits();
  habits.preferences[key] = value;
  saveHabits();
}

// 获取用户习惯
export function getHabits(): HabitData {
  loadHabits();
  return habits;
}

// 获取推荐
export function getRecommendations(): { queries: string[]; actions: string[] } {
  loadHabits();
  return {
    queries: habits.frequentQueries.slice(0, 5),
    actions: habits.frequentActions.slice(0, 5)
  };
}

// 初始化
loadHabits();
console.log('[Habits] User habits loaded');
