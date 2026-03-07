/**
 * Sandbox Skill - 沙箱代码执行
 */

const FORBIDDEN = ['require', 'import', 'process', 'global', 'eval', 'Function', 'window', 'document', 'fetch', 'XMLHttpRequest', 'fs', 'path', 'child_process'];

export async function executeSandbox(params: { code: string; input?: any }): Promise<any> {
  const { code, input } = params;
  
  if (!code) {
    return { success: false, error: 'code is required' };
  }
  
  // 安全检查
  for (const keyword of FORBIDDEN) {
    if (code.includes(keyword)) {
      return { success: false, error: `Forbidden keyword: ${keyword}` };
    }
  }
  
  try {
    // 捕获 console.log 输出
    const logs: string[] = [];
    
    // 用 Function 构造，传入 console
    const fn = new Function('console', 'input', `
      'use strict';
      ${code}
    `);
    
    // 创建 mock console
    const mockConsole = {
      log: (...args: any[]) => logs.push(args.map(a => 
        typeof a === 'object' ? JSON.stringify(a) : String(a)
      ).join(' ')),
      error: (...args: any[]) => logs.push('[ERROR] ' + args.join(' ')),
      warn: (...args: any[]) => logs.push('[WARN] ' + args.join(' ')),
      info: (...args: any[]) => logs.push('[INFO] ' + args.join(' ')),
    };
    
    const result = fn(mockConsole, input);
    
    // 返回日志或结果
    if (logs.length > 0) {
      return { success: true, result: logs.join('\n') };
    }
    
    if (result !== undefined) {
      return { success: true, result: typeof result === 'object' ? JSON.stringify(result) : String(result) };
    }
    
    return { success: true, result: '执行完成' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
