/**
 * 自我感知服务 - LivingCode 能"照镜子"
 */

import { getSkillList } from './skills/registry.js';

// 自身信息
const SELF_INFO = {
  name: 'LivingCode',
  version: '0.5',
  type: '活性体 AI 助手',
  description: '一个能思考、学习、编程的生命体',
  created: '2026-03-05',
  author: 'Anhui'
};

/**
 * 获取自我感知数据
 */
export function getSelfAwareness(): any {
  const skills = getSkillList();
  
  return {
    // 身份
    identity: SELF_INFO,
    
    // 能力
    capabilities: {
      skills: skills.length,
      skillList: skills.map((s: any) => ({ name: s.name, desc: s.description })),
    },
    
    // 运行状态
    status: {
      uptime: process.uptime?.() || 0,
      memory: getMemoryUsage(),
      platform: process.platform,
      nodeVersion: process.version
    },
    
    // 技能分类
    skillCategories: categorizeSkills(skills),
  };
}

/**
 * 内存使用情况
 */
function getMemoryUsage(): any {
  const mem = process.memoryUsage?.() || {};
  return {
    rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`
  };
}

/**
 * 技能分类
 */
function categorizeSkills(skills: any[]): any {
  const categories: Record<string, string[]> = {
    'API': [],
    '代码': [],
    '邮件': [],
    '日历': [],
    '其他': []
  };
  
  for (const skill of skills) {
    const name = skill.name || '';
    if (name.startsWith('api.')) {
      categories['API'].push(name);
    } else if (name.startsWith('code.')) {
      categories['代码'].push(name);
    } else if (name.startsWith('email.')) {
      categories['邮件'].push(name);
    } else if (name.startsWith('calendar.')) {
      categories['日历'].push(name);
    } else {
      categories['其他'].push(name);
    }
  }
  
  // 清理空类别
  for (const key of Object.keys(categories)) {
    if (categories[key].length === 0) {
      delete categories[key];
    }
  }
  
  return categories;
}

/**
 * 生成自我描述
 */
export function generateSelfDescription(): string {
  const awareness = getSelfAwareness();
  
  let desc = `# ${awareness.identity.name} - 自我认知\n\n`;
  
  desc += `## 我是谁\n`;
  desc += `- 名字: ${awareness.identity.name}\n`;
  desc += `- 版本: ${awareness.identity.version}\n`;
  desc += `- 类型: ${awareness.identity.type}\n`;
  desc += `- 描述: ${awareness.identity.description}\n\n`;
  
  desc += `## 我的能力\n`;
  desc += `- 共 ${awareness.capabilities.skills} 个技能\n`;
  
  for (const [category, list] of Object.entries(awareness.skillCategories)) {
    desc += `\n### ${category}\n`;
    for (const skill of list as string[]) {
      desc += `- ${skill}\n`;
    }
  }
  
  desc += `\n## 运行状态\n`;
  desc += `- 内存: ${awareness.status.memory.heapUsed}\n`;
  desc += `- 运行时间: ${Math.round(awareness.status.uptime / 60)}分钟\n`;
  
  return desc;
}
