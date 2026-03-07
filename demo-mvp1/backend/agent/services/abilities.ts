/**
 * Ability Extender - 能力扩展器
 * 
 * 自动扩展 LivingCode 的能力边界
 */

import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_PATH = path.join(__dirname, '../../../workspace');
const ABILITIES_FILE = path.join(WORKSPACE_PATH, 'abilities.json');

interface Ability {
  id: string;
  name: string;
  patterns: string[];  // 触发模式
  handler: string;      // 处理方式
  example: string;
  learned: number;
}

// 内置能力
const BUILTIN_ABILITIES: Ability[] = [
  {
    id: 'code_solve',
    name: '编程问题解决',
    patterns: ['帮我写', '计算', '处理', '找出', '去重', '排序', '过滤'],
    handler: 'code.solve',
    example: '计算数组偶数的和',
    learned: 1
  },
  {
    id: 'tech_qa',
    name: '技术问答',
    patterns: ['javascript', 'js', '数组', '对象', '函数', 'async'],
    handler: 'code.qa',
    example: 'JavaScript数组怎么用',
    learned: 1
  },
  {
    id: 'code_gen',
    name: '代码生成',
    patterns: ['生成代码', '写个函数', '帮我写'],
    handler: 'code.generate',
    example: '帮我写个防抖函数',
    learned: 1
  },
];

// 加载能力
function load(): Ability[] {
  if (fs.existsSync(ABILITIES_FILE)) {
    try { return JSON.parse(fs.readFileSync(ABILITIES_FILE, 'utf-8')); } catch {}
  }
  return BUILTIN_ABILITIES;
}

function save(abilities: Ability[]): void {
  fs.writeFileSync(ABILITIES_FILE, JSON.stringify(abilities, null, 2));
}

/**
 * 获取所有能力
 */
export function getAll(): Ability[] {
  return load();
}

/**
 * 匹配能力
 */
export function match(input: string): Ability | null {
  const abilities = load();
  const msg = input.toLowerCase();
  
  for (const ability of abilities) {
    for (const pattern of ability.patterns) {
      if (msg.includes(pattern)) {
        ability.learned++;
        save(abilities);
        return ability;
      }
    }
  }
  
  return null;
}

/**
 * 学习新能力
 */
export function learn(pattern: string, name: string, handler: string, example: string): Ability {
  const abilities = load();
  
  // 检查是否已存在
  let ability = abilities.find(a => a.name === name);
  
  if (!ability) {
    ability = {
      id: `ability_${Date.now()}`,
      name,
      patterns: [],
      handler,
      example,
      learned: 0
    };
    abilities.push(ability);
  }
  
  // 添加新模式
  if (!ability.patterns.includes(pattern)) {
    ability.patterns.push(pattern);
  }
  
  save(abilities);
  return ability;
}

/**
 * 获取统计
 */
export function getStats(): any {
  const abilities = load();
  const total = abilities.reduce((a, b) => a + b.learned, 0);
  
  return {
    total,
    abilities: abilities.map(a => ({
      name: a.name,
      patterns: a.patterns.length,
      learned: a.learned
    }))
  };
}

// 初始化
export function init(): void {
  const abilities = load();
  if (abilities.length === 0) {
    save(BUILTIN_ABILITIES);
  }
}

init();
