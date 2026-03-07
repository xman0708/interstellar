/**
 * LivingCode 自我进化系统
 * 
 * 左右互搏：自己诊断问题，自己优化自己
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const WORKSPACE_PATH = path.join(__dirname, '../../../workspace');
const LOG_PATH = path.join(WORKSPACE_PATH, 'logs');
const MEMORY_PATH = path.join(WORKSPACE_PATH, 'memory');

interface DiagnosisResult {
  issues: Issue[];
  score: number; // 0-100
}

interface Issue {
  type: 'error' | 'performance' | 'ux' | 'logic';
  severity: 'high' | 'medium' | 'low';
  description: string;
  file?: string;
  suggestion?: string;
}

interface EvolutionPlan {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

/**
 * 1. 自我诊断 - 分析最近的问题 + 设计文档
 */
async function selfDiagnose(): Promise<DiagnosisResult> {
  const issues: Issue[] = [];
  let score = 100;
  
  // 读取设计文档发现问题
  const docsPath = path.join(__dirname, '../../../../docs');
  if (fs.existsSync(docsPath)) {
    const files = fs.readdirSync(docsPath);
    const designFiles = files.filter(f => f.startsWith('BUILD_') && f.endsWith('.md'));
    
    for (const file of designFiles) {
      const content = fs.readFileSync(path.join(docsPath, file), 'utf-8');
      
      // 检查 ⚠️ 标记的问题
      const warningMatches = content.match(/⚠️\s+([^\n]+)/g);
      if (warningMatches) {
        for (const match of warningMatches) {
          const desc = match.replace('⚠️', '').trim();
          issues.push({
            type: 'design',
            severity: 'high',
            description: `设计问题: ${desc}`,
            suggestion: '根据设计文档优化'
          });
          score -= 15;
        }
      }
    }
  }
  
  // 读取最近日志
  const logFile = path.join(LOG_PATH, 'server.log');
  if (fs.existsSync(logFile)) {
    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.split('\n');
    const recentLines = lines.slice(-500); // 最近500行
    
    // 检查错误
    const errorLines = recentLines.filter(l => 
      l.includes('Error') || l.includes('error') || l.includes('Exception')
    );
    
    if (errorLines.length > 50) {
      issues.push({
        type: 'error',
        severity: 'high',
        description: `最近有 ${errorLines.length} 条错误日志`,
        suggestion: '需要排查错误根源'
      });
      score -= 20;
    } else if (errorLines.length > 10) {
      issues.push({
        type: 'error',
        severity: 'medium',
        description: `最近有 ${errorLines.length} 条错误日志`,
        suggestion: '需要关注'
      });
      score -= 10;
    }
    
    // 检查内存问题
    const memoryLines = recentLines.filter(l => l.includes('内存使用率过高'));
    if (memoryLines.length > 5) {
      issues.push({
        type: 'performance',
        severity: 'high',
        description: '内存使用率多次过高',
        suggestion: '需要优化内存管理'
      });
      score -= 15;
    }
  }
  
  // 检查代码复杂度
  const backendPath = path.join(__dirname, '../../');
  const tsFiles = getTypeScriptFiles(backendPath);
  
  let totalLines = 0;
  let largeFiles: string[] = [];
  for (const file of tsFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n').length;
    totalLines += lines;
    if (lines > 500) {
      largeFiles.push(`${path.basename(file)} (${lines}行)`);
    }
  }
  
  if (tsFiles.length > 30) {
    issues.push({
      type: 'performance',
      severity: 'medium',
      description: `项目有 ${tsFiles.length} 个 TypeScript 文件，共 ${totalLines} 行代码`,
      suggestion: '考虑拆分过大的模块'
    });
  }
  
  if (largeFiles.length > 0) {
    issues.push({
      type: 'performance',
      severity: 'medium',
      description: `发现 ${largeFiles.length} 个较大文件: ${largeFiles.slice(0, 3).join(', ')}`,
      suggestion: '考虑拆分大文件'
    });
    score -= 10;
  }
  
  // 检查 TODO
  let todoCount = 0;
  for (const file of tsFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const todos = content.match(/\/\/\s*TODO|\/\*\s*TODO/gi);
    if (todos) todoCount += todos.length;
  }
  
  if (todoCount > 0) {
    issues.push({
      type: 'logic',
      severity: 'low',
      description: `发现 ${todoCount} 个 TODO 待办项`,
      suggestion: '清理 TODO 或完成待办事项'
    });
    score -= todoCount * 2;
  }
  
  // 检查缺失的功能
  const skillsPath = path.join(backendPath, 'agent/skills');
  const skillFiles = fs.readdirSync(skillsPath).filter(f => f.endsWith('Skill.ts'));
  
  const requiredSkills = ['email', 'weather', 'calendar', 'code'];
  for (const skill of requiredSkills) {
    const hasSkill = skillFiles.some(f => f.toLowerCase().includes(skill.toLowerCase()));
    if (!hasSkill) {
      issues.push({
        type: 'logic',
        severity: 'medium',
        description: `缺少 ${skill} 相关技能`,
        suggestion: `添加 ${skill} 技能`
      });
      score -= 5;
    }
  }
  
  return { issues, score: Math.max(0, score) };
}

