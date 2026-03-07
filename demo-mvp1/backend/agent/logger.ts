/**
 * Logger - 日志系统
 * 
 * 分级日志 + 文件输出
 */

import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR = path.join(__dirname, '../../logs');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private level: LogLevel = 'info';
  private logFile: string;
  
  constructor(name: string = 'livingcode') {
    const today = new Date().toISOString().split('T')[0];
    this.logFile = path.join(LOG_DIR, `${today}.log`);
  }
  
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
  
  private format(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let log = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (data) {
      log += ` ${JSON.stringify(data)}`;
    }
    return log;
  }
  
  private write(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;
    
    const line = this.format(level, message, data);
    console.log(line);
    
    // 写入文件
    fs.appendFileSync(this.logFile, line + '\n', 'utf-8');
  }
  
  debug(message: string, data?: any): void {
    this.write('debug', message, data);
  }
  
  info(message: string, data?: any): void {
    this.write('info', message, data);
  }
  
  warn(message: string, data?: any): void {
    this.write('warn', message, data);
  }
  
  error(message: string, data?: any): void {
    this.write('error', message, data);
  }
}

export const logger = new Logger('livingcode');
export default logger;
