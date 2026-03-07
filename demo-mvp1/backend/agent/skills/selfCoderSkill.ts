/**
 * Self-Coder Skill - 自我编程
 * 
 * 让 LivingCode 自己修改自己的代码
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const BACKEND_PATH = path.join(process.cwd());

interface ModifyResult {
  success: boolean;
  message: string;
  modifiedFiles?: string[];
}

/**
 * 采集工程上下文
 */
async function collectContext(): Promise<string> {
  const context: string[] = [];
  
  // 项目结构
  try {
    const { stdout } = await execAsync(
      `find ${path.join(BACKEND_PATH, '..')} -type f -name "*.ts" | grep -v node_modules | head -30`
    );
    context.push('## 项目结构\n```\n' + stdout + '```');
  } catch (e) {
    context.push('获取项目结构失败');
  }

  // server.ts 关键内容
  const serverPath = path.join(BACKEND_PATH, 'server.ts');
  if (fs.existsSync(serverPath)) {
    const content = fs.readFileSync(serverPath, 'utf-8');
    // 取前100行
    const lines = content.split('\n').slice(0, 100);
    context.push('## server.ts (前100行)\n```typescript\n' + lines.join('\n') + '\n```');
  }

  // BUILD_PROGRESS.md
  const buildProgressPath = path.join(BACKEND_PATH, '../docs/BUILD_PROGRESS.md');
  if (fs.existsSync(buildProgressPath)) {
    const content = fs.readFileSync(buildProgressPath, 'utf-8');
    context.push('## BUILD_PROGRESS.md\n' + content);
  }

  return context.join('\n\n');
}

/**
 * 调用 OpenCode 修改代码
 */
async function callOpenCode(request: string): Promise<ModifyResult> {
  try {
    // 构建完整命令
    const fullRequest = `在 LivingCode/demo-mvp1/backend 目录下: ${request}`;
    
    // 调用 opencode
    const { stdout, stderr } = await execAsync(
      `opencode run "${fullRequest}" --fork`,
      { timeout: 300000 } // 5分钟超时
    );

    // 检查是否有明显错误
    if (stderr && stderr.includes('Error')) {
      return {
        success: false,
        message: `OpenCode 执行出错: ${stderr.slice(0, 500)}`
      };
    }

    // 检查文件变化
    try {
      const { stdout: gitStatus } = await execAsync(
        `cd ${path.join(BACKEND_PATH, '..')} && git status --porcelain demo-mvp1/backend/`
      );
      
      const modifiedFiles = gitStatus.split('\n').filter(Boolean);
      
      if (modifiedFiles.length > 0) {
        return {
          success: true,
          message: `修改完成！变化的文件:\n${modifiedFiles.join('\n')}`,
          modifiedFiles
        };
      }
    } catch (e) {
      // git 检查失败，继续
    }

    return {
      success: true,
      message: `OpenCode 执行完成: ${stdout.slice(0, 500)}`
    };

  } catch (error: any) {
    return {
      success: false,
      message: `执行失败: ${error.message}`
    };
  }
}

/**
 * 执行自我编程
 */
export async function executeSelfCoder(request: string): Promise<ModifyResult> {
  // 1. 采集上下文
  const context = await collectContext();
  
  // 2. 构建 prompt
  const fullPrompt = `
## 修改请求
${request}

${context}

请完成以上修改。修改完成后告诉我修改了哪些文件。
  `.trim();

  // 3. 调用 OpenCode
  // 这里简化为直接调用，因为我们已经在 backend 目录
  const result = await callOpenCode(request);
  
  return result;
}

// 如果直接运行
if (require.main === module) {
  const request = process.argv.slice(2).join(' ');
  if (request) {
    executeSelfCoder(request).then(result => {
      console.log(JSON.stringify(result, null, 2));
    });
  } else {
    console.log('用法: node selfCoderSkill.ts <修改请求>');
  }
}
