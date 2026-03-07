/**
 * Programming Skills - 编程能力 v5
 * 
 * 更强大的问题解决能力！
 */

export function detectIntent(message: string): string | null {
  const msg = message.toLowerCase();
  
  // 自我认知
  const selfKw = ['你是谁', '你是什么', '你的名字', '你有哪些能力', '你会什么', '介绍一下自己', '自我认知'];
  for (const kw of selfKw) {
    if (msg.includes(kw)) return 'self.awareness';
  }
  
  // 自我诊断
  const diagKw = ['健康检查', '诊断', '状态如何', '运行状态', '检查一下', '系统状态', '自检'];
  for (const kw of diagKw) {
    if (msg.includes(kw)) return 'self.diagnose';
  }
  
  // 主动行为
  const proactiveKw = ['主动服务', '提醒我', '通知', '有什么新消息'];
  for (const kw of proactiveKw) {
    if (msg.includes(kw)) return 'self.proactive';
  }
  
  // 解决问题
  const solveKw = ['帮我写', '写一个', '计算', '处理', '找出', '去重', '排序', '过滤', '求和', '反转', '阶乘', '质数', '最大', '最小', '求和', '统计', '合并', '扁平化'];
  for (const kw of solveKw) {
    if (msg.includes(kw)) return 'code.solve';
  }
  
  // 执行代码
  if (msg.includes('运行') || msg.includes('执行') || msg.includes('跑')) return 'code.run';
  
  // 生成网页
  if (msg.includes('网页') || msg.includes('html') || msg.includes('页面')) return 'code.html';
  
  // 技术问答
  const tech = ['javascript', 'js', '数组', '对象', '函数', 'async', 'await', 'class', '怎么', '如何'];
  for (const kw of tech) {
    if (msg.includes(kw)) return 'code.qa';
  }
  
  return null;
}

export async function runCode(params: any): Promise<any> {
  let code = params.code;
  if (!code && params.message) {
    const match = params.message.match(/console\.log\([^)]+\)/);
    if (match) code = match[0];
  }
  if (!code) return { success: false, error: '没有代码' };
  
  const forbidden = ['require', 'import', 'process', 'global', 'eval', 'fetch'];
  for (const kw of forbidden) {
    if (code.includes(kw)) return { success: false, error: `禁止: ${kw}` };
  }
  
  const logs: string[] = [];
  const orig = console.log;
  console.log = (...a: any[]) => logs.push(a.join(' '));
  
  try { new Function(code)(); console.log = orig; return { success: true, output: logs.join('\n') || '完成' }; }
  catch (e: any) { console.log = orig; return { success: false, error: e.message }; }
}

export async function solveProblem(message: string): Promise<any> {
  const msg = message.toLowerCase();
  
  // 解析数字范围，如 "1-100" -> [1, 100]
  const rangeMatch = message.match(/(\d+)\s*[-~至到]\s*(\d+)/);
  let start = 1, end = 10;
  if (rangeMatch) {
    start = parseInt(rangeMatch[1]);
    end = parseInt(rangeMatch[2]);
  }
  
  // 更多问题覆盖！
  const problems: Record<string, { code: string }> = {
    '偶数': { code: `const nums=[];for(let i=${start};i<=${end};i++)nums.push(i);const sum=nums.filter(n=>n%2===0).reduce((a,b)=>a+b,0);console.log('${start}-${end}偶数:',nums.filter(n=>n%2===0));console.log('和:',sum);` },
    '奇数': { code: `const nums=[];for(let i=${start};i<=${end};i++)nums.push(i);const sum=nums.filter(n=>n%2!==0).reduce((a,b)=>a+b,0);console.log('${start}-${end}奇数:',nums.filter(n=>n%2!==0));console.log('和:',sum);` },
    '求和': { code: `const nums=[];for(let i=${start};i<=${end};i++)nums.push(i);console.log('${start}-${end}和:',nums.reduce((a,b)=>a+b,0));` },
    '去重': { code: `const arr=[1,2,2,3,3,3,4,5,5];console.log('原:',arr);console.log('去重:',[...new Set(arr)]);` },
    '排序': { code: `const arr=[5,2,8,1,9,3];console.log('前:',arr);arr.sort((a,b)=>a-b);console.log('后:',arr);` },
    '反转': { code: `const str='hello';console.log('原:',str);console.log('反转:',str.split('').reverse().join(''));` },
    '阶乘': { code: `function f(n){return n<=1?1:n*f(n-1);}console.log('5! =',f(5));console.log('6! =',f(6));` },
    '质数': { code: `function p(n){if(n<2)return false;for(let i=2;i*i<=n;i++)if(n%i===0)return false;return true;}console.log('7:',p(7));console.log('8:',p(8));` },
    '最大': { code: `const arr=[3,1,9,5,2];console.log('最大:',Math.max(...arr));console.log('最小:',Math.min(...arr));` },
    '统计': { code: `const arr=[1,2,2,3,3,3];const cnt={};arr.forEach(x=>cnt[x]=(cnt[x]||0)+1);console.log('统计:',cnt);` },
    '合并': { code: `const a=[1,2],b=[3,4];console.log('合并:',[...a,...b]);` },
    '扁平化': { code: `const arr=[[1,2],[3,4],[5]];console.log('原:',arr);console.log('扁平:',arr.flat());` },
    '去空格': { code: `const str='  hello world  ';console.log('原:',str);console.log('去空格:',str.trim());` },
    '大小写': { code: `const str='Hello World';console.log('大:',str.toUpperCase());console.log('小:',str.toLowerCase());` },
    '模板': { code: `const name='Tom',age=25;console.log(\`我叫\${name}，今年\${age}岁\`);` },
    '深拷贝': { code: `const obj={a:{b:1}};const copy=JSON.parse(JSON.stringify(obj));obj.a.b=999;console.log('原:',obj);console.log('拷贝:',copy);` },
    '防抖': { code: `function debounce(fn,ms){let t;return function(...a){clearTimeout(t);t=setTimeout(()=>fn(...a),ms);}}` },
    '节流': { code: `function throttle(fn,ms){let last=0;return function(...a){const now=Date.now();if(now-last>=ms){last=now;fn(...a);}}}` },
    '随机': { code: `console.log('随机1-100:',Math.floor(Math.random()*100)+1);console.log('随机数组:',[...Array(5)].map(()=>Math.floor(Math.random()*100)));` },
    '时间': { code: `console.log('现在:',new Date().toLocaleString());console.log('时间戳:',Date.now());` },
  };
  
  for (const [key, sol] of Object.entries(problems)) {
    if (msg.includes(key)) {
      const result = await runCode({ code: sol.code });
      return { problem: key, code: sol.code, output: result.output || result.error, success: result.success };
    }
  }
  
  return { problem: '未知', hint: '可以问：偶数、去重、排序、阶乘、质数、最大、最小、求和、统计、合并、扁平化等' };
}

