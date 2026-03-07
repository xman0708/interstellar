/**
 * Knowledge Base - 知识库系统
 * 
 * 支持文档存储、搜索、问答
 */

import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_PATH = path.join(__dirname, '../../../workspace');
const KNOWLEDGE_DIR = path.join(WORKSPACE_PATH, 'knowledge');

// 确保目录存在
if (!fs.existsSync(KNOWLEDGE_DIR)) {
  fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 获取所有知识项
 */
export function getAll(): KnowledgeItem[] {
  const files = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.json'));
  const items: KnowledgeItem[] = [];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(KNOWLEDGE_DIR, file), 'utf-8');
      items.push(JSON.parse(content));
    } catch {}
  }
  
  return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * 搜索知识库
 */
export function search(query: string): KnowledgeItem[] {
  const items = getAll();
  const q = query.toLowerCase();
  
  return items.filter(item => 
    item.title.toLowerCase().includes(q) ||
    item.content.toLowerCase().includes(q) ||
    item.tags.some(tag => tag.toLowerCase().includes(q))
  );
}

/**
 * 获取知识项
 */
export function get(id: string): KnowledgeItem | null {
  const file = path.join(KNOWLEDGE_DIR, `${id}.json`);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }
  return null;
}

/**
 * 创建知识项
 */
export function create(data: { title: string; content: string; tags: string[] }): KnowledgeItem {
  const id = `kb_${Date.now()}`;
  const item: KnowledgeItem = {
    id,
    title: data.title,
    content: data.content,
    tags: data.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  fs.writeFileSync(path.join(KNOWLEDGE_DIR, `${id}.json`), JSON.stringify(item, null, 2));
  return item;
}

/**
 * 更新知识项
 */
export function update(id: string, data: Partial<KnowledgeItem>): KnowledgeItem | null {
  const item = get(id);
  if (!item) return null;
  
  const updated = {
    ...item,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  
  fs.writeFileSync(path.join(KNOWLEDGE_DIR, `${id}.json`), JSON.stringify(updated, null, 2));
  return updated;
}

/**
 * 删除知识项
 */
export function remove(id: string): boolean {
  const file = path.join(KNOWLEDGE_DIR, `${id}.json`);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    return true;
  }
  return false;
}

// 初始化一些示例知识
export function initSampleData(): void {
  if (getAll().length > 0) return;
  
  create({
    title: '项目协作规范',
    content: '1. 每日站会 10 分钟\n2. PR 需要 code review\n3. 重大需求需要评审',
    tags: ['规范', '协作'],
  });
  
  create({
    title: '代码提交规范',
    content: 'feat: 新功能\nfix: 修复bug\ndocs: 文档更新\nrefactor: 重构',
    tags: ['git', '规范'],
  });
  
  create({
    title: 'API 设计原则',
    content: '1. RESTful 风格\n2. 版本号 /v1/\n3. 统一错误响应',
    tags: ['API', '后端'],
  });
}

// 初始化
initSampleData();