/**
 * 获取所有 TypeScript 文件
 */
function getTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  
  function walk(d: string) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        walk(fullPath);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

/**
 * 2. 生成进化计划
 */
function generateEvolutionPlan(diagnosis: DiagnosisResult): EvolutionPlan[] {
  const plans: EvolutionPlan[] = [];
  
  for (const issue of diagnosis.issues) {
    // 所有问题都生成计划
    plans.push({
      id: `${issue.type}_${Date.now()}`,
      description: issue.description + (issue.suggestion ? ` - ${issue.suggestion}` : ''),
      priority: issue.severity,
      estimatedImpact: getImpactDescription(issue)
    });
  }
  
  // 按优先级排序
  plans.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  return plans;
}

function getImpactDescription(issue: Issue): string {
  switch (issue.type) {
    case 'error': return '提高系统稳定性';
    case 'performance': return '提升系统性能';
    case 'ux': return '改善用户体验';
    case 'logic': return '增强功能完整性';
    default: return '优化代码质量';
  }
}

/**
 * 3. 执行进化
 */
async function executeEvolution(plan: EvolutionPlan): Promise<{ success: boolean; message: string; committed?: boolean }> {
  console.log(`[Evolution] Executing: ${plan.description}`);
  
  // 如果是代码修改类型的计划
  if (plan.description.includes('修复') || plan.description.includes('优化') || plan.description.includes('添加') || plan.description.includes('拆分')) {
    try {
      const backendPath = path.join(__dirname, '../../');
      
      // 检查是否有代码变化
      const { stdout: status } = await execAsync('git status --porcelain', { cwd: backendPath });
      
      if (status.trim()) {
        // 有变化，提交
        await execAsync('git add .', { cwd: backendPath });
        await execAsync(`git commit -m "evolution: ${plan.description.slice(0, 50)}"`, { cwd: backendPath });
        
        // 尝试推送
        try {
          await execAsync('git push origin main', { cwd: backendPath, timeout: 30000 });
          console.log('[Evolution] 代码已提交并推送');
        } catch {
          console.log('[Evolution] 推送失败，仅本地提交');
        }
        
        return { success: true, message: `已自动提交: ${plan.description}`, committed: true };
      } else {
        return { success: true, message: `已记录计划: ${plan.description}`, committed: false };
      }
    } catch (error: any) {
      console.log('[Evolution] Git 操作失败:', error.message);
      return { success: true, message: `已记录: ${plan.description}` };
    }
  }
  
  return { success: false, message: '不需要修改代码' };
}

/**
 * 4. 记录学习
 */
function recordLearning(diagnosis: DiagnosisResult, plans: EvolutionPlan[], results: any[]) {
  const date = new Date().toISOString().split('T')[0];
  const memoryFile = path.join(MEMORY_PATH, `evolution-${date}.md`);
  
  let content = `# 自我进化记录 - ${date}\n\n`;
  content += `## 健康评分\n\n${diagnosis.score}/100\n\n`;
  content += `## 发现的问题\n\n`;
  for (const issue of diagnosis.issues) {
    content += `- [${issue.severity}] ${issue.description}\n`;
  }
  content += `\n## 进化计划\n\n`;
  for (const plan of plans) {
    content += `- [${plan.priority}] ${plan.description}\n`;
  }
  content += `\n## 执行结果\n\n`;
  for (const result of results) {
    content += `- ${result.message}\n`;
  }
  
  fs.writeFileSync(memoryFile, content);
  console.log(`[Evolution] Learning recorded: ${memoryFile}`);
}

/**
 * 主循环 - 自我进化
 */
export async function runSelfEvolution(): Promise<void> {
  console.log('\n========== LivingCode 自我进化 ==========');
  
  // 1. 诊断
  console.log('[1/4] 自我诊断中...');
  const diagnosis = await selfDiagnose();
  console.log(`健康评分: ${diagnosis.score}/100`);
  console.log(`发现问题: ${diagnosis.issues.length}个`);
  
  if (diagnosis.issues.length === 0) {
    console.log('一切正常，无需进化');
    return;
  }
  
  // 2. 制定计划
  console.log('\n[2/4] 制定进化计划...');
  const plans = generateEvolutionPlan(diagnosis);
  console.log(`计划: ${plans.length}项`);
  
  // 3. 执行
  console.log('\n[3/4] 执行进化...');
  const results = [];
  for (const plan of plans.slice(0, 3)) { // 每次最多执行3个
    const result = await executeEvolution(plan);
    results.push(result);
  }
  
  // 4. 记录学习
  console.log('\n[4/4] 记录学习...');
  recordLearning(diagnosis, plans, results);
  
  console.log('\n========== 自我进化完成 ==========\n');
}

// CLI 入口
if (require.main === module) {
  runSelfEvolution().then(() => process.exit(0));
}
