<template>
  <div class="dashboard">
    <!-- 头部 -->
    <header class="dashboard-header">
      <div class="header-content">
        <h1>📊 Dashboard</h1>
        <p>系统概览与快速操作</p>
      </div>
      <div class="header-time">
        {{ currentTime }}
      </div>
    </header>

    <!-- 统计卡片 -->
    <section class="stats-section">
      <div class="section-header">
        <h2>系统概览</h2>
        <span class="update-time">每 30 秒更新</span>
      </div>
      <div class="stats-grid">
        <div class="stat-card sessions">
          <div class="stat-icon">💬</div>
          <div class="stat-content">
            <span class="stat-value">{{ dashboard?.sessions?.total || 0 }}</span>
            <span class="stat-label">活跃会话</span>
          </div>
          <div class="stat-bg">💬</div>
        </div>
        <div class="stat-card commands">
          <div class="stat-icon">👤</div>
          <div class="stat-content">
            <span class="stat-value">{{ dashboard?.user?.totalCommands || 0 }}</span>
            <span class="stat-label">总命令数</span>
          </div>
          <div class="stat-bg">👤</div>
        </div>
        <div class="stat-card emails">
          <div class="stat-icon">📧</div>
          <div class="stat-content">
            <span class="stat-value">{{ dashboard?.today?.unreadEmails || 0 }}</span>
            <span class="stat-label">未读邮件</span>
          </div>
          <div class="stat-bg">📧</div>
        </div>
        <div class="stat-card knowledge">
          <div class="stat-icon">📚</div>
          <div class="stat-content">
            <span class="stat-value">{{ dashboard?.today?.knowledgeItems || 0 }}</span>
            <span class="stat-label">知识库条目</span>
          </div>
          <div class="stat-bg">📚</div>
        </div>
      </div>
    </section>

    <!-- 快捷操作 -->
    <section class="actions-section">
      <div class="section-header">
        <h2>⚡ 快捷操作</h2>
      </div>
      <div class="actions-grid">
        <button 
          v-for="action in dashboard?.quickActions" 
          :key="action.id"
          class="action-card"
          @click="handleAction(action.id)"
        >
          <span class="action-icon">{{ action.icon }}</span>
          <span class="action-label">{{ action.label }}</span>
          <span class="action-arrow">→</span>
        </button>
      </div>
    </section>

    <!-- Agent 对话 -->
    <section class="chat-section">
      <div class="section-header">
        <h2>💬 Agent 对话</h2>
      </div>
      <div class="chat-container">
        <div class="messages-area" ref="messagesAreaRef">
          <TransitionGroup name="msg" tag="div">
            <div 
              v-for="(msg, idx) in messages" 
              :key="idx"
              :class="['message', msg.role]"
            >
              <div class="message-avatar">
                {{ msg.role === 'user' ? '👤' : '🤖' }}
              </div>
              <div class="message-bubble">
                <span 
                  v-if="msg.isHtml" 
                  class="message-content md" 
                  v-html="marked.parse(msg.content)"
                ></span>
                <span v-else class="message-content">{{ msg.content }}</span>
              </div>
            </div>
          </TransitionGroup>
          <div v-if="messages.length === 0" class="empty-chat">
            <span class="empty-icon">💬</span>
            <p>开始与 Agent 对话</p>
          </div>
        </div>
        <div class="chat-input-area">
          <input 
            v-model="input" 
            @keyup.enter="sendMessage()"
            placeholder="输入消息..."
            :disabled="isSending"
          />
          <button 
            class="send-btn" 
            @click="sendMessage()"
            :disabled="isSending || !input.trim()"
          >
            <span v-if="!isSending">➤</span>
            <span v-else class="spinner"></span>
          </button>
        </div>
      </div>
    </section>

    <!-- Skills -->
    <section class="skills-section">
      <div class="section-header">
        <h2>🛠 可用 Skills</h2>
        <span class="skill-count">{{ skills.length }} 个</span>
      </div>
      <div class="skills-cloud">
        <span 
          v-for="skill in skills" 
          :key="skill.name" 
          class="skill-tag"
        >
          {{ skill.name }}
        </span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true
});

const dashboard = ref<any>(null);
const skills = ref<any[]>([]);
const messages = ref<any[]>([]);
const input = ref('');
const sessionId = ref<string | null>(null);
const isSending = ref(false);
const messagesAreaRef = ref<HTMLElement | null>(null);
const currentTime = ref('');
let timeInterval: any;
let refreshInterval: any;

// 从 localStorage 恢复 session
const restoreSession = async () => {
  const savedSessionId = localStorage.getItem('lc_session_id');
  if (savedSessionId) {
    try {
      const res = await fetch(`http://localhost:3000/api/agent/sessions/${savedSessionId}`);
      if (res.ok) {
        const session = await res.json();
        if (session && session.messages) {
          sessionId.value = savedSessionId;
          // 转换历史消息格式
          messages.value = session.messages.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content || m.response?.content || JSON.stringify(m.response || m),
            isHtml: m.response?.type === 'text' || m.response?.type === 'markdown'
          }));
          return;
        }
      }
    } catch (e) {
      console.error('Failed to restore session:', e);
    }
  }
  // 没有历史 session，创建新的
  sessionId.value = null;
  messages.value = [];
};

// 保存 session 到 localStorage
const saveSession = () => {
  if (sessionId.value) {
    localStorage.setItem('lc_session_id', sessionId.value);
  }
};

const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleString('zh-CN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const loadDashboard = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/dashboard');
    dashboard.value = await res.json();
  } catch (e) {
    console.error('Failed to load dashboard:', e);
  }
};

