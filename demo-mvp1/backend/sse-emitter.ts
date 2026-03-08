/**
 * SSE Event Emitter - 用于实时推送执行过程
 */

import { EventEmitter } from 'events';

class SSEEmitter extends EventEmitter {
  private connections: Map<string, (data: string) => void> = new Map();

  /**
   * 注册一个新的 SSE 连接
   */
  register(clientId: string, sendFn: (data: string) => void) {
    this.connections.set(clientId, sendFn);
    console.log(`[SSE] Client connected: ${clientId}`);
  }

  /**
   * 移除 SSE 连接
   */
  unregister(clientId: string) {
    this.connections.delete(clientId);
    console.log(`[SSE] Client disconnected: ${clientId}`);
  }

  /**
   * 发送事件到指定客户端
   */
  emitTo(clientId: string, event: string, data: any) {
    const sendFn = this.connections.get(clientId);
    if (sendFn) {
      const payload = JSON.stringify({ event, data, timestamp: Date.now() });
      sendFn(`data: ${payload}\n\n`);
    }
  }

  /**
   * 广播事件到所有客户端
   */
  broadcast(event: string, data: any) {
    const payload = JSON.stringify({ event, data, timestamp: Date.now() });
    for (const sendFn of this.connections.values()) {
      sendFn(`data: ${payload}\n\n`);
    }
  }

  /**
   * 便捷方法：发送执行步骤
   */
  sendStep(clientId: string, step: {
    type: 'thinking' | 'action' | 'result' | 'error' | 'complete';
    message: string;
    detail?: string;
  }) {
    this.emitTo(clientId, 'step', step);
  }
}

// 导出单例
export const sseEmitter = new SSEEmitter();

// 便捷函数
export const sendStep = (clientId: string, type: StepType, message: string, detail?: string) => {
  sseEmitter.sendStep(clientId, { type, message, detail });
};

type StepType = 'thinking' | 'action' | 'result' | 'error' | 'complete';
