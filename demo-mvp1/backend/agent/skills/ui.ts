/**
 * UI 响应类型定义
 */

export type UIResponse = 
  | ChartResponse 
  | TableResponse 
  | ActionResponse 
  | TextResponse;

export interface ChartResponse {
  type: 'chart';
  title: string;
  chartType: 'bar' | 'line' | 'pie';
  data: { label: string; value: number }[];
}

export interface TableResponse {
  type: 'table';
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, any>[];
}

export interface ActionResponse {
  type: 'action';
  action: string;
  payload?: Record<string, any>;
}

export interface TextResponse {
  type: 'text';
  content: string;
}