const loadSkills = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/skills');
    skills.value = await res.json();
  } catch (e) {
    console.error('Failed to load skills:', e);
  }
};

const sendMessage = async (msg?: string) => {
  const userMsg = msg || input.value;
  if (!userMsg.trim() || isSending.value) return;
  
  messages.value.push({ role: 'user', content: userMsg });
  if (!msg) input.value = '';
  isSending.value = true;
  
  await nextTick();
  scrollToBottom();
  
  try {
    const res = await fetch('http://localhost:3000/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: userMsg,
        sessionId: sessionId.value
      })
    });
    const data = await res.json();
    sessionId.value = data.sessionId;
    saveSession(); // 保存 session 到 localStorage
    
    // 智能显示响应内容
    let content = '';
    if (data.ui) {
      if (data.ui.type === 'text' || data.ui.type === 'markdown') {
        content = data.ui.content || '';
      } else if (data.ui.type === 'tool_call') {
        content = `🤖 正在调用: ${data.ui.tool}`;
      } else {
        content = JSON.stringify(data.ui, null, 2);
      }
    } else {
      content = JSON.stringify(data, null, 2);
    }
    
    messages.value.push({ 
      role: 'assistant', 
      content,
      isHtml: data.ui?.type === 'text' || data.ui?.type === 'markdown'
    });
  } catch (e) {
    messages.value.push({ role: 'assistant', content: '请求失败' });
  } finally {
    isSending.value = false;
    await nextTick();
    scrollToBottom();
  }
};

const scrollToBottom = () => {
  if (messagesAreaRef.value) {
    messagesAreaRef.value.scrollTop = messagesAreaRef.value.scrollHeight;
  }
};

const handleAction = (actionId: string) => {
  const prompts: Record<string, string> = {
    projects: '查看项目列表',
    tasks: '查看任务列表',
    emails: '查看邮件',
    calendar: '查看今日会议',
    knowledge: '查看知识库'
  };
  const msg = prompts[actionId] || '';
  sendMessage(msg);
};

onMounted(() => {
  updateTime();
  timeInterval = setInterval(updateTime, 60000);
  loadDashboard();
  loadSkills();
  restoreSession(); // 恢复历史会话
  refreshInterval = setInterval(loadDashboard, 30000);
});

onUnmounted(() => {
  clearInterval(timeInterval);
  clearInterval(refreshInterval);
});
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

/* 头部 */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.header-content p {
  font-size: 14px;
  color: #71717a;
}

.header-time {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  font-size: 13px;
  color: #a1a1aa;
}

/* 区块标题 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #e4e4e7;
}

.update-time, .skill-count {
  font-size: 12px;
  color: #52525b;
}

/* 统计卡片 */
.stats-section {
  margin-bottom: 40px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.1);
}

.stat-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border-radius: 14px;
  flex-shrink: 0;
}

.stat-card.sessions .stat-icon {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
}

.stat-card.commands .stat-icon {
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
}

.stat-card.emails .stat-icon {
  background: linear-gradient(135deg, #10b981, #34d399);
}

.stat-card.knowledge .stat-icon {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  font-size: 13px;
  color: #71717a;
}

.stat-bg {
  position: absolute;
  right: -10px;
  bottom: -10px;
  font-size: 80px;
  opacity: 0.05;
}

/* 快捷操作 */
.actions-section {
  margin-bottom: 40px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

@media (max-width: 900px) {
  .actions-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(99, 102, 241, 0.3);
  transform: translateY(-2px);
}

.action-icon {
  font-size: 28px;
}

.action-label {
  font-size: 13px;
  color: #d4d4d8;
}

.action-arrow {
  font-size: 16px;
  color: #52525b;
  transition: transform 0.2s ease;
}

.action-card:hover .action-arrow {
  transform: translateX(4px);
  color: #6366f1;
}

/* 对话区域 */
.chat-section {
  margin-bottom: 40px;
}

.chat-container {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  overflow: hidden;
}

.messages-area {
  height: 320px;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #52525b;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.message {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  font-size: 18px;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
}

.message.assistant .message-avatar {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.message.user .message-bubble {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-color: transparent;
}

.message-content {
  font-size: 14px;
  color: #e4e4e7;
  line-height: 1.5;
  word-break: break-word;
}

.message-content.md {
  color: #d4d4d8;
}

.message-content.md :deep(h1),
.message-content.md :deep(h2),
.message-content.md :deep(h3) {
  color: #fff;
  margin: 8px 0 4px;
}

.message-content.md :deep(p) {
  margin: 6px 0;
}

.message-content.md :deep(code) {
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}

.message-content.md :deep(ul),
.message-content.md :deep(ol) {
  margin: 4px 0;
  padding-left: 16px;
}

.message.user .message-content {
  color: white;
}

/* 对话输入 */
.chat-input-area {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
}

.chat-input-area input {
  flex: 1;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  color: #e4e4e7;
  outline: none;
  transition: all 0.2s ease;
}

.chat-input-area input:focus {
  border-color: rgba(99, 102, 241, 0.5);
  background: rgba(255, 255, 255, 0.05);
}

.chat-input-area input::placeholder {
  color: #52525b;
}

.send-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Skills */
.skills-section {
  margin-bottom: 40px;
}

.skills-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.skill-tag {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  font-size: 13px;
  color: #a1a1aa;
  transition: all 0.2s ease;
}

.skill-tag:hover {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.3);
  color: #e4e4e7;
}

/* 消息过渡 */
.msg-enter-active {
  transition: all 0.3s ease;
}

.msg-leave-active {
  transition: all 0.2s ease;
}

.msg-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.msg-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
