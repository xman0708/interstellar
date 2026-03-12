import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { agentChat, SessionManager } from './agent/index.js';
import { sseEmitter, sendStep } from './sse-emitter.js';
import { HeartbeatManager, setupHeartbeatTasks } from './agent/heartbeat.js';
import { getSkillList, executeSkill } from './agent/skills/registry.js';
import { loadProfile, saveProfile, getUserStats, recordSkillUsage } from './agent/services/profile.js';
import { getAll, get, create, update, remove, search } from './agent/services/knowledge.js';
import { getDashboard } from './agent/services/dashboard.js';
import { getEmotion, changeEmotion, getGreeting, onInteraction } from './agent/services/emotion.js';
import { getStats as getLearningStats, getFrequentSkills } from './agent/services/learning.js';
import { getSmartLevel, getOptimizationSuggestions, getEvolutionReport } from './agent/services/evolution.js';
import { getAll as getReminders, add as addReminder, remove as removeReminder, complete as completeReminder, getPending } from './agent/services/reminders.js';
import { getAll as getPlugins, getEnabled, enable as enablePlugin, disable as disablePlugin, initBuiltIn } from './agent/services/plugins.js';
import { getAll as getWorkflows, get as getWorkflow, create as createWorkflow, execute as executeWorkflow, remove as removeWorkflow } from './agent/services/workflow.js';
import { getLevel, getStats as getBrainStats, learn as learnBrain, findAnswer } from './agent/services/brain.js';
import { getAll as getAbilities, getStats as getAbilityStats, learn as learnAbility } from './agent/services/abilities.js';
import { runSelfDiagnosis, generateDiagnosisReport } from './agent/services/selfDiagnosis.js';
import { ProactiveManagerInstance } from './agent/services/proactive.js';

// 初始化插件
initBuiltIn();

// 启动主动行为服务
ProactiveManagerInstance.start();

// 创建 Heartbeat 实例
const Heartbeat = new HeartbeatManager();
setupHeartbeatTasks(Heartbeat);

const app = express();
app.use(cors());
app.use(express.json());

// 启动心跳
Heartbeat.start(60000);

// ============ 模拟数据 ============
const mockData = {
  users: [
    { id: 'U001', name: '张三', dept: '技术部', role: '工程师' },
    { id: 'U002', name: '李四', dept: '产品部', role: '产品经理' },
    { id: 'U003', name: '王五', dept: '技术部', role: '工程师' },
    { id: 'U004', name: '赵六', dept: '设计部', role: '设计师' },
  ],
  projects: [
    { id: 'P001', name: '用户画像系统', status: '进行中', owner: '张三', progress: 75 },
    { id: 'P002', name: '数据中台建设', status: '进行中', owner: '李四', progress: 60 },
    { id: 'P003', name: '智能推荐引擎', status: '进行中', owner: '王五', progress: 45 },
    { id: 'P004', name: '报表平台升级', status: '已完成', owner: '赵六', progress: 100 },
  ],
  tasks: [
    { id: 'T001', title: '完成用户画像前端', projectId: 'P001', assignee: '张三', status: '进行中', priority: '高' },
    { id: 'T002', title: '数据模型设计', projectId: 'P002', assignee: '李四', status: '已完成', priority: '中' },
  ],
  workHours: [
    { userId: 'U001', name: '张三', week: 12, hours: 42 },
    { userId: 'U002', name: '李四', week: 12, hours: 38 },
    { userId: 'U003', name: '王五', week: 12, hours: 35 },
    { userId: 'U004', name: '赵六', week: 12, hours: 40 },
  ],
  emails: [
    { id: 'E001', from: 'zhangsan@company.com', fromName: '张三', subject: '项目进度汇报', preview: '本周项目进度已完成75%...', time: '2026-03-05 10:30', read: false, important: true },
    { id: 'E002', from: 'wangwu@company.com', fromName: '王五', subject: '代码审查邀请', preview: '请帮忙审查 PR #123...', time: '2026-03-05 09:15', read: false, important: false },
    { id: 'E003', from: 'system@company.com', fromName: '系统', subject: '周报提醒', preview: '请在本周五前提交周报...', time: '2026-03-05 08:00', read: true, important: true },
  ],
  calendarEvents: [
    { id: 'C001', title: '项目周会', start: '2026-03-05 14:00', end: '2026-03-05 15:00', attendees: ['张三', '李四', '王五'], location: '会议室A' },
    { id: 'C002', title: '代码审查', start: '2026-03-05 16:00', end: '2026-03-05 17:00', attendees: ['李四', '赵六'], location: '线上' },
    { id: 'C003', title: 'Sprint计划会', start: '2026-03-06 10:00', end: '2026-03-06 11:30', attendees: ['全体'], location: '会议室B' },
  ]
};

