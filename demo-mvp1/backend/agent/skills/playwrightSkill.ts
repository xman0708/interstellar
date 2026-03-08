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

// 智能表单填写 - 根据上下文自动填写表单
export async function autoFillForm(data: Record<string, string>): Promise<any> {
  try {
    if (!page) return { success: false, error: '没有打开的页面' };
    
    const results: string[] = [];
    const errors: string[] = [];
    
    // 常见字段映射
    const fieldMappings: Record<string, string[]> = {
      name: ['input[name="name"]', 'input[name="username"]', 'input[id="name"]', 'input#username', 'input[type="text"]'],
      email: ['input[name="email"]', 'input[type="email"]', 'input[id="email"]'],
      password: ['input[name="password"]', 'input[type="password"]', 'input[id="password"]'],
      phone: ['input[name="phone"]', 'input[type="tel"]', 'input[name="tel"]'],
      address: ['textarea[name="address"]', 'input[name="address"]'],
      description: ['textarea[name="description"]', 'textarea[id="description"]'],
    };
    
    for (const [key, value] of Object.entries(data)) {
      const selectors = fieldMappings[key.toLowerCase()] || [];
      let filled = false;
      
      for (const selector of selectors) {
        try {
          await page.fill(selector, value);
          results.push(`✓ ${key}: ${value}`);
          filled = true;
          break;
        } catch (e) {
          // 尝试下一个选择器
        }
      }
      
      if (!filled) {
        // 尝试智能查找
        const smartResult = await page.evaluate(([k, v]) => {
          const labels = document.querySelectorAll('label');
          for (const label of labels) {
            if (label.textContent?.toLowerCase().includes(k.toLowerCase())) {
              const input = label.querySelector('input, textarea, select');
              if (input) {
                const sel = input.tagName === 'INPUT' || input.tagName === 'TEXTAREA' 
                  ? `input[name="${input.name}"], input[id="${input.id}"]`
                  : `select[name="${input.name}"], select[id="${input.id}"]`;
                return { selector: sel, value: v };
              }
            }
          }
          return null;
        }, [key, value]);
        
        if (smartResult) {
          try {
            await page.fill(smartResult.selector, smartResult.value);
            results.push(`✓ ${key}: ${value} (智能匹配)`);
          } catch (e) {
            errors.push(`✗ ${key}: 无法填写`);
          }
        } else {
          errors.push(`✗ ${key}: 找不到字段`);
        }
      }
    }
    
    return {
      success: results.length > 0,
      filled: results.length,
      errors: errors.length,
      message: results.length > 0 
        ? `✅ 表单填写完成 (${results.length}个字段)\n${results.join('\n')}${errors.length > 0 ? '\n\n⚠️ 未填写:\n' + errors.join('\n') : ''}`
        : `❌ 无法填写表单\n${errors.join('\n')}`
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 智能点击按钮 - 根据描述找到并点击按钮
export async function smartClickButton(description: string): Promise<any> {
  try {
    if (!page) return { success: false, error: '没有打开的页面' };
    
    const result = await page.evaluate((desc) => {
      const buttons = document.querySelectorAll('button, a[role="button"], input[type="submit"], .btn, [class*="button"]');
      const descLower = desc.toLowerCase();
      
      // 关键词匹配
      const keywords: Record<string, string[]> = {
        'submit': ['提交', 'submit', '发送', '确定', 'confirm'],
        'cancel': ['取消', 'cancel', '关闭', 'close'],
        'save': ['保存', 'save', '存储'],
        'delete': ['删除', 'delete', 'remove', '移除'],
        'search': ['搜索', 'search', '查询'],
        'login': ['登录', 'login', '登录', 'signin'],
        'register': ['注册', 'register', 'signup', '注册'],
        'next': ['下一步', 'next', '继续'],
        'back': ['返回', 'back', '上一步'],
      };
      
      // 先尝试精确匹配
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        const aria = btn.getAttribute('aria-label') || '';
        
        for (const [action, words] of Object.entries(keywords)) {
          if (descLower.includes(action) || words.some(w => text.includes(w) || aria.includes(w))) {
            const sel = btn.tagName === 'BUTTON' || btn.tagName === 'A' 
              ? (btn as HTMLElement).outerHTML.substring(0, 100)
              : '';
            return { 
              tag: btn.tagName, 
              text: btn.textContent?.trim().substring(0, 30),
              html: sel
            };
          }
        }
      }
      
      // 模糊匹配
      for (const btn of buttons) {
        const text = btn.textContent?.trim() || '';
        if (text && (text.toLowerCase().includes(descLower) || descLower.includes(text.toLowerCase()))) {
          return { 
            tag: btn.tagName, 
            text: text.substring(0, 30),
          };
        }
      }
      
      return null;
    }, description);
    
    if (!result) {
      return { success: false, error: `找不到按钮: ${description}` };
    }
    
    // 根据结果类型构建选择器并点击
    const clickResult = await page.evaluate((r) => {
      const buttons = document.querySelectorAll('button, a[role="button"], input[type="submit"], .btn, [class*="button"]');
      for (const btn of buttons) {
        const text = btn.textContent?.trim() || '';
        if (r.text && text.includes(r.text.substring(0, 10))) {
          (btn as HTMLElement).click();
          return { success: true, clicked: text };
        }
      }
      return { success: false };
    }, result);
    
    if (clickResult.success) {
      await page.waitForTimeout(500);
      const title = await page.title();
      return { success: true, message: `✅ 已点击: ${result.text}\n📄 当前页面: ${title}` };
    }
    
    return { success: false, error: '无法点击按钮' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 页面滚动
export async function scrollPage(direction: 'up' | 'down' | 'top' | 'bottom' | number): Promise<any> {
  try {
    if (!page) return { success: false, error: '没有打开的页面' };
    
    let result: any;
    
    if (direction === 'up') {
      result = await page.evaluate(() => {
        window.scrollBy(0, -window.innerHeight * 0.8);
        return '已向上滚动';
      });
    } else if (direction === 'down') {
      result = await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 0.8);
        return '已向下滚动';
      });
    } else if (direction === 'top') {
      result = await page.evaluate(() => {
        window.scrollTo(0, 0);
        return '已滚动到顶部';
      });
    } else if (direction === 'bottom') {
      result = await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
        return '已滚动到底部';
      });
    } else if (typeof direction === 'number') {
      result = await page.evaluate((px) => {
        window.scrollBy(0, px);
        return `已滚动 ${px}px`;
      }, direction);
    }
    
    const title = await page.title();
    return { success: true, message: `✅ ${result}\n📄 ${title}` };
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

// ========== P2 功能 ==========

// 元素截图 - 对特定元素进行截图
export async function screenshotElement(selector: string): Promise<any> {
  try {
    if (!page) return { success: false, error: '没有打开的页面' };
    
    const element = await page.$(selector);
    if (!element) {
      return { success: false, error: `找不到元素: ${selector}` };
    }
    
    const screenshot = await element.screenshot({ encoding: 'base64' });
    return { 
      success: true, 
      screenshot, 
      message: `✅ 元素截图成功` 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 智能元素截图 - 根据描述找到元素并截图
export async function smartScreenshotElement(description: string): Promise<any> {
  try {
    if (!page) return { success: false, error: '没有打开的页面' };
    
    const result = await page.evaluate((desc) => {
      const keywords = desc.toLowerCase().split(/[,，]/);
      
      // 尝试查找常见元素
      const selectors = [
        'img', 'figure', '.card', '.product', '.article', 
        '[class*="image"]', '[class*="photo"]', '[class*="avatar"]'
      ];
      
      for (const sel of selectors) {
        const elements = document.querySelectorAll(sel);
        for (const el of elements) {
          const alt = el.getAttribute('alt') || '';
          const title = el.getAttribute('title') || '';
          const className = el.className || '';
          
          if (keywords.some(k => 
            alt.toLowerCase().includes(k) || 
            title.toLowerCase().includes(k) ||
            className.toLowerCase().includes(k)
          )) {
            return { found: true, selector: sel };
          }
        }
      }
      
      return { found: false };
    }, description);
    
    if (!result.found) {
      // 返回整页截图
      const screenshot = await page.screenshot({ encoding: 'base64' });
      return { success: true, screenshot, message: '✅ 页面截图成功（未找到指定元素，返回整页）' };
    }
    
    return screenshotElement(result.selector);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 提取数据 - 从页面提取结构化数据
export async function extractData(pattern: string): Promise<any> {
  try {
    if (!page) return { success: false, error: '没有打开的页面' };
    
    const result = await page.evaluate((pat) => {
      const pattern = pat.toLowerCase();
      const data: any[] = [];
      
      // 提取表格
      if (pattern.includes('表') || pattern.includes('table')) {
        const tables = document.querySelectorAll('table');
        for (const table of tables) {
          const rows = table.querySelectorAll('tr');
          const tableData: string[][] = [];
          for (const row of rows) {
            const cells = row.querySelectorAll('th, td');
            const rowData: string[] = [];
            for (const cell of cells) {
              rowData.push(cell.textContent?.trim() || '');
            }
            if (rowData.length > 0) tableData.push(rowData);
          }
          if (tableData.length > 0) data.push({ type: 'table', data: tableData });
        }
      }
      
      // 提取列表
      if (pattern.includes('列') || pattern.includes('list') || pattern.includes('商品') || pattern.includes('新闻')) {
        const lists = document.querySelectorAll('ul li, ol li, .item, .product, .news');
        for (const item of lists) {
          const title = item.querySelector('h1, h2, h3, h4, .title, a')?.textContent?.trim();
          const link = item.querySelector('a')?.getAttribute('href');
          const price = item.querySelector('[class*="price"]')?.textContent?.trim();
          if (title) {
            data.push({ type: 'item', title, link, price });
          }
        }
      }
      
      // 提取图片
      if (pattern.includes('图') || pattern.includes('image') || pattern.includes('photo')) {
        const images = document.querySelectorAll('img');
        for (const img of images.slice(0, 10)) {
          const src = img.getAttribute('src') || img.getAttribute('data-src');
          const alt = img.getAttribute('alt') || '';
          if (src) {
            data.push({ type: 'image', src, alt });
          }
        }
      }
      
      // 默认：提取所有链接
      if (data.length === 0) {
        const links = document.querySelectorAll('a[href]');
        for (const link of links.slice(0, 20)) {
          const href = link.getAttribute('href');
          const text = link.textContent?.trim();
          if (href && text && href.startsWith('http')) {
            data.push({ type: 'link', text: text.substring(0, 50), href });
          }
        }
      }
      
      return data;
    }, pattern);
    
    if (result.length === 0) {
      return { success: false, error: '未找到数据' };
    }
    
    // 格式化输出
    let message = `📊 提取到 ${result.length} 条数据:\n\n`;
    if (result[0].type === 'table' && result[0].data) {
      message += '📋 表格数据:\n';
      result[0].data.slice(0, 5).forEach((row: string[], i: number) => {
        message += `${i + 1}. ${row.join(' | ')}\n`;
      });
    } else if (result[0].type === 'item') {
      message += '📦 列表数据:\n';
      result.slice(0, 10).forEach((item: any, i: number) => {
        message += `${i + 1}. ${item.title}${item.price ? ` (${item.price})` : ''}\n`;
      });
    } else if (result[0].type === 'image') {
      message += '🖼️ 图片:\n';
      result.slice(0, 5).forEach((img: any, i: number) => {
        message += `${i + 1}. ${img.alt || '图片'}\n`;
      });
    }
    
    return { success: true, data: result, count: result.length, message };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 等待加载 - 智能等待元素加载
export async function waitForElement(selector: string, timeout: number = 10000): Promise<any> {
  try {
    if (!page) return { success: false, error: '没有打开的页面' };
    
    const element = await page.waitForSelector(selector, { timeout });
    if (!element) {
      return { success: false, error: `等待超时: ${selector}` };
    }
    
    const tag = await element.evaluate(el => el.tagName);
    const text = await element.evaluate(el => el.textContent?.trim().substring(0, 50));
    
    return { 
      success: true, 
      message: `✅ 元素已加载: <${tag}> ${text}`,
      selector 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ========== P3 功能 ==========

// 多标签页管理
let pages: Page[] = [];

export async function createNewTab(url: string): Promise<any> {
  try {
    const b = await getBrowser();
    const newPage = await b.newPage();
    pages.push(newPage);
    
    if (url) {
      await newPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const title = await newPage.title();
      return { success: true, message: `✅ 新标签页已创建: ${title}`, pageIndex: pages.length - 1 };
    }
    
    return { success: true, message: `✅ 新空白标签页已创建`, pageIndex: pages.length - 1 };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function switchToTab(index: number): Promise<any> {
  try {
    const b = await getBrowser();
    const allPages = b.contexts()[0]?.pages() || [];
    
    if (index < 0 || index >= allPages.length) {
      return { success: false, error: `标签页索引无效: ${index}` };
    }
    
    page = allPages[index];
    const title = await page.title();
    const url = page.url();
    
    return { success: true, message: `✅ 已切换到标签页 ${index + 1}: ${title}`, title, url };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function closeTab(index?: number): Promise<any> {
  try {
    const b = await getBrowser();
    const allPages = b.contexts()[0]?.pages() || [];
    
    if (index !== undefined) {
      if (index < 0 || index >= allPages.length) {
        return { success: false, error: `标签页索引无效` };
      }
      await allPages[index].close();
      return { success: true, message: `✅ 已关闭标签页 ${index + 1}` };
    }
    
    // 关闭当前页
    if (page) {
      await page.close();
      return { success: true, message: `✅ 已关闭当前标签页` };
    }
    
    return { success: false, error: '没有打开的页面' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listTabs(): Promise<any> {
  try {
    const b = await getBrowser();
    const allPages = b.contexts()[0]?.pages() || [];
    
    const tabs = await Promise.all(allPages.map(async (p, i) => ({
      index: i,
      title: await p.title(),
      url: p.url()
    })));
    
    return { 
      success: true, 
      count: tabs.length, 
      tabs,
      message: `📑 当前 ${tabs.length} 个标签页:\n${tabs.map((t, i) => `${i + 1}. ${t.title}`).join('\n')}`
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ========== 文档下载 ==========

// 下载文件
export async function downloadFile(url: string, filename?: string): Promise<any> {
  try {
    const b = await getBrowser();
    const downloadPath = `/Users/anhui/Downloads/${filename || url.split('/').pop() || 'download'}`;
    const downloadPage = await b.newPage();
    const cdp = await downloadPage.context().newCDPSession(downloadPage);
    await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: '/Users/anhui/Downloads' });
    await downloadPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await downloadPage.waitForTimeout(2000);
    await downloadPage.close();
    return { success: true, message: `✅ 文件已下载到: ${downloadPath}`, path: downloadPath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 智能下载文档
export async function smartDownloadDocument(message: string): Promise<any> {
  try {
    if (!page) return { success: false, error: '没有打开的页面' };
    const msg = message.toLowerCase();
    const result = await page.evaluate((m) => {
      const keywords = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', '下载', 'download'];
      const links = document.querySelectorAll('a[href]');
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.toLowerCase() || '';
        if (keywords.some(k => href.includes(k) || text.includes(k))) {
          let fullUrl = href;
          if (href.startsWith('//')) fullUrl = 'https:' + href;
          if (href.startsWith('/')) { try { fullUrl = window.location.origin + href; } catch (e) { continue; } }
          return { url: fullUrl, text: link.textContent?.trim(), filename: href.split('/').pop() };
        }
      }
      return null;
    }, msg);
    if (!result) return { success: false, error: '未找到可下载的文档链接' };
    return downloadFile(result.url, result.filename);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 页面另存为 PDF
export async function saveAsPdf(): Promise<any> {
  try {
    if (!page) return { success: false, error: '没有打开的页面' };
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    const filename = `page_${Date.now()}.pdf`;
    const filepath = `/Users/anhui/Downloads/${filename}`;
    const fs = await import('fs');
    fs.writeFileSync(filepath, Buffer.from(pdfBuffer));
    return { success: true, message: `✅ 页面已保存为 PDF: ${filename}`, path: filepath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
