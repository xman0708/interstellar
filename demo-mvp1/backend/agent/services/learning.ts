/**
 * Learning System - 学习系统
 * 
 * 从对话中学习，不断成长
 */

import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_PATH = path.join(__dirname, '../../../workspace');
const LEARNING_FILE = path.join(WORKSPACE_PATH, 'learning.json');

// 学习记录
interface Learning {
  patterns: Record<string, string[]>;  // 模式 → 回答
  skills: Record<string, number>;       // 技能使用次数
  preferences: Record<string, any>;    // 用户偏好
  learned: number;                     // 学习次数
}

/**
 * 加载学习数据
 */
function load(): Learning {
  if (fs.existsSync(LEARNING_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LEARNING_FILE, 'utf-8'));
    } catch {
      return defaultLearning();
    }
  }
  return defaultLearning();
}

function defaultLearning(): Learning {
  return {
    patterns: {},
    skills: {},
    preferences: {},
    learned: 0
  };
}

/**
 * 保存学习数据
 */
function save(data: Learning): void {
  fs.writeFileSync(LEARNING_FILE, JSON.stringify(data, null, 2));
}

/**
 * 学习用户表达方式
 */
export function learnPattern(input: string, response: string): void {
  const data = load();
  
  // 简化输入作为模式
  const key = input.toLowerCase().substring(0, 20);
  
  if (!data.patterns[key]) {
    data.patterns[key] = [];
  }
  
  // 避免重复
  if (!data.patterns[key].includes(response)) {
    data.patterns[key].push(response);
  }
  
  data.learned++;
  save(data);
}

/**
 * 记录技能使用
 */
export function learnSkill(skillName: string): void {
  const data = load();
  data.skills[skillName] = (data.skills[skillName] || 0) + 1;
  save(data);
}

/**
 * 获取最常用的技能
 */
export function getFrequentSkills(): string[] {
  const data = load();
  return Object.entries(data.skills)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill]) => skill);
}

/**
 * 获取学习统计
 */
export function getStats(): any {
  const data = load();
  return {
    learned: data.learned,
    patternsCount: Object.keys(data.patterns).length,
    topSkills: getFrequentSkills(),
    preferences: data.preferences,
  };
}

/**
 * 更新偏好
 */
export function updatePreference(key: string, value: any): void {
  const data = load();
  data.preferences[key] = value;
  save(data);
}
