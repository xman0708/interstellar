// 简单内存存储（Vercel Serverless 重启后会重置）
let reminders = [
  {
    id: '1',
    title: '早会',
    notes: '和产品团队同步验收',
    category: 'work',
    priority: 'high',
    time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    completed: false
  }
];

export default async function handler(req, res) {
  const { method } = req;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') return res.status(200).end();

  try {
    switch (method) {
      case 'GET':
        return res.status(200).json(reminders);

      case 'POST': {
        const { title, notes, category, priority, time, repeat } = req.body;
        const newReminder = {
          id: Date.now().toString(),
          title,
          notes: notes || '',
          category: category || '',
          priority: priority || 'medium',
          time,
          repeat: repeat || '',
          completed: false
        };
        reminders.unshift(newReminder);
        return res.status(201).json(newReminder);
      }

      case 'DELETE': {
        const id = req.query.id;
        reminders = reminders.filter(r => r.id !== id);
        return res.status(200).json({ success: true });
      }

      case 'PATCH': {
        const id = req.query.id;
        const idx = reminders.findIndex(r => r.id === id);
        if (idx > -1) {
          reminders[idx] = { ...reminders[idx], ...req.body, completed: true };
          return res.status(200).json(reminders[idx]);
        }
        return res.status(404).json({ error: 'Not found' });
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
