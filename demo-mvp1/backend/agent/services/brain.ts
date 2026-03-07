/**
 * Learning System v2 - 自我学习进化
 * 
 * 从对话中自动学习，不断变聪明
 */

import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_PATH = path.join(__dirname, '../../../workspace');
const BRAIN_FILE = path.join(WORKSPACE_PATH, 'brain.json');

// 知识脑图
interface Brain {
  // 已学会的问题模式
  patterns: Record<string, { answer: string; code?: string; count: number }>;
  // 常见意图
  intents: Record<string, number>;
  // 用户偏好
  preferences: Record<string, any>;
  // 进化等级
  level: number;
  xp: number;
}

// 加载脑图
function load(): Brain {
  if (fs.existsSync(BRAIN_FILE)) {
    try { return JSON.parse(fs.readFileSync(BRAIN_FILE, 'utf-8')); } catch {}
  }
  return { patterns: {}, intents: {}, preferences: {}, level: 1, xp: 0 };
}

function save(brain: Brain): void {
  fs.writeFileSync(BRAIN_FILE, JSON.stringify(brain, null, 2));
}

// 学习新问题
export function learn(input: string, response: string, code?: string): void {
  const brain = load();
  const key = normalize(input);
  
  if (brain.patterns[key]) {
    brain.patterns[key].count++;
  } else {
    brain.patterns[key] = { answer: response, code, count: 1 };
  }
  
  // 升级机制
  const total = Object.values(brain.patterns).reduce((a, b) => a + b.count, 0);
  brain.xp = total;
  
  // 每学习10个问题升一级
  brain.level = Math.floor(total / 10) + 1;
  
  save(brain);
}

// 记录意图
export function recordIntent(intent: string): void {
  const brain = load();
  brain.intents[intent] = (brain.intents[intent] || 0) + 1;
  save(brain);
}

// 查找已知答案
export function findAnswer(input: string): string | null {
  const brain = load();
  const key = normalize(input);
  return brain.patterns[key]?.answer || null;
}

// 获取等级
export function getLevel(): { level: number; xp: number; total: number } {
  const brain = load();
  const total = Object.values(brain.patterns).reduce((a, b) => a + b.count, 0);
  return { level: brain.level, xp: brain.xp, total };
}

// 相似度匹配
function normalize(s: string): string {
  return s.toLowerCase().replace(/[，。？！]/g, '').substring(0, 15);
}

// 获取统计
export function getStats(): any {
  const brain = load();
  const total = Object.values(brain.patterns).reduce((a, b) => a + b.count, 0);
  
  return {
    level: brain.level,
    xp: brain.xp,
    patternsLearned: Object.keys(brain.patterns).length,
    total,
    topIntents: Object.entries(brain.intents).sort((a, b) => b[1] - a[1]).slice(0, 5),
  };
}
