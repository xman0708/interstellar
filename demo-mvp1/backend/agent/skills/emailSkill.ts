/**
 * Email Skill - 邮件操作
 */

import { emails, markEmailRead } from '../services/external.js';

// 模拟发送邮件
const sentEmails: any[] = [];

export async function executeEmail(action: string, params: any): Promise<any> {
  switch (action) {
    case 'list':
      return emails;
      
    case 'unread':
      return emails.filter(e => !e.read);
      
    case 'markRead':
      const id = params.id || params.emailId;
      if (markEmailRead(id)) {
        return { success: true, message: 'Marked as read' };
      }
      return { success: false, error: 'Email not found' };
      
    case 'send':
      // 发送邮件
      const { to, subject, body } = params;
      if (!to || !subject || !body) {
        return { success: false, error: '缺少必要参数：to, subject, body' };
      }
      
      // 模拟发送成功
      const newEmail = {
        id: `sent_${Date.now()}`,
        from: 'me@example.com',
        to,
        subject,
        body,
        read: true,
        sentAt: new Date().toISOString()
      };
      sentEmails.push(newEmail);
      
      return { 
        success: true, 
        message: '邮件发送成功！',
        email: newEmail
      };
      
    default:
      return { success: false, error: 'Unknown action' };
  }
}
