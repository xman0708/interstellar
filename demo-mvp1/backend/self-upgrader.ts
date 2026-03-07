/**
 * Self-Upgrader - 自我升级模块
 * 功能：
 * - 检查 git remote 最新版本
 * - npm install 更新依赖
 * - pm2 restart 重启服务
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const CONFIG = {
  projectPath: path.join(__dirname, '../..'),
  backupPath: path.join(__dirname, '../../workspace/backups'),
  logPath: path.join(__dirname, '../../workspace/logs/self-upgrader.log'),
  checkIntervalHours: 24, // 每24小时检查一次
};

interface UpgradeResult {
  success: boolean;
  message: string;
  details?: {
    hasUpdates: boolean;
    changes?: string[];
    error?: string;
  };
}

class SelfUpgrader {
  private lastCommitHash: string = '';

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
   * 获取当前 git commit hash
   */
  async getCurrentCommit(): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse HEAD', {
        cwd: CONFIG.projectPath,
      });
      return stdout.trim();
    } catch (error) {
      this.log(`获取当前版本失败: ${error}`);
      return '';
    }
  }

  /**
   * 检查远程是否有新版本
   */
  async checkForUpdates(): Promise<{ hasUpdates: boolean; changes: string[] }> {
    try {
      this.log('正在检查更新...');
      
      // fetch 最新
      await execAsync('git fetch origin', { cwd: CONFIG.projectPath });
      
      // 获取当前 commit
      const currentCommit = await this.getCurrentCommit();
      
      // 获取远程最新 commit
      const { stdout: remoteStdout } = await execAsync(
        'git rev-parse origin/main',
        { cwd: CONFIG.projectPath }
      );
      const remoteCommit = remoteStdout.trim();
      
      // 获取变更列表
      const { stdout: logStdout } = await execAsync(
        `git log ${currentCommit}..${remoteCommit} --oneline`,
        { cwd: CONFIG.projectPath }
      );
      const changes = logStdout.trim().split('\n').filter(Boolean);
      
      const hasUpdates = currentCommit !== remoteCommit;
      this.log(`当前版本: ${currentCommit.slice(0, 7)}`);
      this.log(`远程版本: ${remoteCommit.slice(0, 7)}`);
      this.log(`有更新: ${hasUpdates}, 变更数: ${changes.length}`);
      
      return { hasUpdates, changes };
    } catch (error) {
      this.log(`检查更新失败: ${error}`);
      return { hasUpdates: false, changes: [] };
    }
  }

  /**
   * 创建备份
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}`;
    const backupDir = path.join(CONFIG.backupPath, backupName);
    
    try {
      // 只备份关键文件
      const filesToBackup = ['package.json', 'package-lock.json', 'server.ts', 'agent/'];
      
      fs.mkdirSync(backupDir, { recursive: true });
      
      for (const file of filesToBackup) {
        const src = path.join(CONFIG.projectPath, 'backend', file);
        const dest = path.join(backupDir, file);
        
        if (fs.existsSync(src)) {
          const destDir = path.dirname(dest);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          fs.copyFileSync(src, dest);
        }
      }
      
      this.log(`备份已创建: ${backupName}`);
      return backupName;
    } catch (error) {
      this.log(`创建备份失败: ${error}`);
      throw error;
    }
  }

  /**
   * 执行升级
   */
  async upgrade(): Promise<UpgradeResult> {
    try {
      this.log('========== 开始自我升级 ==========');
      
      // 1. 检查更新
      const { hasUpdates, changes } = await this.checkForUpdates();
      
      if (!hasUpdates) {
        return {
          success: true,
          message: '已是最新版本',
          details: { hasUpdates: false }
        };
      }

      // 2. 创建备份
      const backupName = await this.createBackup();
      
      // 3. 拉取最新代码
      this.log('正在拉取最新代码...');
      await execAsync('git pull origin main', { cwd: CONFIG.projectPath });
      
      // 4. 更新依赖
      this.log('正在更新依赖...');
      await execAsync('npm install', { 
        cwd: path.join(CONFIG.projectPath, 'backend'),
        timeout: 300000 // 5分钟超时
      });
      
      // 5. 重启服务
      this.log('正在重启服务...');
      await this.restartService();
      
      this.log('========== 升级完成 ==========');
      
      return {
        success: true,
        message: '升级成功',
        details: { hasUpdates: true, changes }
      };
    } catch (error: any) {
      this.log(`升级失败: ${error.message}`);
      
      // 尝试回滚
      await this.rollback();
      
      return {
        success: false,
        message: '升级失败',
        details: { hasUpdates: false, error: error.message }
      };
    }
  }

  /**
   * 回滚
   */
  async rollback(): Promise<void> {
    try {
      this.log('正在尝试回滚...');
      await execAsync('git checkout .', { cwd: CONFIG.projectPath });
      await this.restartService();
      this.log('回滚完成');
    } catch (error) {
      this.log(`回滚失败: ${error}`);
    }
  }

  /**
   * 重启服务
   */
  async restartService(): Promise<void> {
    try {
      // 尝试使用 pm2 重启
      await execAsync('pm2 restart livingcode-backend', { cwd: CONFIG.projectPath });
    } catch {
      // pm2 不可用，尝试直接 node
      this.log('pm2 不可用，请手动重启服务');
    }
  }

  /**
   * 启动定时检查
   */
  startScheduledCheck() {
    const intervalMs = CONFIG.checkIntervalHours * 60 * 60 * 1000;
    this.log(`定时检查已启动，每 ${CONFIG.checkIntervalHours} 小时检查一次`);
    
    setInterval(async () => {
      const { hasUpdates } = await this.checkForUpdates();
      if (hasUpdates) {
        await this.upgrade();
      }
    }, intervalMs);
  }
}

// 导出单例
export const selfUpgrader = new SelfUpgrader();

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'check') {
    selfUpgrader.checkForUpdates().then(result => {
      console.log(JSON.stringify(result, null, 2));
    });
  } else if (command === 'upgrade') {
    selfUpgrader.upgrade().then(result => {
      console.log(JSON.stringify(result, null, 2));
    });
  } else if (command === 'daemon') {
    selfUpgrader.startScheduledCheck();
  } else {
    console.log('用法:');
    console.log('  node self-upgrader.js check   # 检查更新');
    console.log('  node self-upgrader.js upgrade # 执行升级');
    console.log('  node self-upgrader.js daemon  # 启动定时检查');
  }
}