// ============ SSE 连接管理 ============

// 客户端 SSE 连接映射
const sseClients = new Map<string, string>(); // clientId -> sessionId

// 获取或创建客户端 ID
function getClientId(req: any): string {
  return req.query.clientId || uuidv4();
}

// SSE 连接端点
app.get('/api/agent/stream/connect', (req, res) => {
  const clientId = getClientId(req);
  const sessionId = req.query.sessionId as string || 'default';
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  
  // 注册 SSE 客户端
  sseEmitter.register(clientId, (data) => {
    res.write(data);
  });
  
  sseClients.set(clientId, sessionId);
  console.log(`[SSE] Client connected: ${clientId}, session: ${sessionId}`);
  
  // 发送连接成功消息
  res.write(`data: ${JSON.stringify({ event: 'connected', data: { clientId, sessionId } })}\n\n`);
  
  // 心跳保持连接
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);
  
  req.on('close', () => {
    clearInterval(heartbeat);
    sseEmitter.unregister(clientId);
    sseClients.delete(clientId);
    console.log(`[SSE] Client disconnected: ${clientId}`);
  });
});

// ============ Ping API ============

app.get('/ping', (req, res) => {
    res.json({ message: 'pong' });
});

// ============ Agent API ============

app.post('/api/agent/chat', async (req, res) => {
    try {
        const { message, sessionId, context, clientId } = req.body;
        if (!message) return res.status(400).json({ error: 'message is required' });
        
        const sid = clientId || sessionId || 'default';
        
        // 发送用户消息步骤
        sendStep(sid, 'thinking', '收到用户消息', message.slice(0, 50));
        
        // 发送分析步骤
        sendStep(sid, 'thinking', '分析用户意图', '识别任务类型和所需技能');
        
        const result = await agentChat({ message, sessionId, context });
        
        // 发送技能调用步骤
        if (result.skillUsed) {
          sendStep(sid, 'action', '执行技能', `调用 ${result.skillUsed}`);
        }
        
        // 发送结果步骤
        sendStep(sid, 'result', '生成响应', result.ui.type || 'text');
        
        console.log('[Server] Result ui:', JSON.stringify(result.ui));
        
        // 检查是否有新通知
        const notifications = Heartbeat.getNotifications();
        if (notifications.length > 0) {
          result.notifications = notifications;
        }
        
        // 发送完成步骤
        sendStep(sid, 'complete', '完成', `用时 ${result.turns || 0} 轮对话`);
        
        res.json(result);
    } catch (error: any) {
        console.error('Agent error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/agent/chat/stream', async (req, res) => {
    try {
        const { message, sessionId, context } = req.body;
        if (!message) return res.status(400).json({ error: 'message is required' });
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        
        const result = await agentChat({ message, sessionId, context });
        res.write(`data: ${JSON.stringify(result)}\n\n`);
        res.end();
    } catch (error: any) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

app.get('/api/agent/sessions', (req, res) => {
    const sessions = SessionManager.listSessions();
    res.json(sessions.map(s => ({ id: s.id, createdAt: s.createdAt, messageCount: s.messages.length })));
});

app.get('/api/agent/sessions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const sessions = SessionManager.listSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ id: session.id, createdAt: session.createdAt, messages: session.messages });
});

app.delete('/api/agent/sessions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const deleted = SessionManager.deleteSession(sessionId);
    res.json({ success: deleted });
});

app.get('/api/agent/heartbeat', (req, res) => {
    res.json(Heartbeat.getStatus());
});

app.post('/api/agent/heartbeat/reload', (req, res) => {
    Heartbeat.reloadConfig();
    res.json({ success: true });
});

app.get('/api/agent/notifications', (req, res) => {
    res.json(Heartbeat.getNotifications());
});

app.delete('/api/agent/notifications', (req, res) => {
    Heartbeat.clearNotifications();
    res.json({ success: true });
});

// ============ 自我感知 API ============

app.get('/api/agent/self', (req, res) => {
    // 获取完整的自我感知数据
    const skills = getSkillList();
    res.json({
        identity: {
            name: 'LivingCode',
            version: '0.5',
            type: '活性体 AI 助手',
            description: '一个能思考、学习、编程的生命体'
        },
        capabilities: {
            skills: skills.length,
            skillList: skills.map((s: any) => ({ name: s.name, desc: s.description }))
        },
        status: {
            uptime: process.uptime(),
            memory: {
                rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
            }
        }
    });
});

app.get('/api/agent/self/describe', (req, res) => {
    // 获取自我描述
    const skills = getSkillList();
    let desc = `# LivingCode - 自我认知\n\n`;
    desc += `## 我是谁\n`;
    desc += `- 名字: LivingCode\n`;
    desc += `- 版本: 0.5\n`;
    desc += `- 类型: 活性体 AI 助手\n`;
    desc += `- 描述: 一个能思考、学习、编程的生命体\n\n`;
    desc += `## 我的能力 (${skills.length}个技能)\n\n`;
    for (const skill of skills) {
        desc += `- ${skill.name}: ${skill.description}\n`;
    }
    res.type('text/plain').send(desc);
});

// ============ 自我诊断 API ============

app.get('/api/agent/diagnose', (req, res) => {
    // 执行自我诊断
    const result = runSelfDiagnosis();
    res.json(result);
});

app.get('/api/agent/diagnose/report', (req, res) => {
    // 生成诊断报告
    const report = generateDiagnosisReport();
    res.type('text/plain').send(report);
});

// ============ 主动行为 API ============

app.get('/api/agent/proactive/status', (req, res) => {
    // 获取主动行为状态
    res.json(ProactiveManagerInstance.getStatus());
});

app.get('/api/agent/proactive/notifications', (req, res) => {
    // 获取主动通知
    res.json(ProactiveManagerInstance.getNotifications());
});

app.delete('/api/agent/proactive/notifications', (req, res) => {
    // 清除通知
    ProactiveManagerInstance.clearNotifications();
    res.json({ success: true });
});

// ============ 智能进化 API ============

app.get('/api/agent/evolution', (req, res) => {
    // 获取智能进化状态
    const level = getSmartLevel();
    const suggestions = getOptimizationSuggestions();
    res.json({
        ...level,
        suggestions,
        report: getEvolutionReport()
    });
});

// ============ 业务 API ============

app.get('/api/users', (req, res) => res.json(mockData.users));
app.get('/api/users/:id', (req, res) => {
    const user = mockData.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

// ============ Skills API ============

app.get('/api/skills', (req, res) => {
    res.json(getSkillList());
});

app.post('/api/skills/execute', async (req, res) => {
    const { skillName, params } = req.body;
    if (!skillName) {
        return res.status(400).json({ error: 'skillName is required' });
    }
    const result = await executeSkill(skillName, params || {});
    res.json(result);
});

app.get('/api/projects', (req, res) => {
    const { status } = req.query;
    let projects = mockData.projects;
    if (status) projects = projects.filter(p => p.status === status);
    res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
    const project = mockData.projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
});

app.get('/api/tasks', (req, res) => {
    const { projectId, assignee } = req.query;
    let tasks = mockData.tasks;
    if (projectId) tasks = tasks.filter(t => t.projectId === projectId);
    if (assignee) tasks = tasks.filter(t => t.assignee === assignee);
    res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
    const { title, projectId, assignee, priority = '中' } = req.body;
    const newTask = { id: 'T' + Date.now(), title, projectId, assignee, status: '待开始', priority };
    mockData.tasks.push(newTask);
    res.json({ success: true, task: newTask });
});

app.get('/api/stats/work-hours', (req, res) => {
    res.json({ period: '2024年第12周', data: mockData.workHours });
});

app.get('/api/stats/project-progress', (req, res) => {
    const total = mockData.projects.length;
    const completed = mockData.projects.filter(p => p.status === '已完成').length;
    res.json({ total, completed, inProgress: total - completed, completionRate: Math.round(completed / total * 100) });
});

app.get('/api/stats/team-load', (req, res) => {
    const deptLoad: Record<string, number> = {};
    mockData.users.forEach(user => {
        const hours = mockData.workHours.find(w => w.name === user.name)?.hours || 0;
        if (!deptLoad[user.dept]) deptLoad[user.dept] = 0;
        deptLoad[user.dept] += hours;
    });
    res.json(deptLoad);
});

// ============ 外部服务 API ============

// 邮件
app.get('/api/emails', (req, res) => {
    const { unread } = req.query;
    let emails = mockData.emails || [];
    if (unread === 'true') emails = emails.filter(e => !e.read);
    res.json(emails);
});

app.get('/api/emails/:id', (req, res) => {
    const email = (mockData.emails || []).find(e => e.id === req.params.id);
    if (!email) return res.status(404).json({ error: 'Email not found' });
    res.json(email);
});

app.patch('/api/emails/:id/read', (req, res) => {
    const email = (mockData.emails || []).find(e => e.id === req.params.id);
    if (!email) return res.status(404).json({ error: 'Email not found' });
    email.read = true;
    res.json({ success: true });
});

// 日历
app.get('/api/calendar/events', (req, res) => {
    res.json(mockData.calendarEvents || []);
});

app.get('/api/calendar/events/today', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    res.json((mockData.calendarEvents || []).filter(e => e.start.startsWith(today)));
});

app.get('/api/calendar/events/upcoming', (req, res) => {
    const now = new Date();
    const hours = parseInt(req.query.hours as string) || 2;
    const future = new Date(now.getTime() + hours * 60 * 60 * 1000);
    
    res.json((mockData.calendarEvents || []).filter(e => {
        const eventStart = new Date(e.start);
        return eventStart >= now && eventStart <= future;
    }));
});

// ============ 用户画像 API ============

app.get('/api/user/profile', (req, res) => {
    res.json(loadProfile());
});

app.put('/api/user/profile', (req, res) => {
    const updates = req.body;
    const profile = saveProfile(updates);
    res.json(profile);
});

app.get('/api/user/stats', (req, res) => {
    res.json(getUserStats());
});

// ============ 知识库 API ============

app.get('/api/knowledge', (req, res) => {
    const { q } = req.query;
    if (q) {
        res.json(search(q as string));
    } else {
        res.json(getAll());
    }
});

app.get('/api/knowledge/:id', (req, res) => {
    const item = get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
});

app.post('/api/knowledge', (req, res) => {
    const { title, content, tags } = req.body;
    const item = create({ title, content, tags: tags || [] });
    res.json(item);
});

app.put('/api/knowledge/:id', (req, res) => {
    const item = update(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
});

app.delete('/api/knowledge/:id', (req, res) => {
    const deleted = remove(req.params.id);
    res.json({ success: deleted });
});

// ============ Dashboard API ============

app.get('/api/dashboard', (req, res) => {
    res.json(getDashboard());
});

// 原有模拟接口
app.post('/api/generate-ui', async (req, res) => {
    const { prompt } = req.body;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    let mockResponse: any = {};
    if (prompt.includes('工时')) mockResponse = { uiType: "AutoChart", title: "本周工时统计" };
    else if (prompt.includes('任务')) mockResponse = { uiType: "ActionCommand", commandPayload: { actionId: "OPEN_TASK_MODAL" } };
    else mockResponse = { uiType: "SmartTable", tableColumns: ["名称"], tableRows: [{ "名称": "测试" }] };
    res.write(`0:${JSON.stringify(mockResponse)}\n`);
    res.end();
});

// ============ 情绪系统 API ============

app.get('/api/emotion', (req, res) => {
    res.json(getEmotion());
});

app.post('/api/emotion', (req, res) => {
    const { type } = req.body;
    res.json(onInteraction(type || 'neutral'));
});

app.get('/api/emotion/greeting', (req, res) => {
    res.json({ greeting: getGreeting() });
});

// ============ 学习系统 API ============

app.get('/api/learning/stats', (req, res) => {
    res.json(getLearningStats());
});

app.get('/api/learning/frequent', (req, res) => {
    res.json(getFrequentSkills());
});

// ============ 提醒系统 API ============

app.get('/api/reminders', (req, res) => {
    const { pending } = req.query;
    if (pending === 'true') {
        res.json(getPending());
    } else {
        res.json(getReminders());
    }
});

app.post('/api/reminders', (req, res) => {
    const { title, time, repeat } = req.body;
    const reminder = addReminder({ title, time, repeat });
    res.json(reminder);
});

app.delete('/api/reminders/:id', (req, res) => {
    const deleted = removeReminder(req.params.id);
    res.json({ success: deleted });
});

app.patch('/api/reminders/:id/complete', (req, res) => {
    const done = completeReminder(req.params.id);
    res.json({ success: done });
});

// ============ 插件系统 API ============

app.get('/api/plugins', (req, res) => {
    const { enabled } = req.query;
    if (enabled === 'true') {
        res.json(getEnabled());
    } else {
        res.json(getPlugins());
    }
});

app.post('/api/plugins/:id/enable', (req, res) => {
    const success = enablePlugin(req.params.id);
    res.json({ success });
});

app.post('/api/plugins/:id/disable', (req, res) => {
    const success = disablePlugin(req.params.id);
    res.json({ success });
});

// ============ 工作流系统 API ============

app.get('/api/workflows', (req, res) => {
    res.json(getWorkflows());
});

app.get('/api/workflows/:id', (req, res) => {
    const workflow = getWorkflow(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Not found' });
    res.json(workflow);
});

app.post('/api/workflows', (req, res) => {
    const { name, description, steps } = req.body;
    const workflow = createWorkflow({ name, description, steps });
    res.json(workflow);
});

app.post('/api/workflows/:id/execute', async (req, res) => {
    const { context } = req.body;
    const result = await executeWorkflow(req.params.id, context || {});
    res.json(result);
});

app.delete('/api/workflows/:id', (req, res) => {
    const success = removeWorkflow(req.params.id);
    res.json({ success });
});

// ============ 进化系统 API ============

app.get('/api/brain/level', (req, res) => {
    res.json(getLevel());
});

app.get('/api/brain/stats', (req, res) => {
    res.json(getBrainStats());
});

app.get('/api/abilities', (req, res) => {
    res.json(getAbilities());
});

app.get('/api/abilities/stats', (req, res) => {
    res.json(getAbilityStats());
});

app.post('/api/abilities/learn', (req, res) => {
    const { pattern, name, handler, example } = req.body;
    const ability = learnAbility(pattern, name, handler, example);
    res.json(ability);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🤖 LivingCode running on http://localhost:${PORT}`);
    console.log(`📡 Agent: POST /api/agent/chat`);
    console.log(`💓 Heartbeat: Running (5 tasks)`);
    console.log(`📧 Email API: GET /api/emails`);
    console.log(`📅 Calendar API: GET /api/calendar/events`);
});
