/**
 * Browser Skill - 网络访问
 * 支持：搜索、打开网页
 */

export async function browse(params: { url: string }): Promise<any> {
  const url = params.url;
  
  if (!url) {
    return { success: false, error: 'URL is required' };
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
    
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 3000);
    
    return { success: true, url, title, content: text };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 搜索 - 使用百度
export async function searchWeb(query: string): Promise<any> {
  if (!query) {
    return { success: false, error: 'Query is required' };
  }
  
  try {
    // 使用百度搜索
    const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    const html = await response.text();
    
    // 提取百度搜索结果
    const results: any[] = [];
    // 百度结果格式: <h3 class="c-title"><a href="...">标题</a></h3>
    const titleMatches = html.matchAll(/<h3[^>]*class="c-title"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<\/h3>/g);
    
    let count = 0;
    for (const match of titleMatches) {
      if (count >= 5) break;
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      let url = match[1] || '';
      // 百度URL解码
      url = url.replace(/&amp;/g, '&');
      if (title && url) {
        results.push({ title, url: url.substring(0, 100), snippet: '' });
        count++;
      }
    }
    
    return { success: true, query, results, count: results.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
