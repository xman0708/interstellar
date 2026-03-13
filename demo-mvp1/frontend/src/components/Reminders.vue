<template>
  <div class="reminders-page">
    <div class="page-header">
      <h2>📝 提醒管理</h2>
      <button class="btn-primary" @click="showCreateModal = true">+ 新建提醒</button>
    </div>

    <!-- 筛选 -->
    <div class="filters">
      <select v-model="filterStatus" class="filter-select">
        <option value="all">全部</option>
        <option value="pending">待执行</option>
        <option value="completed">已完成</option>
      </select>
    </div>

    <!-- 提醒列表 -->
    <div class="reminder-list">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="filteredReminders.length === 0" class="empty">
        暂无提醒
      </div>
      <div 
        v-else 
        v-for="reminder in filteredReminders" 
        :key="reminder.id"
        class="reminder-card"
        :class="{ completed: reminder.completed }"
      >
        <div class="reminder-header">
          <span class="reminder-title">{{ reminder.title }}</span>
          <span class="reminder-priority" :class="reminder.priority">
            {{ priorityText(reminder.priority) }}
          </span>
        </div>
        <div class="reminder-meta">
          <span class="reminder-time">⏰ {{ formatTime(reminder.time) }}</span>
          <span v-if="reminder.category" class="reminder-category">🏷️ {{ reminder.category }}</span>
        </div>
        <div v-if="reminder.notes" class="reminder-notes">{{ reminder.notes }}</div>
        <div class="reminder-actions">
          <button v-if="!reminder.completed" class="btn-sm" @click="completeReminder(reminder.id)">
            ✅ 完成
          </button>
          <button class="btn-sm danger" @click="deleteReminder(reminder.id)">
            🗑️ 删除
          </button>
        </div>
      </div>
    </div>

    <!-- 创建弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <h3>新建提醒</h3>
        <form @submit.prevent="createReminder">
          <div class="form-group">
            <label>标题 *</label>
            <input v-model="newReminder.title" type="text" required placeholder="如：早会" />
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model="newReminder.notes" placeholder="可选备注"></textarea>
          </div>
          <div class="form-group">
            <label>分类</label>
            <select v-model="newReminder.category">
              <option value="">选择分类</option>
              <option value="work">工作</option>
              <option value="personal">个人</option>
              <option value="health">健康</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label>优先级</label>
            <select v-model="newReminder.priority">
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
          <div class="form-group">
            <label>时间 *</label>
            <input v-model="newReminder.time" type="datetime-local" required />
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showCreateModal = false">取消</button>
            <button type="submit" class="btn-primary">创建</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Reminder {
  id: string;
  title: string;
  notes?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  time: string;
  completed: boolean;
  repeat?: string;
}

const reminders = ref<Reminder[]>([]);
const loading = ref(true);
const filterStatus = ref('all');
const showCreateModal = ref(false);

const newReminder = ref({
  title: '',
  notes: '',
  category: '',
  priority: 'medium' as const,
  time: ''
});

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const filteredReminders = computed(() => {
  if (filterStatus.value === 'all') return reminders.value;
  if (filterStatus.value === 'pending') return reminders.value.filter(r => !r.completed);
  return reminders.value.filter(r => r.completed);
});

function priorityText(p: string) {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高' };
  return map[p] || p;
}

function formatTime(t: string) {
  return new Date(t).toLocaleString('zh-CN');
}

async function loadReminders() {
  loading.value = true;
  try {
    const res = await fetch(`${API_BASE}/api/reminders`);
    reminders.value = await res.json();
  } catch (e) {
    console.error('加载失败', e);
  }
  loading.value = false;
}

async function createReminder() {
  try {
    const res = await fetch(`${API_BASE}/api/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReminder.value)
    });
    const created = await res.json();
    reminders.value.unshift(created);
    showCreateModal.value = false;
    newReminder.value = { title: '', notes: '', category: '', priority: 'medium', time: '' };
  } catch (e) {
    alert('创建失败');
  }
}

async function completeReminder(id: string) {
  try {
    await fetch(`${API_BASE}/api/reminders/${id}/complete`, { method: 'PATCH' });
    const idx = reminders.value.findIndex(r => r.id === id);
    if (idx > -1) reminders.value[idx].completed = true;
  } catch (e) {
    alert('操作失败');
  }
}

async function deleteReminder(id: string) {
  if (!confirm('确定删除？')) return;
  try {
    await fetch(`${API_BASE}/api/reminders/${id}`, { method: 'DELETE' });
    reminders.value = reminders.value.filter(r => r.id !== id);
  } catch (e) {
    alert('删除失败');
  }
}

onMounted(loadReminders);
</script>

<style scoped>
.reminders-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h2 { color: #fff; }

.btn-primary { background: #4f46e5; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.btn-secondary { background: #6b7280; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.btn-sm { background: #374151; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
.btn-sm.danger { background: #dc2626; }

.filters { margin-bottom: 20px; }
.filter-select { background: #1f2937; color: #fff; border: 1px solid #374151; padding: 8px 16px; border-radius: 6px; }

.reminder-list { display: flex; flex-direction: column; gap: 12px; }
.reminder-card { background: #1f2937; border-radius: 12px; padding: 16px; border: 1px solid #374151; }
.reminder-card.completed { opacity: 0.6; }
.reminder-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.reminder-title { font-weight: 600; color: #fff; }
.reminder-priority { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.reminder-priority.high { background: #dc2626; }
.reminder-priority.medium { background: #f59e0b; }
.reminder-priority.low { background: #10b981; }
.reminder-meta { display: flex; gap: 12px; color: #9ca3af; font-size: 14px; margin-bottom: 8px; }
.reminder-notes { color: #9ca3af; font-size: 14px; margin-bottom: 12px; }
.reminder-actions { display: flex; gap: 8px; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #1f2937; border-radius: 16px; padding: 24px; width: 90%; max-width: 500px; }
.modal h3 { color: #fff; margin-bottom: 20px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; color: #9ca3af; margin-bottom: 6px; }
.form-group input, .form-group textarea, .form-group select { width: 100%; background: #374151; color: #fff; border: 1px solid #4b5563; padding: 10px; border-radius: 8px; }
.form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }

.loading, .empty { text-align: center; color: #9ca3af; padding: 40px; }
</style>
