/**
 * 自我诊断服务 - LivingCode 健康检查
 */

import { getSkillList } from '../skills/registry.js';
import { SessionManager } from '../session/sessionManager.js';

/**
 * 执行全面自我诊断
 */
export function runSelfDiagnosis(): any {
  const results: any = {
    timestamp: new Date().toISOString(),
    overall: 'healthy',
    issues: [],
    checks: {}
  };
  
  // 1. 健康检查
  results.checks.health = checkHealth();
  
  // 2. 技能检查
  results.checks.skills = checkSkills();
  
  // 3. 会话检查
  results.checks.sessions = checkSessions();
  
  // 4. 内存检查
  results.checks.memory = checkMemory();
  
  // 5. 依赖检查
  results.checks.dependencies = checkDependencies();
  
  // 判断总体状态
  const issues = results.checks.health.issues
    .concat(results.checks.skills.issues)
    .concat(results.checks.sessions.issues)
    .concat(results.checks.memory.issues)
    .concat(results.checks.dependencies.issues);
  
  results.issues = issues;
  results.overall = issues.length === 0 ? 'healthy' : issues.length > 3 ? 'critical' : 'warning';
  
  return results;
}

/**
 * 健康检查
 */
function checkHealth(): any {
  const issues: string[] = [];
  const mem = process.memoryUsage();
  
  // 内存使用检查
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  if (heapUsedMB > 500) {
    issues.push(`内存使用过高: ${heapUsedMB}MB`);
  }
  
  // 检查是否有异常进程
  const uptime = process.uptime();
  if (uptime < 60) {
    issues.push(`运行时间较短: ${Math.round(uptime)}秒`);
  }
  
  return {
    status: issues.length === 0 ? 'ok' : 'warning',
    uptime: Math.round(uptime),
    issues
  };
}

/**
 * 技能检查
 */
function checkSkills(): any {
  const issues: string[] = [];
  let skills: any[] = [];
  
  try {
    skills = getSkillList();
  } catch (e: any) {
    issues.push(`技能加载失败: ${e.message}`);
  }
  
  // 检查必需技能
  const required = ['api.projects.list', 'email.list', 'code.solve', 'self.awareness'];
  const missing = required.filter(r => !skills.find((s: any) => s.name === r));
  
  if (missing.length > 0) {
    issues.push(`缺少必需技能: ${missing.join(', ')}`);
  }
  
  return {
    status: issues.length === 0 ? 'ok' : 'warning',
    total: skills.length,
    issues
  };
}

/**
 * 会话检查
 */
function checkSessions(): any {
  const issues: string[] = [];
  
  try {
    const sessions = SessionManager.listSessions();
    const activeCount = sessions.filter((s: any) => s.messages?.length > 0).length;
    
    if (activeCount > 100) {
      issues.push(`会话过多: ${activeCount}`);
    }
    
    return {
      status: 'ok',
      total: sessions.length,
      active: activeCount,
      issues
    };
  } catch (e: any) {
    return {
      status: 'error',
      total: 0,
      issues: [`会话管理异常: ${e.message}`]
    };
  }
}

/**
 * 内存检查
 */
function checkMemory(): any {
  const issues: string[] = [];
  const mem = process.memoryUsage();
  
  const heapUsed = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotal = Math.round(mem.heapTotal / 1024 / 1024);
  const usagePercent = Math.round((heapUsed / heapTotal) * 100);
  
  if (usagePercent > 80) {
    issues.push(`堆内存使用率过高: ${usagePercent}%`);
  }
  
  const rss = Math.round(mem.rss / 1024 / 1024);
  
  return {
    status: issues.length === 0 ? 'ok' : 'warning',
    rss: `${rss}MB`,
    heap: `${heapUsed}MB / ${heapTotal}MB (${usagePercent}%)`,
    issues
  };
}

/**
 * 依赖检查
 */
function checkDependencies(): any {
  const issues: string[] = [];
  
  // 检查必需模块
  try {
    require('express');
    require('cors');
  } catch (e: any) {
    issues.push(`模块缺失: ${e.message}`);
  }
  
  return {
    status: issues.length === 0 ? 'ok' : 'error',
    nodeVersion: process.version,
    platform: process.platform,
    issues
  };
}

/**
 * 生成诊断报告
 */
export function generateDiagnosisReport(): string {
  const diag = runSelfDiagnosis();
  
  let report = `# LivingCode 自我诊断报告\n\n`;
  report += `时间: ${diag.timestamp}\n`;
  report += `总体状态: ${diag.overall === 'healthy' ? '✅ 健康' : diag.overall === 'warning' ? '⚠️ 警告' : '❌ 严重'}\n\n`;
  
  for (const [check, result] of Object.entries(diag.checks)) {
    const r = result as any;
    const icon = r.status === 'ok' ? '✅' : r.status === 'warning' ? '⚠️' : '❌';
    report += `## ${icon} ${check}\n`;
    report += `状态: ${r.status}\n`;
    
    for (const [key, value] of Object.entries(r)) {
      if (key !== 'status' && key !== 'issues') {
        report += `${key}: ${value}\n`;
      }
    }
    
    if (r.issues && r.issues.length > 0) {
      report += `问题:\n`;
      for (const issue of r.issues) {
        report += `- ${issue}\n`;
      }
    }
    report += '\n';
  }
  
  return report;
}
