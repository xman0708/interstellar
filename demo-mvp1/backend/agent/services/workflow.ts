/**
 * Workflow System - 工作流自动化
 * 
 * 定义和执行自动化流程
 */

import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_PATH = path.join(__dirname, '../../../workspace');
const WORKFLOWS_DIR = path.join(WORKSPACE_PATH, 'workflows');

interface WorkflowStep {
  id: string;
  name: string;
  skill: string;
  params: Record<string, any>;
  onSuccess?: string;  // 下一步step id
  onError?: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  enabled: boolean;
  trigger?: string;  // 触发条件
}

// 确保目录存在
if (!fs.existsSync(WORKFLOWS_DIR)) {
  fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
}

/**
 * 获取所有工作流
 */
export function getAll(): Workflow[] {
  if (!fs.existsSync(WORKFLOWS_DIR)) return [];
  
  const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json'));
  const workflows: Workflow[] = [];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf-8');
      workflows.push(JSON.parse(content));
    } catch {}
  }
  
  return workflows;
}

/**
 * 获取工作流
 */
export function get(id: string): Workflow | null {
  const file = path.join(WORKFLOWS_DIR, `${id}.json`);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }
  return null;
}

/**
 * 保存工作流
 */
export function save(workflow: Workflow): void {
  fs.writeFileSync(
    path.join(WORKFLOWS_DIR, `${workflow.id}.json`),
    JSON.stringify(workflow, null, 2)
  );
}

/**
 * 创建工作流
 */
export function create(data: { name: string; description: string; steps: any[] }): Workflow {
  const workflow: Workflow = {
    id: `wf_${Date.now()}`,
    name: data.name,
    description: data.description,
    steps: data.steps.map((s, i) => ({
      id: `step_${i}`,
      ...s,
    })),
    enabled: true,
  };
  
  save(workflow);
  return workflow;
}

/**
 * 执行工作流
 */
export async function execute(workflowId: string, context: Record<string, any> = {}): Promise<any> {
  const workflow = get(workflowId);
  if (!workflow) {
    return { success: false, error: 'Workflow not found' };
  }
  
  const results: any[] = [];
  let currentContext = { ...context };
  
  for (const step of workflow.steps) {
    console.log(`[Workflow] Executing step: ${step.name}`);
    
    try {
      // 动态执行 skill
      const { executeSkill } = await import('./skills/registry.js');
      const result = await executeSkill(step.skill, {
        ...step.params,
        ...currentContext,
      });
      
      results.push({ step: step.name, result });
      
      // 更新上下文
      if (result.success && result.data) {
        currentContext = { ...currentContext, ...result.data };
      }
      
      // 检查是否继续
      if (!result.success && step.onError) {
        const errorStep = workflow.steps.find(s => s.id === step.onError);
        if (errorStep) {
          console.log(`[Workflow] Jumping to error handler: ${errorStep.name}`);
        }
      } else if (result.success && step.onSuccess) {
        const nextStep = workflow.steps.find(s => s.id === step.onSuccess);
        if (!nextStep) break;
      }
      
    } catch (error: any) {
      results.push({ step: step.name, error: error.message });
      if (step.onError) break;
    }
  }
  
  return { success: true, results, context: currentContext };
}

/**
 * 删除工作流
 */
export function remove(id: string): boolean {
  const file = path.join(WORKFLOWS_DIR, `${id}.json`);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    return true;
  }
  return false;
}

// 预置工作流
export const sampleWorkflows = [
  {
    name: '每日汇报生成',
    description: '自动汇总项目进度、工时、任务状态',
    steps: [
      { name: '获取项目', skill: 'api.projects.list', params: {} },
      { name: '获取工时', skill: 'api.stats.work-hours', params: {} },
      { name: '获取任务', skill: 'api.tasks.list', params: {} },
    ]
  },
  {
    name: '代码审查流程',
    description: '自动检查代码质量',
    steps: [
      { name: '获取PR', skill: 'code.parse', params: {} },
      { name: '分析代码', skill: 'code.qa', params: { question: '这段代码有什么问题？' } },
    ]
  }
];

// 初始化示例工作流
export function initSamples(): void {
  if (getAll().length > 0) return;
  
  for (const wf of sampleWorkflows) {
    create(wf);
  }
}

initSamples();
