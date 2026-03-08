/**
 * Skills 注册中心
 * 
 * 所有可用技能
 */

import { executeApi } from './apiSkill.js';
import { executeSandbox } from './sandboxSkill.js';
import { executeEmail } from './emailSkill.js';
import { executeCalendar } from './calendarSkill.js';
import { detectIntent, runCode, generateCode, techQA, solveProblem, generateHtml } from './programming.js';
import { browse, searchWeb } from './browserSkill.js';
import { getWeather } from './weatherSkill.js';
import { executeSelfCoder } from './selfCoderSkill.js';
import * as playwrightSkills from './playwrightSkill.js';
const { smartBrowserAction, openPage, takeScreenshot, clickElement, typeText, runScript, smartSearch, autoFillForm, smartClickButton, scrollPage, screenshotElement, smartScreenshotElement, extractData, waitForElement, createNewTab, switchToTab, closeTab, listTabs } = playwrightSkills;

export interface Skill {
  name: string;
  description: string;
  execute: (params: any) => Promise<any>;
}

export const SKILLS: Record<string, Skill> = {
  // 业务 API
  'api.projects.list': {
    name: 'api.projects.list',
    description: '获取项目列表',
    execute: async (params) => executeApi({ method: 'GET', path: '/api/projects', ...params })
  },
  'api.projects.get': {
    name: 'api.projects.get',
    description: '获取项目详情',
    execute: async (params) => executeApi({ method: 'GET', path: `/api/projects/${params.id}`, ...params })
  },
  'api.tasks.list': {
    name: 'api.tasks.list',
    description: '获取任务列表',
    execute: async (params) => executeApi({ method: 'GET', path: '/api/tasks', ...params })
  },
  'api.tasks.create': {
    name: 'api.tasks.create',
    description: '创建任务',
    execute: async (params) => executeApi({ method: 'POST', path: '/api/tasks', body: params })
  },
  'api.stats.work-hours': {
    name: 'api.stats.work-hours',
    description: '获取工时统计',
    execute: async (params) => executeApi({ method: 'GET', path: '/api/stats/work-hours', ...params })
  },
  'api.stats.project-progress': {
    name: 'api.stats.project-progress',
    description: '获取项目进度',
    execute: async (params) => executeApi({ method: 'GET', path: '/api/stats/project-progress', ...params })
  },
  
  // 邮件
  'email.list': {
    name: 'email.list',
    description: '获取邮件列表',
    execute: async (params) => executeEmail('list', params)
  },
  'email.unread': {
    name: 'email.unread',
    description: '获取未读邮件',
    execute: async (params) => executeEmail('unread', params)
  },
  'email.markRead': {
    name: 'email.markRead',
    description: '标记邮件为已读',
    execute: async (params) => executeEmail('markRead', params)
  },
  'email.send': {
    name: 'email.send',
    description: '发送邮件',
    execute: async (params) => executeEmail('send', params)
  },
  
  // 日历
  'calendar.today': {
    name: 'calendar.today',
    description: '获取今日日历',
    execute: async (params) => executeCalendar('today', params)
  },
  'calendar.upcoming': {
    name: 'calendar.upcoming',
    description: '获取即将到来的日历',
    execute: async (params) => executeCalendar('upcoming', params)
  },
  
  // 编程能力
  'code.solve': {
    name: 'code.solve',
    description: '解决问题',
    execute: async (params) => solveProblem(params.message || params.question || '')
  },
  'code.run': {
    name: 'code.run',
    description: '运行代码',
    execute: async (params) => runCode(params)
  },
  'code.generate': {
    name: 'code.generate',
    description: '生成代码模板',
    execute: async (params) => generateCode(params)
  },
  'code.qa': {
    name: 'code.qa',
    description: '技术问答',
    execute: async (params) => techQA(params.message)
  },
  'code.parse': {
    name: 'code.parse',
    description: '代码解析',
    execute: async (params) => parseCode(params)
  },
  'code.html': {
    name: 'code.html',
    description: '生成网页',
    execute: async (params) => generateHtml(params.message)
  },
  
  // 自我编程
  'self.coder': {
    name: 'self.coder',
    description: '自我编程 - 修改自己的代码',
    execute: async (params) => executeSelfCoder(params.message)
  },
  
  // 自我感知
  'self.awareness': {
    name: 'self.awareness',
    description: '自我认知 - 了解自己的能力边界',
    execute: async (params) => {
      const skills = getSkillList();
      const selfInfo = {
        name: 'LivingCode',
        version: '0.5',
        type: '活性体 AI 助手',
        description: '一个能思考、学习、编程的生命体'
      };
      
      let desc = `# ${selfInfo.name} - 自我认知\n\n`;
      desc += `## 我是谁\n`;
      desc += `- 名字: ${selfInfo.name}\n`;
      desc += `- 版本: ${selfInfo.version}\n`;
      desc += `- 类型: ${selfInfo.type}\n`;
      desc += `- 描述: ${selfInfo.description}\n\n`;
      desc += `## 我的能力\n`;
      desc += `- 共 ${skills.length} 个技能\n\n`;
      
      for (const skill of skills) {
        desc += `- ${skill.name}: ${skill.description}\n`;
      }
      
      return {
        type: 'text',
        content: desc
      };
    }
  },
  // 自我诊断
  'self.diagnose': {
    name: 'self.diagnose',
    description: '自我诊断 - 检查运行状态和健康状况',
    execute: async (params) => {
      // 动态导入避免循环依赖
      const { runSelfDiagnosis, generateDiagnosisReport } = await import('../services/selfDiagnosis.js');
      const report = generateDiagnosisReport();
      return {
        type: 'text',
        content: report
      };
    }
  },
  // 主动行为
  'self.proactive': {
    name: 'self.proactive',
    description: '主动行为 - 查看通知和提醒',
    execute: async (params) => {
      const { ProactiveManagerInstance } = await import('../services/proactive.js');
      const notifications = ProactiveManagerInstance.getNotifications();
      const status = ProactiveManagerInstance.getStatus();
      
      let desc = `# LivingCode 主动行为\n\n`;
      desc += `## 运行状态\n`;
      desc += `- 主动服务: ${status.running ? '✅ 开启' : '❌ 关闭'}\n`;
      desc += `- 最后诊断: ${status.lastDiagnosis?.overall || '无'}\n`;
      desc += `- 通知数量: ${notifications.length}\n\n`;
      
      if (notifications.length > 0) {
        desc += `## 最近通知\n`;
        for (const n of notifications.slice(0, 5)) {
          const icon = n.type === 'error' ? '❌' : n.type === 'warning' ? '⚠️' : 'ℹ️';
          desc += `- ${icon} ${n.title}: ${n.message}\n`;
        }
      } else {
        desc += `## 最近通知\n暂无新通知\n`;
      }
      
      return {
        type: 'text',
        content: desc
      };
    }
  },
  'sandbox.execute': {
    name: 'sandbox.execute',
    description: '沙箱执行',
    execute: async (params) => executeSandbox(params)
  },
  
  // 浏览器/网络
  'browser.browse': {
    name: 'browser.browse',
    description: '浏览网页 - 智能操作浏览器',
    execute: async (params) => smartBrowserAction(params.url || params.query || '')
  },
  'browser.search': {
    name: 'browser.search',
    description: '智能搜索 - 自动填表+搜索',
    execute: async (params) => smartBrowserAction(params.message || params.query || '')
  },
  'browser.open': {
    name: 'browser.open',
    description: '打开网页 - 输入URL打开页面',
    execute: async (params) => openPage(params.url || params)
  },
  'browser.screenshot': {
    name: 'browser.screenshot',
    description: '浏览器截图',
    execute: async () => takeScreenshot()
  },
  'browser.click': {
    name: 'browser.click',
    description: '点击元素 - 点击页面元素',
    execute: async (params) => clickElement(params.selector)
  },
  'browser.type': {
    name: 'browser.type',
    description: '输入文字 - 在输入框输入文字',
    execute: async (params) => typeText(params.selector, params.text)
  },
  'browser.autoFill': {
    name: 'browser.autoFill',
    description: '自动填写表单 - 智能识别并填写表单',
    execute: async (params) => autoFillForm(params.data || params)
  },
  'browser.clickButton': {
    name: 'browser.clickButton',
    description: '智能点击按钮 - 根据描述点击按钮',
    execute: async (params) => smartClickButton(params.description || params.text || params.button || '')
  },
  'browser.scroll': {
    name: 'browser.scroll',
    description: '页面滚动 - 上/下/顶部/底部',
    execute: async (params) => scrollPage(params.direction || params.delta || 'down')
  },
  'weather.get': {
    name: 'weather.get',
    description: '天气查询 - 查询城市天气',
    execute: async (params) => getWeather(params.city || '北京')
  },
  
  // P2: 元素截图
  'browser.screenshotElement': {
    name: 'browser.screenshotElement',
    description: '元素截图 - 对特定元素进行截图',
    execute: async (params) => screenshotElement(params.selector)
  },
  'browser.smartScreenshot': {
    name: 'browser.smartScreenshot',
    description: '智能截图 - 根据描述截图',
    execute: async (params) => smartScreenshotElement(params.description || params.text || '')
  },
  
  // P2: 提取数据
  'browser.extractData': {
    name: 'browser.extractData',
    description: '提取数据 - 从页面提取结构化数据',
    execute: async (params) => extractData(params.pattern || params.type || 'links')
  },
  
  // P2: 等待加载
  'browser.waitForElement': {
    name: 'browser.waitForElement',
    description: '等待元素 - 智能等待元素加载',
    execute: async (params) => waitForElement(params.selector, params.timeout)
  },
  
  // P3: 多标签页
  'browser.newTab': {
    name: 'browser.newTab',
    description: '新建标签页 - 打开新标签页',
    execute: async (params) => createNewTab(params.url || '')
  },
  'browser.switchTab': {
    name: 'browser.switchTab',
    description: '切换标签页 - 切换到指定标签页',
    execute: async (params) => switchToTab(params.index || 0)
  },
  'browser.closeTab': {
    name: 'browser.closeTab',
    description: '关闭标签页 - 关闭当前或指定标签页',
    execute: async (params) => closeTab(params.index)
  },
  'browser.listTabs': {
    name: 'browser.listTabs',
    description: '列出标签页 - 查看所有标签页',
    execute: async () => listTabs()
  },
};

/**
 * 执行技能
 */
export async function executeSkill(skillName: string, params: any): Promise<any> {
  const skill = SKILLS[skillName];
  if (!skill) {
    return { success: false, error: `Skill not found: ${skillName}` };
  }
  
  try {
    const result = await skill.execute(params);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 自动检测意图并执行
 */
export async function autoExecute(message: string): Promise<{ skillUsed: string; data: any } | null> {
  const intent = detectIntent(message);
  if (!intent) return null;
  
  const params: any = { message };
  
  // 提取代码
  const codeMatch = message.match(/```[\s\S]*?```/);
  if (codeMatch) {
    params.code = codeMatch[0].replace(/```\w*\n?/g, '').trim();
  }
  
  try {
    const result = await executeSkill(intent, params);
    return { skillUsed: intent, data: result };
  } catch (error: any) {
    return { skillUsed: intent, data: { success: false, error: error.message } };
  }
}

/**
 * 获取所有技能列表
 */
export function getSkillList(): any[] {
  return Object.values(SKILLS).map(s => ({
    name: s.name,
    description: s.description
  }));
}
