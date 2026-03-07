/**
 * Smart Evolution System - 智能自我进化
 * 
 * 自动分析交互，持续迭代升级
 */

import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_PATH = path.join(__dirname, '../../../workspace');
const EVOLUTION_FILE = path.join(WORKSPACE_PATH, 'evolution.json');

// 进化数据
interface EvolutionData {
  version: number;           // 版本号
  level: number;            // 智能等级
  xp: number;              // 经验值
  totalInteractions: number; // 总交互数
  successfulSkills: number;  // 成功技能调用
  failedSkills: number;     // 失败技能调用
  patterns: Pattern[];      // 已学会的模式
  improvements: Improvement[]; // 改进记录
  autoTuning: AutoTuning;   // 自动调优参数
}

interface Pattern {
  trigger: string;      // 触发词
  skill: string;        // 使用的技能
  successRate: number;  // 成功率
  count: number;        // 使用次数
}

interface Improvement {
  time: string;
  type: 'keyword' | 'prompt' | 'skill' | 'context';
  before: string;
  after: string;
  reason: string;
}

interface AutoTuning {
  retryCount: number;       // 重试次数
  codeLoopCount: number;    // 代码循环次数
  contextWindow: number;   // 上下文窗口
  temperature: number;       // LLM 温度
}

const DEFAULT_EVOLUTION: EvolutionData = {
  version: 1,
  level: 1,
  xp: 0,
  totalInteractions: 0,
  successfulSkills: 0,
  failedSkills: 0,
  patterns: [],
  improvements: [],
  autoTuning: {
    retryCount: 2,
    codeLoopCount: 3,
    contextWindow: 10,
    temperature: 0.7
  }
};

// 加载进化数据
export function loadEvolution(): EvolutionData {
  if (fs.existsSync(EVOLUTION_FILE)) {
    try { return JSON.parse(fs.readFileSync(EVOLUTION_FILE, 'utf-8')); } catch {}
  }
  return { ...DEFAULT_EVOLUTION };
}

function saveEvolution(data: EvolutionData): void {
  fs.writeFileSync(EVOLUTION_FILE, JSON.stringify(data, null, 2));
}

// 记录一次交互
export function recordInteraction(success: boolean, skillUsed?: string, trigger?: string): void {
  const data = loadEvolution();
  
  data.totalInteractions++;
  
  if (success && skillUsed) {
    data.successfulSkills++;
    data.xp += 10;
    
    // 记录成功模式
    if (trigger && skillUsed) {
      const existing = data.patterns.find(p => p.trigger === trigger);
      if (existing) {
        existing.count++;
        existing.successRate = (existing.successRate * (existing.count - 1) + 100) / existing.count;
      } else {
        data.patterns.push({ trigger, skill: skillUsed, successRate: 100, count: 1 });
      }
    }
  } else if (!success) {
    data.failedSkills++;
  }
  
  // 自动升级检查
  checkLevelUp(data);
  
  // 自动调优
  autoTune(data);
  
  saveEvolution(data);
}

// 检查是否升级
function checkLevelUp(data: EvolutionData): void {
  const xpPerLevel = 100;
  const newLevel = Math.floor(data.xp / xpPerLevel) + 1;
  
  if (newLevel > data.level) {
    data.level = newLevel;
    data.version++;
    
    // 记录升级
    data.improvements.push({
      time: new Date().toISOString(),
      type: 'skill',
      before: `Level ${newLevel - 1}`,
      after: `Level ${newLevel}`,
      reason: `XP reached ${data.xp}`
    });
    
    console.log(`🧬 Evolution: Level up to ${newLevel}!`);
  }
}

// 自动调优
function autoTune(data: EvolutionData): void {
  const successRate = data.totalInteractions > 0 
    ? data.successfulSkills / data.totalInteractions 
    : 0;
  
  // 根据成功率调整参数
  if (successRate < 0.5 && data.autoTuning.retryCount < 5) {
    // 成功率低，增加重试
    data.autoTuning.retryCount++;
    data.improvements.push({
      time: new Date().toISOString(),
      type: 'skill',
      before: `retryCount: ${data.autoTuning.retryCount - 1}`,
      after: `retryCount: ${data.autoTuning.retryCount}`,
      reason: `Success rate low (${(successRate * 100).toFixed(1)}%)`
    });
  }
  
  // 根据失败模式调整
  if (data.failedSkills > data.successfulSkills * 0.5) {
    data.autoTuning.contextWindow = Math.min(20, data.autoTuning.contextWindow + 2);
  }
}

// 获取当前智能等级
export function getSmartLevel(): { level: number; xp: number; version: number; progress: number } {
  const data = loadEvolution();
  const xpPerLevel = 100;
  const progress = (data.xp % xpPerLevel) / xpPerLevel * 100;
  
  return { level: data.level, xp: data.xp, version: data.version, progress };
}

// 获取优化建议
export function getOptimizationSuggestions(): string[] {
  const data = loadEvolution();
  const suggestions: string[] = [];
  
  const successRate = data.totalInteractions > 0 
    ? data.successfulSkills / data.totalInteractions 
    : 0;
  
  if (successRate < 0.6) {
    suggestions.push('🔧 意图识别需要改进，建议添加更多关键词模式');
  }
  
  if (data.failedSkills > data.successfulSkills) {
    suggestions.push('🔧 技能失败率高，建议检查技能实现');
  }
  
  if (data.patterns.length < 5) {
    suggestions.push('📚 模式库较少，多交互可以学会更多模式');
  }
  
  // 找出最常用的模式
  const topPatterns = [...data.patterns]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  
  if (topPatterns.length > 0) {
    suggestions.push(`⭐ 最常用: ${topPatterns.map(p => p.trigger).join(', ')}`);
  }
  
  return suggestions;
}

// 手动添加改进
export function addImprovement(type: Improvement['type'], before: string, after: string, reason: string): void {
  const data = loadEvolution();
  data.improvements.push({
    time: new Date().toISOString(),
    type,
    before,
    after,
    reason
  });
  saveEvolution(data);
}

// 获取进化报告
export function getEvolutionReport(): string {
  const data = loadEvolution();
  const successRate = data.totalInteractions > 0 
    ? (data.successfulSkills / data.totalInteractions * 100).toFixed(1) 
    : '0';
  
  const suggestions = getOptimizationSuggestions();
  
  return `
🧬 LivingCode 智能进化报告
━━━━━━━━━━━━━━━━━━━━━━
📊 等级: v${data.version}.${data.level}
📈 经验: ${data.xp} XP
💬 总交互: ${data.totalInteractions}
✅ 成功率: ${successRate}%
🔄 重试设置: ${data.autoTuning.retryCount}
🔄 循环设置: ${data.autoTuning.codeLoopCount}
━━━━━━━━━━━━━━━━━━━━━━
${suggestions.length > 0 ? '💡 ' + suggestions.join('\n💡 ') : '✨ 运行良好'}
`;
}
