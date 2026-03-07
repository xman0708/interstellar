<template>
  <div class="copilot-container">
    <h2>🤖 HuiFlow Copilot</h2>
    
    <div class="chat-area">
      <div v-if="object" class="dynamic-ui-zone">
        <h3>{{ object.title }}</h3>
        
        <!-- JIT UI: Rendering an AutoChart if the schema dictates it -->
        <div v-if="object.uiType === 'AutoChart' && object.chartData" class="chart-box">
          <p>📊 自动渲染的图表组件 (模拟 Echarts)</p>
          <ul>
            <li v-for="item in object.chartData" :key="item.label">
              {{ item.label }}: <span class="bar" :style="{ width: item.value * 2 + 'px' }"></span> ({{ item.value }})
            </li>
          </ul>
        </div>

        <!-- JIT UI: Rendering a SmartTable -->
        <div v-else-if="object.uiType === 'SmartTable' && object.tableRows" class="table-box">
          <p>📋 自动渲染的数据表格组件</p>
          <table border="1">
            <thead>
              <tr><th v-for="col in object.tableColumns" :key="col">{{ col }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in object.tableRows" :key="idx">
                <td v-for="col in object.tableColumns" :key="col">{{ row[col] }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- HYBRID UI: Triggering existing complex frontend components -->
        <div v-else-if="object.uiType === 'ActionCommand' && object.commandPayload" class="action-box">
          <p>⚡ 触发复杂指令：准备拉起现有重业务组件</p>
          <button @click="executeAction(object.commandPayload)">
            点击执行: {{ object.commandPayload.actionId }}
          </button>
        </div>
      </div>
    </div>

    <div class="input-area">
      <input 
        v-model="prompt" 
        @keyup.enter="handleSend"
        placeholder="例如: 帮我对比一下张三和李四本周的工时..." 
      />
      <button @click="handleSend" :disabled="isLoading">发送给大脑</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
// Introduce the Vercel AI SDK for Vue
import { useObject } from '@ai-sdk/vue';

const prompt = ref('');

// useObject automatically handles the streaming JSON chunk parsing
// and provides a reactive `object` that updates character-by-character!
const { object, submit, isLoading } = useObject({
  api: 'http://localhost:3000/api/generate-ui',
});

const handleSend = () => {
  if (!prompt.value) return;
  // Send the prompt to our Node.js Backend Brain
  submit({ prompt: prompt.value });
};

const executeAction = (payload: any) => {
  alert(`模拟：触发全局 EventBus！\n打开原有的极其复杂的 Vue 组件弹窗...\n带入参数: ${JSON.stringify(payload.params)}`);
};
</script>

<style scoped>
.copilot-container { padding: 20px; border: 1px solid #ccc; max-width: 600px; }
.dynamic-ui-zone { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
.chart-box, .table-box, .action-box { margin-top: 10px; border: 1px dashed #666; padding: 10px; }
.bar { display: inline-block; height: 10px; background: #4caf50; }
.input-area input { width: 70%; padding: 8px; }
.input-area button { padding: 8px 15px; }
</style>
