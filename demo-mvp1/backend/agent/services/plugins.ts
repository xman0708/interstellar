/**
 * Plugin System - 插件系统
 * 
 * 允许扩展 LivingCode 功能
 */

import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_PATH = path.join(__dirname, '../../../workspace');
const PLUGINS_DIR = path.join(WORKSPACE_PATH, 'plugins');

interface Plugin {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  events: string[];
}

// 确保目录存在
if (!fs.existsSync(PLUGINS_DIR)) {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
}

/**
 * 获取所有插件
 */
export function getAll(): Plugin[] {
  if (!fs.existsSync(PLUGINS_DIR)) return [];
  
  const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.json'));
  const plugins: Plugin[] = [];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(PLUGINS_DIR, file), 'utf-8');
      plugins.push(JSON.parse(content));
    } catch {}
  }
  
  return plugins;
}

/**
 * 获取启用的插件
 */
export function getEnabled(): Plugin[] {
  return getAll().filter(p => p.enabled);
}

/**
 * 启用插件
 */
export function enable(id: string): boolean {
  const plugins = getAll();
  const plugin = plugins.find(p => p.id === id);
  
  if (!plugin) return false;
  
  plugin.enabled = true;
  fs.writeFileSync(path.join(PLUGINS_DIR, `${id}.json`), JSON.stringify(plugin, null, 2));
  return true;
}

/**
 * 禁用插件
 */
export function disable(id: string): boolean {
  const plugins = getAll();
  const plugin = plugins.find(p => p.id === id);
  
  if (!plugin) return false;
  
  plugin.enabled = false;
  fs.writeFileSync(path.join(PLUGINS_DIR, `${id}.json`), JSON.stringify(plugin, null, 2));
  return true;
}

/**
 * 注册新插件
 */
export function register(plugin: Omit<Plugin, 'enabled'>): Plugin {
  const newPlugin: Plugin = { ...plugin, enabled: true };
  fs.writeFileSync(
    path.join(PLUGINS_DIR, `${plugin.id}.json`), 
    JSON.stringify(newPlugin, null, 2)
  );
  return newPlugin;
}

/**
 * 事件触发
 */
export function emit(event: string, data: any): void {
  const plugins = getEnabled();
  
  for (const plugin of plugins) {
    if (plugin.events.includes(event)) {
      console.log(`[Plugin] ${plugin.name} received event: ${event}`);
      // 实际执行插件逻辑
    }
  }
}

// 内置插件
export const builtInPlugins: Omit<Plugin, 'enabled'>[] = [
  {
    id: 'echo',
    name: 'Echo Plugin',
    version: '1.0.0',
    events: ['message.received']
  },
  {
    id: 'logger',
    name: 'Logger Plugin',
    version: '1.0.0',
    events: ['*']
  },
  {
    id: 'reminder',
    name: 'Reminder Plugin',
    version: '1.0.0',
    events: ['session.start', 'session.end']
  },
];

// 初始化内置插件
export function initBuiltIn(): void {
  for (const plugin of builtInPlugins) {
    const existing = getAll().find(p => p.id === plugin.id);
    if (!existing) {
      register(plugin);
    }
  }
}
