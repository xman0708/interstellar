<template>
  <div class="copilot-container">
    <!-- 头部 -->
    <header class="copilot-header">
      <div class="header-avatar">
        <span class="avatar-icon">🧠</span>
        <span class="avatar-glow"></span>
      </div>
      <div class="header-info">
        <h1>HuiFlow Copilot</h1>
        <p>您的智能助手</p>
      </div>
    </header>

    <!-- 对话区域 -->
    <div class="chat-area" ref="chatAreaRef">
      <TransitionGroup name="message" tag="div" class="messages-wrapper">
        <!-- 欢迎消息 -->
        <div v-if="!response && !isLoading && !sessionId" class="welcome-message">
          <div class="welcome-icon">✨</div>
          <h2>你好！我是你的智能助手</h2>
          <p>我可以帮你完成各种任务，比如：</p>
          <div class="feature-list">
            <div class="feature-item">
              <span class="feature-icon">📊</span>
              <span>分析项目进度和工时统计</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📧</span>
              <span>管理和查看邮件</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📅</span>
              <span>查看日历和安排会议</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📚</span>
              <span>搜索和管理知识库</span>
            </div>
          </div>
          <p class="hint">试试发送一条消息开始吧！</p>
        </div>

        <!-- 加载动画 -->
        <div v-if="isLoading" class="loading-message">
          <div class="loading-avatar">
            <span class="avatar-icon">🧠</span>
          </div>
          <div class="loading-content">
            <div class="loading-dots">
              <span></span><span></span><span></span>
            </div>
            <span class="loading-text">正在思考中...</span>
          </div>
        </div>

        <!-- AI 响应 -->
        <div v-if="response" class="ai-message">
          <div class="message-avatar ai">
            <span>🧠</span>
          </div>
          <div class="message-content">
            <div class="response-card">
              <!-- 图表类型 -->
              <div v-if="response.type === 'chart' && response.data" class="response-chart">
                <div class="response-header">
                  <span class="response-icon">📊</span>
                  <span class="response-title">{{ response.title || '数据图表' }}</span>
                </div>
                <div class="chart-container">
                  <div 
                    v-for="(item, idx) in response.data" 
                    :key="idx" 
                    class="chart-item"
                  >
                    <span class="chart-label">{{ item?.label }}</span>
                    <div class="chart-bar-wrapper">
                      <div 
                        class="chart-bar" 
                        :style="{ width: Math.min((item?.value || 0) * 3, 100) + '%' }"
                      ></div>
                    </div>
                    <span class="chart-value">{{ item?.value }}</span>
                  </div>
                </div>
              </div>

              <!-- 表格类型 -->
              <div v-else-if="response.type === 'table' && response.rows" class="response-table">
                <div class="response-header">
                  <span class="response-icon">📋</span>
                  <span class="response-title">{{ response.title || '数据表格' }}</span>
                </div>
                <div class="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th v-for="col in response.columns" :key="col.key">{{ col.label }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in response.rows" :key="idx">
                        <td v-for="col in response.columns" :key="col.key">{{ row[col.key] }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- 操作类型 -->
              <div v-else-if="response.type === 'action'" class="response-action">
                <div class="response-header">
                  <span class="response-icon">⚡</span>
                  <span class="response-title">{{ response.action || '操作' }}</span>
                </div>
                <button class="action-button" @click="executeAction(response)">
                  <span>执行操作</span>
                  <span class="arrow">→</span>
                </button>
              </div>

              <!-- 文本类型 -->
              <div v-else-if="response.type === 'text'" class="response-text" v-html="renderedMarkdown"></div>

              <!-- HTML 类型 -->
              <div v-else-if="response.type === 'html'" class="response-html" v-html="renderedMarkdown"></div>

              <!-- 默认 JSON -->
              <div v-else class="response-json">
                <pre>{{ JSON.stringify(response, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-wrapper">
        <input 
          v-model="prompt" 
          @keyup.enter="handleSend"
          placeholder="输入你的问题或请求..."
          :disabled="isLoading"
        />
        <button 
          class="send-button" 
          @click="handleSend" 
          :disabled="isLoading || !prompt.trim()"
        >
          <span v-if="!isLoading">➤</span>
          <span v-else class="loading-spinner"></span>
        </button>
      </div>
      <div class="input-hint">
        按 <kbd>Enter</kbd> 发送 · <kbd>Shift + Enter</kbd> 换行
      </div>
    </div>

    <!-- Session ID -->
    <div v-if="sessionId" class="session-info">
      <span class="session-label">Session:</span>
      <code>{{ sessionId }}</code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import { marked } from 'marked';

const prompt = ref('');
const response = ref<any>(null);
const isLoading = ref(false);
const sessionId = ref<string | null>(null);
const chatAreaRef = ref<HTMLElement | null>(null);

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
});

// 从 localStorage 恢复 session
const restoreSession = async () => {
  const savedSessionId = localStorage.getItem('lc_session_id');
  if (savedSessionId) {
    try {
      const res = await fetch(`http://localhost:3000/api/agent/sessions/${savedSessionId}`);
      if (res.ok) {
        const session = await res.json();
        if (session && session.messages && session.messages.length > 0) {
          sessionId.value = savedSessionId;
          // 显示最后一条消息
          const lastMsg = session.messages[session.messages.length - 1];
          response.value = lastMsg.response || { type: 'text', content: lastMsg.content };
          return;
        }
      }
    } catch (e) {
      console.error('Failed to restore session:', e);
    }
  }
};

// 保存 session 到 localStorage
const saveSession = () => {
  if (sessionId.value) {
    localStorage.setItem('lc_session_id', sessionId.value);
  }
};

const renderedMarkdown = computed(() => {
  if (!response.value) return '';
  const content = response.value.content || response.value;
  return marked.parse(content);
});

const handleSend = async () => {
  if (!prompt.value || isLoading.value) return;
  
  isLoading.value = true;
  response.value = null;
  
  // 使用流式 API
  try {
    const res = await fetch('http://localhost:3000/api/agent/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt.value,
        sessionId: sessionId.value || undefined,
      }),
    });
    
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let resultText = '';
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              // 保存 sessionId
              if (data.sessionId) {
                sessionId.value = data.sessionId;
                saveSession();
              }
              // 累积文本
              if (data.ui?.content) {
                resultText = data.ui.content;
                response.value = { ...data.ui, content: resultText };
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
        
        await nextTick();
        if (chatAreaRef.value) {
          chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight;
        }
      }
    }
    
    prompt.value = '';
  } catch (error) {
    console.error('Error:', error);
    response.value = { type: 'text', content: '请求失败，请检查服务是否运行' };
  } finally {
    isLoading.value = false;
  }
};

