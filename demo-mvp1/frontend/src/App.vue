<template>
  <div class="app-container">
    <!-- 顶部导航 -->
    <nav class="top-nav">
      <div class="nav-brand">
        <span class="brand-icon">🧠</span>
        <span class="brand-text">LivingCode</span>
      </div>
      <div class="nav-tabs">
        <button 
          :class="['nav-tab', { active: currentView === 'copilot' }]" 
          @click="currentView = 'copilot'"
        >
          <span class="tab-icon">💬</span>
          <span>Copilot</span>
        </button>
        <button 
          :class="['nav-tab', { active: currentView === 'dashboard' }]" 
          @click="currentView = 'dashboard'"
        >
          <span class="tab-icon">📊</span>
          <span>Dashboard</span>
        </button>
      </div>
      <div class="nav-status">
        <span class="status-dot"></span>
        <span class="status-text">在线</span>
      </div>
    </nav>

    <!-- 主内容区 -->
    <main class="main-content">
      <Transition name="fade" mode="out-in">
        <CopilotPanel v-if="currentView === 'copilot'" />
        <Dashboard v-else-if="currentView === 'dashboard'" />
      </Transition>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CopilotPanel from './components/CopilotPanel.vue';
import Dashboard from './components/Dashboard.vue';

const currentView = ref<'copilot' | 'dashboard'>('copilot');
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
  min-height: 100vh;
  color: #e4e4e7;
}

/* 渐变背景动画 */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(ellipse at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 70%);
  pointer-events: none;
  z-index: -1;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  font-size: 28px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.brand-text {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #818cf8, #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-tabs {
  display: flex;
  gap: 8px;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  border-radius: 12px;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #a1a1aa;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-tab:hover {
  color: #e4e4e7;
  background: rgba(255, 255, 255, 0.05);
}

.nav-tab.active {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.tab-icon {
  font-size: 16px;
}

.nav-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 20px;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  animation: glow 2s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 4px #22c55e; }
  50% { box-shadow: 0 0 12px #22c55e; }
}

.status-text {
  font-size: 12px;
  color: #22c55e;
  font-weight: 500;
}

/* 主内容区 */
.main-content {
  flex: 1;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
