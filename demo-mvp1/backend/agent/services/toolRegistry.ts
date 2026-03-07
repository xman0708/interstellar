/**
 * Tool Registry - 统一工具注册 (PI-Mono 风格)
 * 
 * 所有技能都定义为工具，LLM 决定调用哪个
 */

import { executeSkill } from '../skills/registry.js';
import { executeSelfCoder } from '../skills/selfCoderSkill.js';
import { browse, searchWeb } from '../skills/browserSkill.js';
import { getWeather } from '../skills/weatherSkill.js';

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (params: any) => Promise<any>;
}

/**
 * 工具列表 - LLM 可以选择调用这些工具
 */
export const TOOLS: Record<string, Tool> = {
  // ===== 业务 API =====
  list_projects: {
    name: 'list_projects',
    description: '获取项目列表，用于回答关于有哪些项目的问题',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => executeSkill('api.projects.list', {})
  },
  
  list_tasks: {
    name: 'list_tasks',
    description: '获取任务/待办列表',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => executeSkill('api.tasks.list', {})
  },
  
  work_hours: {
    name: 'work_hours',
    description: '获取工时统计，了解工作时间情况',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => executeSkill('api.stats.work-hours', {})
  },
  
  project_progress: {
    name: 'project_progress',
    description: '获取项目进度信息',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => executeSkill('api.stats.project-progress', {})
  },

  // ===== 邮件 =====
  list_emails: {
    name: 'list_emails',
    description: '查看邮件列表，获取所有邮件',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => executeSkill('email.list', {})
  },
  
  unread_emails: {
    name: 'unread_emails',
    description: '查看未读邮件',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => executeSkill('email.unread', {})
  },
  
  send_email: {
    name: 'send_email',
    description: '发送邮件，需要提供收件人、主题、正文',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: '收件人邮箱' },
        subject: { type: 'string', description: '邮件主题' },
        body: { type: 'string', description: '邮件正文' }
      },
      required: ['to', 'subject', 'body']
    },
    execute: async (params) => executeSkill('email.send', params)
  },

  // ===== 日历 =====
  today_meetings: {
    name: 'today_meetings',
    description: '查看今天的会议安排',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => executeSkill('calendar.today', {})
  },
  
  upcoming_meetings: {
    name: 'upcoming_meetings',
    description: '查看即将到来的会议',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => executeSkill('calendar.upcoming', {})
  },

  // ===== 知识库 =====
  search_knowledge: {
    name: 'search_knowledge',
    description: '搜索知识库内容',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' }
      },
      required: ['query']
    },
    execute: async (params) => executeSkill('knowledge.search', params)
  },

  // ===== 浏览器/网络 =====
  web_search: {
    name: 'web_search',
    description: '搜索网页，获取网络信息',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' }
      },
      required: ['query']
    },
    execute: async (params) => searchWeb(params.query)
  },
  
  browse_url: {
    name: 'browse_url',
    description: '打开并浏览指定网页',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '网页URL' }
      },
      required: ['url']
    },
    execute: async (params) => browse(params.url)
  },

  // ===== 天气 =====
  get_weather: {
    name: 'get_weather',
    description: '查询天气情况',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: '城市名称，如"上海"' }
      },
      required: ['city']
    },
    execute: async (params) => getWeather(params.city || '上海')
  },

  // ===== 代码能力 =====
  run_code: {
    name: 'run_code',
    description: '运行代码，执行编程任务',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: '要运行的代码' },
        language: { type: 'string', description: '编程语言，如 python, javascript' }
      },
      required: ['code']
    },
    execute: async (params) => executeSkill('code.run', params)
  },
  
  solve_problem: {
    name: 'solve_problem',
    description: '解决编程问题，如算法、调试等',
    parameters: {
      type: 'object',
      properties: {
        problem: { type: 'string', description: '问题描述' }
      },
      required: ['problem']
    },
    execute: async (params) => executeSkill('code.solve', { message: params.problem })
  },

  // ===== 自我编程 (关键！) =====
  self_coder: {
    name: 'self_coder',
    description: '【最重要】修改/升级 LivingCode 自己的代码。当用户要求你修改代码、添加功能、优化代码、升级模块时，必须调用此工具',
    parameters: {
      type: 'object',
      properties: {
        request: { type: 'string', description: '用户的修改要求，如"在 emailSkill.ts 中添加获取附件功能"' }
      },
      required: ['request']
    },
    execute: async (params) => executeSelfCoder(params.request)
  },

  // ===== 自我感知 =====
  self_awareness: {
    name: 'self_awareness',
    description: '了解 LivingCode 自己的能力边界和当前状态',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => executeSkill('self.awareness', {})
  }
};

/**
 * 获取工具列表 (用于 LLM)
 */
export function getToolDefinitions() {
  return Object.values(TOOLS).map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

/**
 * 执行工具
 */
export async function executeTool(name: string, params: any): Promise<any> {
  const tool = TOOLS[name];
  if (!tool) {
    return { error: `未知工具: ${name}` };
  }
  
  try {
    return await tool.execute(params);
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * 获取工具名称列表
 */
export function getToolNames(): string[] {
  return Object.keys(TOOLS);
}
