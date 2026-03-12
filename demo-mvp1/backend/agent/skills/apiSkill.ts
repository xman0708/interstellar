/**
 * API Skill - 业务 API 调用
 */

const API_BASE = process.env.APP_BASE_URL || 'http://localhost:3000';

export async function executeApi(params: {
  method: string;
  path: string;
  body?: any;
}): Promise<any> {
  const { method, path, body } = params;
  
  const url = `${API_BASE}${path}`;
  
  return new Promise((resolve, reject) => {
    const http = url.startsWith('https') ? require('https') : require('http');
    
    const options = {
      hostname: new URL(url).hostname,
      port: new URL(url).port || (url.startsWith('https') ? 443 : 80),
      path: new URL(url).pathname,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
