/**
 * Self-Coder - 自我编程模块
 * 功能：
 * - 自动采集工程上下文（代码、文档、结构）
 * - 构建丰富的 Prompt
 * - 调用 OpenCode 执行修改
 * - 验证修改结果
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const CONFIG = {
  projectPath: path.join(process.cwd(), '..'),
  backendPath: path.join(process.cwd()),
  docsPath: path.join(process.cwd(), '../docs'),
  workspacePath: path.join(process.cwd(), '../workspace'),
  logPath: path.join(process.cwd(), 'workspace/logs/self-coder.log'),
  backupPath: path.join(process.cwd(), 'workspace/backups'),
  maxContextLines: 500, // 最大上下文行数
};

interface CodeContext {
  projectTree: string;
  relevantFiles: { path: string; content: string }[];
  docs: { name: string; content: string }[];
  buildProgress: string;
  recentCommits: string;
}

interface ModifyResult {
  success: boolean;
  message: string;
  modifiedFiles?: string[];
  error?: string;
}

class SelfCoder {
  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const dirs = [CONFIG.backupPath, path.dirname(CONFIG.logPath)];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(CONFIG.logPath, logMessage);
    console.log(logMessage.trim());
  }

  /**
   * 采集工程信息
   */
  async collectContext(focusFiles?: string[]): Promise<CodeContext> {
    this.log('开始采集工程上下文...');

    const context: CodeContext = {
      projectTree: '',
      relevantFiles: [],
      docs: [],
      buildProgress: '',
      recentCommits: '',
    };

    // 1. 项目结构
    try {
      const { stdout } = await execAsync(
        `find ${CONFIG.projectPath} -type f -name "*.ts" -o -name "*.js" -o -name "*.md" | grep -v node_modules | head -50`
      );
      context.projectTree = stdout;
    } catch (e) {
      context.projectTree = '获取失败';
    }

    // 2. 关键文件内容
    const keyFiles = [
      'server.ts',
      'package.json',
      'agent/index.ts',
      'agent/prompt.ts',
      ...(focusFiles || [])
    ];

    for (const file of keyFiles) {
      const filePath = path.join(CONFIG.backendPath, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        // 限制行数
        const lines = content.split('\n').slice(0, CONFIG.maxContextLines);
        context.relevantFiles.push({
          path: file,
          content: lines.join('\n')
        });
      }
    }

    // 3. 文档
    const docFiles = [
      'docs/BUILD_PROGRESS.md',
      'docs/SELF_OPS_PROGRESS.md',
      'workspace/memory/2026-03-07.md'
    ];

    for (const doc of docFiles) {
      const docPath = path.join(CONFIG.projectPath, doc);
      if (fs.existsSync(docPath)) {
        const content = fs.readFileSync(docPath, 'utf-8');
        context.docs.push({
          name: doc,
          content: content.slice(0, 2000) // 限制长度
        });
      }
    }

    // 4. 构建进度
    const buildProgressPath = path.join(CONFIG.projectPath, 'docs/BUILD_PROGRESS.md');
    if (fs.existsSync(buildProgressPath)) {
      context.buildProgress = fs.readFileSync(buildProgressPath, 'utf-8');
    }

    // 5. 最近提交
    try {
      const { stdout } = await execAsync(
        `cd ${CONFIG.projectPath} && git log --oneline -5`
      );
      context.recentCommits = stdout;
    } catch (e) {
      context.recentCommits = '获取失败';
    }

    this.log(`上下文采集完成: ${context.relevantFiles.length} 个文件, ${context.docs.length} 个文档`);
    return context;
  }

  /**
   * 构建完整 Prompt
   */
  buildPrompt(userRequest: string, context: CodeContext): string {
    let prompt = `# 工程修改请求

## 修改要求
${userRequest}

---

## 工程信息

### 项目结构
\`\`\`
${context.projectTree}
\`\`\`

### 当前构建进度
${context.buildProgress || '无'}

### 最近提交
\`\`\`
${context.recentCommits}
\`\`\`

---

## 相关代码文件
`;

    for (const file of context.relevantFiles) {
      prompt += `
### ${file.path}
\`\`\`typescript
${file.content}
\`\`\`
`;
    }

    for (const doc of context.docs) {
      prompt += `
## ${doc.name}
${doc.content}
`;
    }

    prompt += `

---

## 修改要求
请根据以上工程信息和需求，完成代码修改。

注意事项：
1. 只修改 demo-mvp1/backend/ 目录下的文件
2. 修改前先理解现有代码结构
3. 修改后确保代码可以正常运行
4. 如果需要安装新依赖，请更新 package.json
`;

    return prompt;
  }

  /**
   * 创建备份
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(CONFIG.backupPath, `coder-${timestamp}`);
    
    fs.mkdirSync(backupDir, { recursive: true });
    
    // 备份关键文件
    const filesToBackup = ['server.ts', 'package.json', 'agent/'];
    for (const file of filesToBackup) {
      const src = path.join(CONFIG.backendPath, file);
      const dest = path.join(backupDir, file);
      if (fs.existsSync(src)) {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        if (fs.statSync(src).isDirectory()) {
          // 简单复制目录
          await execAsync(`cp -r ${src} ${dest}`);
        } else {
          fs.copyFileSync(src, dest);
        }
      }
    }
    
    this.log(`备份已创建: ${backupDir}`);
    return backupDir;
  }

  /**
   * 执行代码修改
   */
  async modifyCode(userRequest: string, focusFiles?: string[]): Promise<ModifyResult> {
    try {
      this.log('========== 开始代码修改 ==========');
      this.log(`修改请求: ${userRequest}`);

      // 1. 采集上下文
      const context = await this.collectContext(focusFiles);

      // 2. 构建 Prompt
      const fullPrompt = this.buildPrompt(userRequest, context);
      
      // 保存 prompt 供调试
      const promptPath = path.join(CONFIG.backupPath, `prompt-${Date.now()}.md`);
      fs.writeFileSync(promptPath, fullPrompt);
      this.log(`完整 Prompt 已保存: ${promptPath}`);

      // 3. 创建备份
      const backupDir = await this.createBackup();

      // 4. 调用 OpenCode
      this.log('正在调用 OpenCode 执行修改...');
      
      // 使用 opencode run 执行
      const { stdout, stderr } = await execAsync(
        `opencode run "${userRequest}" --fork`,
        { timeout: 300000 } // 5分钟超时
      );

      this.log(`OpenCode 输出: ${stdout.slice(0, 500)}`);
      if (stderr) {
        this.log(`OpenCode 错误: ${stderr.slice(0, 500)}`);
      }

      // 5. 验证修改
      const verification = await this.verifyModification();
      
      if (verification.success) {
        this.log('========== 修改完成 ==========');
        return {
          success: true,
          message: '修改成功',
          modifiedFiles: verification.files
        };
      } else {
        // 验证失败，尝试回滚
        this.log(`验证失败: ${verification.error}`);
        await this.rollback(backupDir);
        return {
          success: false,
          message: '修改失败，已回滚',
          error: verification.error
        };
      }

    } catch (error: any) {
      this.log(`修改失败: ${error.message}`);
      return {
        success: false,
        message: '修改失败',
        error: error.message
      };
    }
  }

  /**
   * 验证修改
   */
  async verifyModification(): Promise<{ success: boolean; files?: string[]; error?: string }> {
    try {
      // 1. 检查 TypeScript 编译
      this.log('验证: TypeScript 编译...');
      await execAsync(`cd ${CONFIG.backendPath} && npx tsc --noEmit`, { timeout: 60000 });
      
      // 2. 检查文件是否有变化
      const { stdout } = await execAsync(
        `cd ${CONFIG.projectPath} && git status --porcelain demo-mvp1/backend/`
      );
      
      const modifiedFiles = stdout.split('\n').filter(Boolean);
      
      if (modifiedFiles.length === 0) {
        return { success: false, error: '没有文件被修改' };
      }

      this.log(`验证通过，修改了 ${modifiedFiles.length} 个文件`);
      return { success: true, files: modifiedFiles };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 回滚
   */
  async rollback(backupDir: string): Promise<void> {
    try {
      this.log('正在回滚...');
      await execAsync(`cp -r ${backupDir}/* ${CONFIG.backendPath}/`);
      this.log('回滚完成');
    } catch (error) {
      this.log(`回滚失败: ${error}`);
    }
  }
}

// 导出单例
export const selfCoder = new SelfCoder();

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'modify') {
    const request = args.slice(1).join(' ');
    selfCoder.modifyCode(request).then(result => {
      console.log(JSON.stringify(result, null, 2));
    });
  } else if (command === 'context') {
    selfCoder.collectContext().then(context => {
      console.log('项目结构:');
      console.log(context.projectTree);
      console.log('\n文件数:', context.relevantFiles.length);
    });
  } else {
    console.log('用法:');
    console.log('  node self-coder.js modify <修改请求>');
    console.log('  node self-coder.js context');
  }
}
