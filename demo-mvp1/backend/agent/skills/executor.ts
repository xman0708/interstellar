/**
 * Skills 执行器
 * 
 * 根据 skill 名称执行对应的逻辑
 */

export interface SkillResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime?: number;
}

// API Base URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

/**
 * 执行 Skill
 */
export async function executeSkill(skillName: string, params: Record<string, any>): Promise<SkillResult> {
  switch (skillName) {
    case 'huiflow-api':
      return executeApi(params);
    case 'huiflow-sandbox':
      return executeSandbox(params);
    default:
      throw new Error(`Unknown skill: ${skillName}`);
  }
}

/**
 * 执行 API 调用
 */
async function executeApi(params: Record<string, any>): Promise<SkillResult> {
  const { method = 'GET', path, body } = params;
  
  if (!path) {
    return { success: false, error: 'path is required' };
  }
  
  const url = `${API_BASE_URL}${path}`;
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? require('https') : require('http');
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            success: true,
            result: parsed,
            executionTime: Date.now() - startTime
          });
        } catch {
          resolve({
            success: true,
            result: data,
            executionTime: Date.now() - startTime
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      });
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

/**
 * 执行沙箱代码
 */
async function executeSandbox(params: Record<string, any>): Promise<SkillResult> {
  const { code, input } = params;
  
  if (!code) {
    return { success: false, error: 'code is required' };
  }
  
  // 安全检查
  const forbidden = ['require', 'import', 'process', 'global', 'eval', 'Function', 'window', 'document'];
  for (const keyword of forbidden) {
    if (code.includes(keyword)) {
      return { success: false, error: `Forbidden keyword: ${keyword}` };
    }
  }
  
  const startTime = Date.now();
  
  try {
    // 使用 Function 构造函数创建沙箱（简化版）
    const fn = new Function('input', `'use strict';\n${code}`);
    const result = fn(input);
    
    return {
      success: true,
      result,
      executionTime: Date.now() - startTime
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime
    };
  }
}
