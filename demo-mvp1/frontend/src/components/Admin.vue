<template>
  <div class="admin-page">
    <div class="page-header">
      <h2>⚙️ 管理后台</h2>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">总提醒数</div>
      </div>
      <div class="stat-card pending">
        <div class="stat-value">{{ stats.pending }}</div>
        <div class="stat-label">待执行</div>
      </div>
      <div class="stat-card completed">
        <div class="stat-value">{{ stats.completed }}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-card today">
        <div class="stat-value">{{ stats.today }}</div>
        <div class="stat-label">今日到期</div>
      </div>
    </div>

    <!-- 未来24小时 -->
    <div class="section">
      <h3>⏰ 未来 24 小时</h3>
      <div class="table-container">
        <table v-if="upcomingReminders.length">
          <thead>
            <tr>
              <th>标题</th>
              <th>时间</th>
              <th>优先级</th>
              <th>分类</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in upcomingReminders" :key="r.id">
              <td>{{ r.title }}</td>
              <td>{{ formatTime(r.time) }}</td>
              <td><span class="priority-tag" :class="r.priority">{{ r.priority }}</span></td>
              <td>{{ r.category || '-' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-table">无</div>
      </div>
    </div>

    <!-- 全部提醒 -->
    <div class="section">
      <h3>📋 全部提醒</h3>
      <div class="table-container">
        <table v-if="allReminders.length">
          <thead>
            <tr>
              <th>状态</th>
              <th>标题</th>
              <th>时间</th>
              <th>优先级</th>
              <th>分类</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in allReminders" :key="r.id">
              <td>
                <span class="status-tag" :class="r.completed ? 'done' : 'pending'">
                  {{ r.completed ? '✅' : '⏳' }}
                </span>
              </td>
              <td>{{ r.title }}</td>
              <td>{{ formatTime(r.time) }}</td>
              <td><span class="priority-tag" :class="r.priority">{{ r.priority }}</span></td>
              <td>{{ r.category || '-' }}</td>
              <td>
                <button v-if="!r.completed" class="btn-xs" @click="complete(r.id)">完成</button>
                <button class="btn-xs danger" @click="remove(r.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-table">暂无数据</div>
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
  priority: string;
  time: string;
  completed: boolean;
}

const allReminders = ref<Reminder[]>([]);
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const stats = computed(() => {
  const now = new Date();
  const todayEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    total: allReminders.value.length,
    pending: allReminders.value.filter(r => !r.completed).length,
    completed: allReminders.value.filter(r => r.completed).length,
    today: allReminders.value.filter(r => !r.completed && new Date(r.time) <= todayEnd).length
  };
});

const upcomingReminders = computed(() => {
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return allReminders.value
    .filter(r => !r.completed && new Date(r.time) >= now && new Date(r.time) <= next24h)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
});

function formatTime(t: string) {
  return new Date(t).toLocaleString('zh-CN');
}

async function loadReminders() {
  try {
    const res = await fetch(`${API_BASE}/api/reminders`);
    allReminders.value = await res.json();
  } catch (e) {
    console.error('加载失败', e);
  }
}

async function complete(id: string) {
  await fetch(`${API_BASE}/api/reminders/${id}/complete`, { method: 'PATCH' });
  const idx = allReminders.value.findIndex(r => r.id === id);
  if (idx > -1) allReminders.value[idx].completed = true;
}

async function remove(id: string) {
  if (!confirm('确定删除？')) return;
  await fetch(`${API_BASE}/api/reminders/${id}`, { method: 'DELETE' });
  allReminders.value = allReminders.value.filter(r => r.id !== id);
}

onMounted(loadReminders);
</script>

<style scoped>
.admin-page { padding: 20px; }
.page-header { margin-bottom: 24px; }
.page-header h2 { color: #fff; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
.stat-card { background: #1f2937; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #374151; }
.stat-value { font-size: 32px; font-weight: 700; color: #fff; }
.stat-label { color: #9ca3af; font-size: 14px; margin-top: 4px; }
.stat-card.pending .stat-value { color: #f59e0b; }
.stat-card.completed .stat-value { color: #10b981; }
.stat-card.today .stat-value { color: #3b82f6; }

.section { margin-bottom: 32px; }
.section h3 { color: #fff; margin-bottom: 16px; font-size: 18px; }

.table-container { background: #1f2937; border-radius: 12px; overflow: hidden; border: 1px solid #374151; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #374151; }
th { background: #111827; color: #9ca3af; font-weight: 500; font-size: 14px; }
td { color: #fff; font-size: 14px; }
tr:last-child td { border-bottom: none; }

.priority-tag { padding: 2px 8px; border-radius: 4px; font-size: 12px; text-transform: capitalize; }
.priority-tag.high { background: #dc2626; }
.priority-tag.medium { background: #f59e0b; }
.priority-tag.low { background: #10b981; }

.status-tag { font-size: 16px; }

.btn-xs { background: #374151; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 4px; }
.btn-xs.danger { background: #dc2626; }

.empty-table { text-align: center; color: #9ca3af; padding: 40px; }
</style>
