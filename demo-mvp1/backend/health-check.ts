/**
 * HealthCheck - 自我监控模块
 * 功能：
 * - 进程监控
 * - 错误率监控
 * - 内存/CPU 监控
 * - 自动重启
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { feishuNotifier } from './feishu-notifier';

const execAsync = promisify(exec);

const CONFIG = {
  projectPath: path.join(process.cwd()),
  logPath: path.join(process.cwd(), 'workspace/logs/health-check.log'),
  serverLogPath: path.join(process.cwd(), 'workspace/logs/server.log'),
  checkIntervalSeconds: 60, // 每60秒检查一次
  maxErrorRate: 0.3, // 超过30%错误率触发重启
  maxMemoryMB: 500, // 超过500MB内存触发告警
};

interface HealthStatus {
  healthy: boolean;
  processRunning: boolean;
  errorRate: number;
  memoryMB: number;
  cpuPercent: number;
  lastCheck: string;
  issues: string[];
}

class HealthCheck {
  private errorCount: number = 0;
  private totalRequests: number = 0;
  private lastNotifyTime: number = 0;
  private notifyCooldownMs: number = 5 * 60 * 1000; // 5分钟内不重复告警

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const dir = path.dirname(CONFIG.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(CONFIG.logPath, logMessage);
    console.log(logMessage.trim());
  }

  /**
   * 检查进程是否运行
   */
  async checkProcess(): Promise<{ running: boolean; pid?: number }> {
    try {
      // 尝试找到 node 进程
      const { stdout } = await execAsync(
        `pgrep -f "tsx.*server\\.ts" | head -1`
      );
      const pid = parseInt(stdout.trim(), 10);
      return { running: !!pid, pid: pid || undefined };
    } catch {
      return { running: false };
    }
  }

  /**
   * 计算错误率 (从日志文件)
   */
  async calculateErrorRate(): Promise<number> {
    try {
      if (!fs.existsSync(CONFIG.serverLogPath)) {
        return 0;
      }

      const content = fs.readFileSync(CONFIG.serverLogPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      
      // 只看最近100行
      const recentLines = lines.slice(-100);
      
      const errorLines = recentLines.filter(line => 
        line.includes('error') || 
        line.includes('Error') || 
        line.includes('ERROR') ||
        line.includes('fail') ||
        line.includes('Fail')
      );

      return recentLines.length > 0 ? errorLines.length / recentLines.length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * 获取内存和CPU使用
   */
  async getMemoryUsage(): Promise<{ memoryMB: number; cpuPercent: number }> {
    try {
      const { stdout } = await execAsync(
        `ps -o rss= -o %cpu= $(pgrep -f "tsx.*server\\.ts" | head -1) 2>/dev/null || echo "0 0"`
      );
      
      const [rss, cpu] = stdout.trim().split(/\s+/).map(Number);
      const memoryMB = Math.round((rss || 0) / 1024);
      
      return { memoryMB, cpuPercent: cpu || 0 };
    } catch {
      return { memoryMB: 0, cpuPercent: 0 };
    }
  }

  /**
   * 执行健康检查
   */
  async check(): Promise<HealthStatus> {
    const { running, pid } = await this.checkProcess();
    const errorRate = await this.calculateErrorRate();
    const { memoryMB, cpuPercent } = await this.getMemoryUsage();

    const issues: string[] = [];
    
    if (!running) {
      issues.push('进程未运行');
    }
    
    if (errorRate > CONFIG.maxErrorRate) {
      issues.push(`错误率过高: ${(errorRate * 100).toFixed(1)}%`);
    }
    
    if (memoryMB > CONFIG.maxMemoryMB) {
      issues.push(`内存使用过高: ${memoryMB}MB`);
    }

    const status: HealthStatus = {
      healthy: running && issues.length === 0,
      processRunning: running,
      errorRate,
      memoryMB,
      cpuPercent,
      lastCheck: new Date().toISOString(),
      issues
    };

    this.log(`健康检查: ${status.healthy ? '✅ 健康' : '❌ 异常'} | 进程: ${running ? '运行中' : '已停止'} | 错误率: ${(errorRate * 100).toFixed(1)}% | 内存: ${memoryMB}MB`);

    return status;
  }

  /**
   * 重启服务
   */
  async restartService(): Promise<boolean> {
    try {
      this.log('正在重启服务...');
      
      // 先杀掉旧进程
      try {
        await execAsync(`pkill -f "tsx.*server\\.ts"`);
      } catch {
        // 进程可能不存在
      }
      
      // 等待一下
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 启动新进程
      await execAsync(`cd ${path.join(CONFIG.projectPath, 'backend')} && nohup npx tsx server.ts > ${CONFIG.serverLogPath} 2>&1 &`);
      
      this.log('服务已重启');
      return true;
    } catch (error) {
      this.log(`重启失败: ${error}`);
      return false;
    }
  }

  /**
   * 发送飞书通知
   */
  private async sendAlert(issue: string, action: string) {
    const now = Date.now();
    // 冷却时间内不重复通知
    if (now - this.lastNotifyTime < this.notifyCooldownMs) {
      return;
    }

    try {
      await feishuNotifier.notify(
        'LivingCode 异常告警',
        `${issue}\n动作: ${action}`
      );
      this.lastNotifyTime = now;
      this.log('已发送飞书告警通知');
    } catch (error) {
      this.log(`发送飞书通知失败: ${error}`);
    }
  }

  /**
   * 监控循环
   */
  async monitor() {
    this.log('========== HealthCheck 启动 ==========');
    
    setInterval(async () => {
      const status = await this.check();
      
      if (!status.healthy) {
        this.log(`检测到问题: ${status.issues.join(', ')}`);
        
        // 如果进程不运行，立即重启
        if (!status.processRunning) {
          await this.sendAlert('进程已停止', '自动重启');
          await this.restartService();
        }
        // 如果错误率过高，重启
        else if (status.errorRate > CONFIG.maxErrorRate) {
          await this.sendAlert(`错误率过高: ${(status.errorRate * 100).toFixed(1)}%`, '自动重启');
          await this.restartService();
        }
        // 如果内存过高，只告警不重启
        else if (status.issues.length > 0) {
          await this.sendAlert(status.issues.join('; '), '仅告警');
        }
      }
    }, CONFIG.checkIntervalSeconds * 1000);
  }
}

// 导出单例
export const healthCheck = new HealthCheck();

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'check') {
    healthCheck.check().then(status => {
      console.log(JSON.stringify(status, null, 2));
    });
  } else if (command === 'monitor') {
    healthCheck.monitor();
  } else {
    console.log('用法:');
    console.log('  node health-check.js check   # 执行一次检查');
    console.log('  node health-check.js monitor  # 启动持续监控');
  }
}
