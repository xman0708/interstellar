/**
 * Feishu Notifier - 飞书通知模块
 * 功能：
 * - 发送告警通知到飞书
 * - 支持文本消息
 */

import * as fs from 'fs';
import * as path from 'path';

const CONFIG = {
  // 飞书应用凭据 (需要替换为实际值)
  appId: process.env.FEISHU_APP_ID || '',
  appSecret: process.env.FEISHU_APP_SECRET || '',
  // 通知目标: user_id 或 open_id 或群 chat_id
  notifyUserId: process.env.FEISHU_NOTIFY_USER_ID || '',
  notifyChatId: process.env.FEISHU_NOTIFY_CHAT_ID || '',
  logPath: path.join(process.cwd(), 'workspace/logs/feishu-notifier.log'),
};

interface FeishuMessage {
  msg_type: 'text' | 'post';
  content: {
    text?: string;
    post?: any;
  };
}

class FeishuNotifier {
  private accessToken: string = '';
  private tokenExpireTime: number = 0;

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const dir = path.dirname(CONFIG.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(CONFIG.logPath, logMessage);
  }

  /**
   * 获取 access_token
   */
  private async getAccessToken(): Promise<string> {
    // 检查缓存的 token 是否有效
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    try {
      const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          app_id: CONFIG.appId,
          app_secret: CONFIG.appSecret,
        }),
      });

      const data = await response.json();
      
      if (data.code) {
        throw new Error(`获取token失败: ${data.msg}`);
      }

      this.accessToken = data.tenant_access_token;
      this.tokenExpireTime = Date.now() + (data.expire - 60) * 1000; // 提前60秒过期
      
      this.log('获取 access_token 成功');
      return this.accessToken;
    } catch (error) {
      this.log(`获取 access_token 失败: ${error}`);
      throw error;
    }
  }

  /**
   * 发送文本消息给用户
   */
  async sendTextToUser(text: string): Promise<boolean> {
    if (!CONFIG.notifyUserId) {
      this.log('未配置 notifyUserId，跳过发送');
      return false;
    }

    try {
      const token = await this.getAccessToken();
      
      const response = await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          receive_id: CONFIG.notifyUserId,
          msg_type: 'text',
          content: JSON.stringify({ text }),
        }),
      });

      const data = await response.json();
      this.log(`发送结果: ${JSON.stringify(data)}`);
      
      if (data.code && data.code !== 0) {
        throw new Error(`发送消息失败: ${data.msg}`);
      }

      this.log(`发送消息成功: ${text.slice(0, 50)}...`);
      return true;
    } catch (error) {
      this.log(`发送消息失败: ${error}`);
      return false;
    }
  }

  /**
   * 发送消息到群
   */
  async sendTextToChat(text: string): Promise<boolean> {
    if (!CONFIG.notifyChatId) {
      this.log('未配置 notifyChatId，跳过发送');
      return false;
    }

    try {
      const token = await this.getAccessToken();
      
      const response = await fetch('https://open.feishu.cn/open-apis/im/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          receive_id_type: 'chat_id',
          receive_id: CONFIG.notifyChatId,
          msg_type: 'text',
          content: JSON.stringify({ text }),
        }),
      });

      const data = await response.json();
      
      if (data.code && data.code !== 0) {
        throw new Error(`发送消息失败: ${data.msg}`);
      }

      this.log(`发送群消息成功: ${text.slice(0, 50)}...`);
      return true;
    } catch (error) {
      this.log(`发送群消息失败: ${error}`);
      return false;
    }
  }

  /**
   * 发送告警 (根据配置发送给用户或群)
   */
  async notify(title: string, message: string): Promise<boolean> {
    const fullMessage = `【${title}】\n${message}`;
    
    let success = false;
    
    if (CONFIG.notifyChatId) {
      success = await this.sendTextToChat(fullMessage);
    }
    
    if (CONFIG.notifyUserId) {
      success = await this.sendTextToUser(fullMessage) || success;
    }

    return success;
  }
}

// 导出单例
export const feishuNotifier = new FeishuNotifier();

// 测试入口
if (require.main === module) {
  const args = process.argv.slice(2);
  const message = args.join(' ');
  
  if (message) {
    feishuNotifier.notify('测试', message).then(result => {
      console.log(result ? '发送成功' : '发送失败');
    });
  } else {
    console.log('用法: node feishu-notifier.ts <消息内容>');
  }
}
