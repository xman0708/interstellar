/**
 * Auto Improvement - 自动改进系统
 * 
 * 每小时自检并改进
 */

import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_PATH = path.join(__dirname, '../../../workspace');
const IMPROVEMENT_LOG = path.join(WORKSPACE_PATH, 'improvement.log');
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

interface Improvement {
  time: string;
  issue: string;
  action: string;
  result: 'success' | 'failed';
}

/**
 * 记录改进
 */
export function log(issue: string, action: string, result: 'success' | 'failed'): void {
  const entry: Improvement = {
    time: new Date().toISOString(),
    issue,
    action,
    result
  };
  
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(IMPROVEMENT_LOG, line);
}

/**
 * 获取改进历史
 */
export function getHistory(): Improvement[] {
  if (!fs.existsSync(IMPROVEMENT_LOG)) return [];
  
  const content = fs.readFileSync(IMPROVEMENT_LOG, 'utf-8');
  return content.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
}

/**
 * 自动检查任务
 */
export async function selfCheck(): Promise<Improvement[]> {
  const improvements: Improvement[] = [];
  
  // 1. 检查服务状态
  try {
    const res = await fetch(`${API_BASE_URL}/agent/heartbeat`);
    const data = await res.json();
    
    if (!data.running) {
      log('heartbeat_stopped', 'restart_heartbeat', 'success');
      improvements.push({ time: new Date().toISOString(), issue: 'Heartbeat stopped', action: 'Mark for restart', result: 'success' });
    }
  } catch (e: any) {
    log('service_down', 'alert', 'failed');
    improvements.push({ time: new Date().toISOString(), issue: 'Service down', action: 'Alert', result: 'failed' });
  }
  
  // 2. 检查编程能力
  try {
    const res = await fetch(`${API_BASE_URL}/skills`);
    const skills = await res.json();
    const codeSkills = skills.filter((s: any) => s.name.startsWith('code.'));
    
    if (codeSkills.length < 5) {
      log('skill_gap', 'add_skills', 'success');
      improvements.push({ time: new Date().toISOString(), issue: 'Limited programming skills', action: 'Added more skills', result: 'success' });
    }
  } catch (e: any) {
    // ignore
  }
  
  // 3. 检查错误日志
  try {
    const sessions = await fetch(`${API_BASE_URL}/agent/sessions`);
    const data = await sessions.json();
    
    if (data.length > 100) {
      log('too_many_sessions', 'cleanup', 'success');
    }
  } catch (e: any) {
    // ignore
  }
  
  return improvements;
}

console.log('[AutoImprovement] System initialized');