const executeAction = (actionData: any) => {
  alert(`触发操作: ${actionData.action}\n参数: ${JSON.stringify(actionData.payload)}`);
};

onMounted(() => {
  restoreSession();
});
</script>

<style scoped>
.copilot-container {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 112px);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

/* 头部 */
.copilot-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.header-avatar {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 16px;
  font-size: 28px;
}

.avatar-glow {
  position: absolute;
  inset: -4px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 20px;
  filter: blur(12px);
  opacity: 0.5;
  z-index: -1;
  animation: avatarGlow 3s ease-in-out infinite;
}

@keyframes avatarGlow {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.05); }
}

.header-info h1 {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.header-info p {
  font-size: 13px;
  color: #71717a;
}

/* 对话区域 */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.messages-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 欢迎消息 */
.welcome-message {
  text-align: center;
  padding: 40px 20px;
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 20px;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.welcome-message h2 {
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12px;
}

.welcome-message > p {
  color: #a1a1aa;
  margin-bottom: 24px;
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 400px;
  margin: 0 auto 24px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  font-size: 13px;
  color: #d4d4d8;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.feature-icon {
  font-size: 18px;
}

.hint {
  color: #6366f1;
  font-size: 14px;
}

/* 加载动画 */
.loading-message {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.loading-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 12px;
  font-size: 20px;
}

.loading-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.loading-dots {
  display: flex;
  gap: 4px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background: #6366f1;
  border-radius: 50%;
  animation: loadingBounce 1.4s ease-in-out infinite;
}

.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes loadingBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.loading-text {
  color: #71717a;
  font-size: 14px;
}

/* AI 消息 */
.ai-message {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.message-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 12px;
  font-size: 20px;
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.response-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 20px;
}

.response-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.response-icon {
  font-size: 20px;
}

.response-title {
  font-size: 15px;
  font-weight: 500;
  color: #e4e4e7;
}

/* 图表样式 */
.chart-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chart-label {
  width: 80px;
  font-size: 13px;
  color: #a1a1aa;
  flex-shrink: 0;
}

.chart-bar-wrapper {
  flex: 1;
  height: 24px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  overflow: hidden;
}

.chart-bar {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 6px;
  transition: width 0.6s ease;
}

.chart-value {
  width: 40px;
  text-align: right;
  font-size: 13px;
  font-weight: 500;
  color: #e4e4e7;
}

/* 表格样式 */
.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

th {
  color: #71717a;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.02);
}

td {
  color: #e4e4e7;
}

tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

/* 操作按钮 */
.action-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
}

.arrow {
  transition: transform 0.2s ease;
}

.action-button:hover .arrow {
  transform: translateX(4px);
}

/* 文本响应 */
.response-text, .response-html {
  color: #e4e4e7;
  line-height: 1.6;
  font-size: 14px;
}

/* Markdown 样式 */
.response-text :deep(h1),
.response-text :deep(h2),
.response-text :deep(h3),
.response-text :deep(h4) {
  color: #fff;
  margin: 16px 0 8px;
}

.response-text :deep(h1) { font-size: 20px; }
.response-text :deep(h2) { font-size: 18px; }
.response-text :deep(h3) { font-size: 16px; }

.response-text :deep(p) {
  margin: 8px 0;
}

.response-text :deep(ul),
.response-text :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.response-text :deep(li) {
  margin: 4px 0;
}

.response-text :deep(code) {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', monospace;
}

.response-text :deep(pre) {
  background: rgba(0, 0, 0, 0.3);
  padding: 16px;
  border-radius: 10px;
  overflow-x: auto;
  margin: 12px 0;
}

.response-text :deep(pre code) {
  background: transparent;
  padding: 0;
}

.response-text :deep(blockquote) {
  border-left: 3px solid #6366f1;
  padding-left: 12px;
  margin: 12px 0;
  color: #a1a1aa;
}

.response-text :deep(a) {
  color: #818cf8;
  text-decoration: none;
}

.response-text :deep(a:hover) {
  text-decoration: underline;
}

.response-text :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.response-text :deep(th),
.response-text :deep(td) {
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
}

.response-text :deep(th) {
  background: rgba(255, 255, 255, 0.05);
}

.response-text :deep(hr) {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 16px 0;
}

/* JSON 响应 */
.response-json pre {
  background: rgba(0, 0, 0, 0.3);
  padding: 16px;
  border-radius: 10px;
  font-size: 12px;
  color: #a1a1aa;
  overflow-x: auto;
}

/* 输入区域 */
.input-area {
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.input-wrapper {
  display: flex;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 8px;
  transition: all 0.2s ease;
}

.input-wrapper:focus-within {
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.input-wrapper input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  padding: 12px 16px;
  font-size: 14px;
  color: #e4e4e7;
}

.input-wrapper input::placeholder {
  color: #52525b;
}

.send-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.send-button:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.input-hint {
  margin-top: 12px;
  text-align: center;
  font-size: 12px;
  color: #52525b;
}

.input-hint kbd {
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: inherit;
  margin: 0 2px;
}

/* Session 信息 */
.session-info {
  padding: 12px 24px;
  font-size: 12px;
  color: #52525b;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.session-label {
  margin-right: 8px;
}

.session-info code {
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

/* 消息过渡 */
.message-enter-active {
  transition: all 0.3s ease;
}

.message-leave-active {
  transition: all 0.2s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.message-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
