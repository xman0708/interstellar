/**
 * 操作建议服务
 * 根据当前状态推荐下一步操作
 */

import { getRecommendations } from './userHabits.js';

interface ActionSuggestion {
  action: string;
  label: string;
  icon: string;
  reason: string;
  priority: number;
}

// 页面状态到建议的映射
const PAGE_SUGGESTIONS: Record<string, ActionSuggestion[]> = {
  'default': [
    { action: 'search', label: '搜索', icon: '🔍', reason: '快速搜索', priority: 1 },
    { action: 'browse', label: '打开网页', icon: '🌐', reason: '浏览网页', priority: 2 },
    { action: 'weather', label: '查天气', icon: '🌤️', reason: '查看天气', priority: 3 },
  ],
  'baidu': [
    { action: 'search', label: '再搜一个', icon: '🔍', reason: '继续搜索', priority: 1 },
    { action: 'scroll', label: '向下滚动', icon: '📜', reason: '查看更多结果', priority: 2 },
    { action: 'extract', label: '提取链接', icon: '🔗', reason: '获取搜索结果', priority: 3 },
  ],
  'github': [
    { action: 'search', label: '搜索项目', icon: '🔍', reason: '找项目', priority: 1 },
    { action: 'scroll', label: '浏览', icon: '📜', reason: '向下滚动', priority: 2 },
  ],
  'shopping': [
    { action: 'scroll', label: '浏览更多', icon: '📜', reason: '查看更多商品', priority: 1 },
    { action: 'extract', label: '比价', icon: '💰', reason: '提取价格信息', priority: 2 },
  ],
};

// 根据 URL 判断页面类型
function detectPageType(url: string): string {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('baidu') || urlLower.includes('google')) {
    return 'baidu';
  }
  if (urlLower.includes('github') || urlLower.includes('gitee')) {
    return 'github';
  }
  if (urlLower.includes('taobao') || urlLower.includes('jd') || urlLower.includes('shopping')) {
    return 'shopping';
  }
  
  return 'default';
}

// 根据用户习惯推荐
function getHabitBasedSuggestions(): ActionSuggestion[] {
  try {
    const habits = getRecommendations();
    const suggestions: ActionSuggestion[] = [];
    
    // 从习惯中生成建议
    if (habits.queries.length > 0) {
      suggestions.push({
        action: 'search',
        label: `搜索"${habits.queries[0]}"`,
        icon: '🔍',
        reason: '常用搜索',
        priority: 1
      });
    }
    
    if (habits.actions.length > 0) {
      const topAction = habits.actions[0];
      suggestions.push({
        action: topAction,
        label: getActionLabel(topAction),
        icon: getActionIcon(topAction),
        reason: '常用操作',
        priority: 2
      });
    }
    
    return suggestions.slice(0, 3);
  } catch (e) {
    return [];
  }
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'web_search': '搜索',
    'get_weather': '查天气',
    'list_emails': '查邮件',
    'list_projects': '看项目',
    'browser.scroll': '滚动',
  };
  return labels[action] || action;
}

function getActionIcon(action: string): string {
  const icons: Record<string, string> = {
    'web_search': '🔍',
    'get_weather': '🌤️',
    'list_emails': '📧',
    'list_projects': '📊',
    'browser.scroll': '📜',
  };
  return icons[action] || '👉';
}

// 获取建议
export function getSuggestions(currentUrl?: string, lastAction?: string): ActionSuggestion[] {
  const suggestions: ActionSuggestion[] = [];
  
  // 1. 页面相关建议
  if (currentUrl) {
    const pageType = detectPageType(currentUrl);
    const pageSuggestions = PAGE_SUGGESTIONS[pageType] || PAGE_SUGGESTIONS.default;
    suggestions.push(...pageSuggestions);
  }
  
  // 2. 习惯建议
  const habitSuggestions = getHabitBasedSuggestions();
  suggestions.push(...habitSuggestions);
  
  // 3. 基于上一步操作
  if (lastAction) {
    const followUps = getFollowUpSuggestions(lastAction);
    suggestions.push(...followUps);
  }
  
  // 去重并按优先级排序
  const unique = new Map();
  for (const s of suggestions) {
    if (!unique.has(s.action)) {
      unique.set(s.action, s);
    }
  }
  
  return Array.from(unique.values())
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 4);
}

// 根据上一步操作推荐下一步
function getFollowUpSuggestions(lastAction: string): ActionSuggestion[] {
  const followUps: Record<string, ActionSuggestion[]> = {
    'search': [
      { action: 'open', label: '打开结果', icon: '👉', reason: '打开第一个结果', priority: 1 },
      { action: 'scroll', label: '查看更多', icon: '📜', reason: '滚动页面', priority: 2 },
    ],
    'browse': [
      { action: 'extract', label: '提取数据', icon: '📊', reason: '提取页面信息', priority: 1 },
      { action: 'scroll', label: '浏览', icon: '📜', reason: '继续浏览', priority: 2 },
      { action: 'saveAsPdf', label: '保存PDF', icon: '📄', reason: '保存页面', priority: 3 },
    ],
    'fill': [
      { action: 'click', label: '提交', icon: '✓', reason: '提交表单', priority: 1 },
    ],
  };
  
  return followUps[lastAction] || [];
}

// 快速动作（用于快捷按钮）
export function quickActions = [
  { id: 'search', icon: '🔍', label: '搜索' },
  { id: 'weather', icon: '🌤️', label: '天气' },
  { id: 'email', icon: '📧', label: '邮件' },
  { id: 'project', icon: '📊', label: '项目' },
  { id: 'task', icon: '📋', label: '任务' },
  { id: 'scroll-down', icon: '📜', label: '向下' },
  { id: 'scroll-top', icon: '⬆️', label: '顶部' },
];

export default { getSuggestions, quickActions };
