/**
 * Browser Skill - 智能浏览器操作
 * 自动搜索、填表、点击
 */

import { chromium, Browser, Page } from 'playwright';

let browser: Browser | null = null;
let page: Page | null = null;
let context: any = null;

// 获取或创建浏览器
async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    try {
      browser = await chromium.launch({
        headless: false,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } catch (e) {
      browser = await chromium.launch({
        headless: true,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }
  return browser;
}

// 智能搜索 - 返回可点击的链接
export async function smartSearch(query: string): Promise<any> {
  try {
    const b = await getBrowser();
    
    const pages = b.contexts()[0]?.pages() || [];
    if (pages.length > 0) {
      page = pages[0];
      await page.close();
    }
    page = await b.newPage();
    
    // 打开百度搜索
    console.log('[Browser] Opening baidu search...');
    await page.goto(`https://www.baidu.com/s?wd=${encodeURIComponent(query)}`, { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    const title = await page.title();
    const url = page.url();
    
    // 获取搜索结果链接
    const results = await page.evaluate(() => {
      const items: any[] = [];
      document.querySelectorAll('.result, .c-container, #content_left .c-wrapper').forEach((el, i) => {
        const link = el.querySelector('a[href]');
        const titleEl = el.querySelector('h3, .c-title, .title');
        if (link && titleEl && items.length < 8) {
          let href = link.getAttribute('href') || '';
          // 百度URL解码
          href = decodeURIComponent(href.replace(/^\/url\?q=/, ''));
          if (href && href.startsWith('http')) {
            items.push({
              title: titleEl.textContent?.trim().substring(0, 60) || `结果 ${i+1}`,
              url: href
            });
          }
        }
      });
      return items;
    });
    
    console.log('[Browser] Found', results.length, 'results');
    
    return { 
      success: true, 
      action: 'smart-search',
      query, 
      title, 
      url,
      results,
      message: `✅ 搜索完成: "${query}"\n\n📱 浏览器窗口已显示搜索结果\n\n🔗 可直接打开的链接：\n${results.map((r, i) => `${i+1}. ${r.title}`).join('\n')}`
    };
  } catch (error: any) {
    console.log('[Browser] Error:', error.message);
    return { success: false, error: error.message };
  }
}

// 打开网页
export async function openPage(url: string): Promise<any> {
  try {
    const b = await getBrowser();
    
    const pages = b.contexts()[0]?.pages() || [];
    if (pages.length > 0) {
      page = pages[0];
      await page.close();
    }
    page = await b.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const title = await page.title();
    
    return { success: true, url, title, message: `✅ 已打开: ${title}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 截图
export async function takeScreenshot(): Promise<any> {
  try {
    if (!page) return { success: false, error: '没有打开的页面' };
    const screenshot = await page.screenshot({ encoding: 'base64' });
    return { success: true, screenshot, message: '截图已获取' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 点击元素
export async function clickElement(selector: string): Promise<any> {
  try {
    if (!page) return { success: false, error: '没有打开的页面' };
    await page.click(selector, { timeout: 10000 });
    const title = await page.title();
    return { success: true, message: `✅ 已点击: ${selector}`, title };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 输入文字
export async function typeText(selector: string, text: string): Promise<any> {
  try {
    if (!page) return { success: false, error: '没有打开的页面' };
    await page.fill(selector, text);
    return { success: true, message: `✅ 已输入: ${text}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 执行 JavaScript
export async function runScript(script: string): Promise<any> {
  try {
    if (!page) return { success: false, error: '没有打开的页面' };
    const result = await page.evaluate(script);
    return { success: true, result, message: '脚本执行完成' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 智能操作 - 根据用户需求自动决定操作
export async function smartBrowserAction(message: string): Promise<any> {
  const msg = message.toLowerCase();
  
  // "打开第X个" - 打开当前页面的第X个链接
  const openIndexMatch = message.match(/打开第(\d+)个/);
  if (openIndexMatch) {
    const index = parseInt(openIndexMatch[1]) - 1;
    console.log('[Browser] Opening link index:', index);
    
    // 先尝试从当前页面打开
    const result = await openLinkFromCurrentPage(index);
    console.log('[Browser] Open result:', result);
    
    if (result.success) {
      return result;
    }
    // 如果失败，返回提示而不是搜索
    return { 
      success: false, 
      error: result.error || '无法打开链接',
      message: `❌ ${result.error || '无法打开链接'}\n\n💡 请确保浏览器窗口已打开搜索结果页面`
    };
  }
  
  // 提取搜索关键词
  const searchMatch = message.match(/(?:搜索|查一下|找一下|google|百度)(.+)/i);
  if (searchMatch || msg.includes('搜索') || msg.includes('查')) {
    const query = searchMatch ? searchMatch[1].trim() : message.replace(/(打开|访问|浏览器)/g, '').trim();
    if (query) {
      return smartSearch(query);
    }
  }
  
  // 默认打开页面
  const urlMatch = message.match(/(?:https?:\/\/)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
  if (urlMatch) {
    let url = urlMatch[1];
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    return openPage(url);
  }
  
  return openPage('https://www.baidu.com');
}

// 从当前页面打开第X个链接
async function openLinkFromCurrentPage(index: number): Promise<any> {
  try {
    const b = await getBrowser();
    const pages = b.contexts()[0]?.pages() || [];
    if (pages.length === 0) {
      return { success: false, error: '没有打开的页面' };
    }
    page = pages[pages.length - 1];
    
    const result = await page.evaluate((idx) => {
      const links = document.querySelectorAll('a[href]');
      const validLinks: { title: string; href: string }[] = [];
      
      for (const link of links) {
        const href = link.getAttribute('href');
        const text = link.textContent?.trim() || '';
        
        if (href) {
          let fullUrl = href;
          if (href.startsWith('//')) fullUrl = 'https:' + href;
          if (href.startsWith('/')) {
            // 相对路径
            try {
              fullUrl = window.location.origin + href;
            } catch (e) { continue; }
          }
          
          // 百度URL解码
          fullUrl = decodeURIComponent(fullUrl.replace(/^\/url\?q=/, ''));
          
          if (fullUrl.startsWith('http') && !fullUrl.includes('baidu.com/baidu')) {
            validLinks.push({ title: text.substring(0, 50), url: fullUrl });
          }
        }
      }
      
      return validLinks[idx] || null;
    }, index);
    
    if (!result) {
      return { success: false, error: `没有第${index + 1}个链接` };
    }
    
    console.log('[Browser] Opening link:', result.title, result.url);
    await page.goto(result.url, { waitUntil: 'networkidle', timeout: 30000 });
    
    const title = await page.title();
    
    return {
      success: true,
      action: 'open-result',
      title,
      url: page.url(),
      message: `✅ 已打开: ${title}`
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
