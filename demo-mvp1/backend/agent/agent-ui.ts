/**
 * 数据转 UI 响应
 */
export function dataToUIResponse(skillName: string, data: any): UIResponse {
  console.log('[UI] skillName:', skillName, 'data:', JSON.stringify(data));
  
  // 处理 executeSkill 包装的结构
  const rawData = data?.data;
  const result = rawData?.data || rawData || data;
  console.log('[UI] result:', JSON.stringify(result));
  
  // 代码生成网页 - 优先检查
  if (skillName === 'code.html' || result?.type === 'html') {
    console.log('[DEBUG] code.html matched');
    return {
      type: 'html',
      title: '生成的网页',
      content: result.content || result
    };
  }
  
  // 邮件列表
  if (skillName.startsWith('email.')) {
    const emails = Array.isArray(result) ? result : [];
    return {
      type: 'table',
      title: skillName === 'email.unread' ? '未读邮件' : '邮件列表',
      columns: [
        { key: 'fromName', label: '发件人' },
        { key: 'subject', label: '主题' },
        { key: 'time', label: '时间' }
      ],
      rows: emails.slice(0, 10).map((e: any) => ({
        fromName: e.fromName,
        subject: e.subject,
        time: e.time
      }))
    };
  }
  
  // 日历
  if (skillName.startsWith('calendar.')) {
    const events = Array.isArray(result) ? result : [];
    return {
      type: 'table',
      title: skillName === 'calendar.today' ? '今日会议' : '即将到来的会议',
      columns: [
        { key: 'title', label: '会议' },
        { key: 'start', label: '时间' },
        { key: 'location', label: '地点' }
      ],
      rows: events.map((e: any) => ({
        title: e.title,
        start: e.start,
        location: e.location || '线上'
      }))
    };
  }
  
  // 项目列表
  if (skillName.startsWith('api.projects.')) {
    const projects = Array.isArray(result) ? result : [];
    return {
      type: 'table',
      title: '项目列表',
      columns: [
        { key: 'name', label: '名称' },
        { key: 'status', label: '状态' },
        { key: 'progress', label: '进度' }
      ],
      rows: projects.map((p: any) => ({
        name: p.name,
        status: p.status || 'active',
        progress: p.progress || '0%'
      }))
    };
  }
  
  // 任务列表
  if (skillName.startsWith('api.tasks.')) {
    const tasks = Array.isArray(result) ? result : [];
    return {
      type: 'table',
      title: '任务列表',
      columns: [
        { key: 'title', label: '标题' },
        { key: 'status', label: '状态' },
        { key: 'assignee', label: '负责人' }
      ],
      rows: tasks.map((t: any) => ({
        title: t.title,
        status: t.status || 'pending',
        assignee: t.assignee || '未分配'
      }))
    };
  }
  
  // 工时统计
  if (skillName === 'api.stats.work-hours') {
    const workHours = result?.workHours || result || [];
    return {
      type: 'chart',
      title: '本周工时统计',
      chartType: 'bar',
      data: Array.isArray(workHours) ? workHours.map((w: any) => ({
        label: w.name || w.userId,
        value: w.hours
      })) : []
    };
  }
  
  // 自我感知
  if (skillName === 'self.awareness' || result?.type === 'self') {
    return {
      type: 'text',
      title: '自我认知',
      content: result.content || generateSelfDescription()
    };
  }
  
  // 默认文本
  console.log('[DEBUG] returning text, result:', result);
  return {
    type: 'text',
    content: JSON.stringify(result, null, 2)
  };
}