export async function generateCode(params: any): Promise<any> {
  const task = (params.task || params.message || '').toLowerCase();
  const templates: Record<string, string> = {
    'debounce': `function debounce(f,d){let t;return function(...a){clearTimeout(t);t=setTimeout(()=>f(...a),d);}}`,
    'throttle': `function throttle(f,d){let l=0;return function(...a){const n=Date.now();if(n-l>=d){l=n;f(...a);}}}`,
    'deepclone': `function deepClone(o){return JSON.parse(JSON.stringify(o));}`,
    'fetch': `async function get(url){const r=await fetch(url);return await r.json();}`,
    'promise': `new Promise((ok,err)=>{setTimeout(()=>ok('done'),1000)})`,
  };
  for (const [k, c] of Object.entries(templates)) {
    if (task.includes(k)) return { name: k, code: c };
  }
  return { name: '函数', code: 'function f(data){return data;}' };
}

export async function techQA(message: string): Promise<any> {
  const msg = message.toLowerCase();
  const answers: Record<string, { a: string; c: string }> = {
    '数组': { a: '数组操作：', c: `[1,2,3].map(x=>x*2)\n[1,2,3].filter(x=>x>1)\n[1,2,3].reduce((a,b)=>a+b,0)` },
    'async': { a: 'async/await：', c: `async function f(){const d=await fetch(url);return d;}` },
    '对象': { a: '对象操作：', c: `Object.keys(obj)\nObject.values(obj)\n{...obj,n}` },
    'class': { a: 'Class写法：', c: `class A{constructor(){}m(){}}` },
  };
  for (const [k, ans] of Object.entries(answers)) {
    if (msg.includes(k)) return ans;
  }
  return { a: '可以问：数组、async、对象、class、防抖等' };
}

export async function generateHtml(message: string): Promise<any> {
  const msg = message.toLowerCase();
  
  // 根据需求生成简单网页
  let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Generated Page</title></head><body>';
  
  if (msg.includes('欢迎') || msg.includes('首页')) {
    html += `<h1>欢迎访问</h1><p>这是一个自动生成的网页</p><button onclick="alert('Hello!')">点击</button>`;
  } else if (msg.includes('表格') || msg.includes('列表')) {
    html += `<h1>数据表格</h1><table border="1" cellpadding="10"><tr><th>名称</th><th>值</th></tr><tr><td>项目A</td><td>100</td></tr><tr><td>项目B</td><td>200</td></tr><tr><td>项目C</td><td>300</td></tr></table>`;
  } else if (msg.includes('表单') || msg.includes('登录')) {
    html += `<h1>登录表单</h1><form><input type="text" placeholder="用户名"/><br/><input type="password" placeholder="密码"/><br/><button>登录</button></form>`;
  } else if (msg.includes('计时器') || msg.includes('时钟')) {
    html += `<h1>实时时钟</h1><div id="time" style="font-size:48px;font-family:monospace;"></div><script>setInterval(()=>{document.getElementById('time').innerText=new Date().toLocaleString()},1000)</script>`;
  } else {
    // 默认简单页面
    html += `<h1>Hello World</h1><p>你说的是：${message}</p><p>可以试试说：欢迎页、表格、表单、计时器</p>`;
  }
  
  html += '</body></html>';
  
  return { type: 'html', content: html };
}
