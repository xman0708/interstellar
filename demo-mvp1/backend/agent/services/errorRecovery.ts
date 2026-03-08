/**
 * 错误自愈服务
 * 识别失败原因，自动调整策略重试
 */

interface ErrorContext {
  action: string;
  params: any;
  error: string;
  attempt: number;
}

interface RecoveryStrategy {
  name: string;
  applies: (error: string, context: ErrorContext) => boolean;
  newParams: (context: ErrorContext) => any;
  description: string;
}

// 错误类型识别
function classifyError(error: string): string {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('timeout') || errorLower.includes('超时')) {
    return 'timeout';
  }
  if (errorLower.includes('not found') || errorLower.includes('找不到') || errorLower.includes('不存在')) {
    return 'not_found';
  }
  if (errorLower.includes('permission') || errorLower.includes('权限')) {
    return 'permission';
  }
  if (errorLower.includes('network') || errorLower.includes('网络')) {
    return 'network';
  }
  if (errorLower.includes('click') || errorLower.includes('点击')) {
    return 'click_failed';
  }
  if (errorLower.includes('fill') || errorLower.includes('填写') || errorLower.includes('输入')) {
    return 'fill_failed';
  }
  
  return 'unknown';
}

// 恢复策略
const RECOVERY_STRATEGIES: RecoveryStrategy[] = [
  {
    name: 'retry_with_screenshot',
    applies: (error) => error.includes('timeout') || error.includes('超时'),
    newParams: (ctx) => ({ ...ctx.params, timeout: 60000 }),
    description: '增加超时时间后重试'
  },
  {
    name: 'try_alternative_selector',
    applies: (error) => error.includes('not found') || error.includes('找不到'),
    newParams: (ctx) => ({ ...ctx.params, selector: getAlternativeSelector(ctx.params.selector) }),
    description: '尝试备选选择器'
  },
  {
    name: 'scroll_and_retry',
    applies: (error) => error.includes('not found') || error.includes('找不到'),
    newParams: (ctx) => ({ ...ctx.params, scrollFirst: true }),
    description: '滚动后重试'
  },
  {
    name: 'use_keyboard',
    applies: (error) => error.includes('click') || error.includes('点击'),
    newParams: (ctx) => ({ ...ctx.params, useKeyboard: true }),
    description: '使用键盘替代点击'
  },
  {
    name: 'wait_and_retry',
    applies: (error) => error.includes('timeout') || error.includes('加载'),
    newParams: (ctx) => ({ ...ctx.params, waitBefore: 2000 }),
    description: '等待后重试'
  },
  {
    name: 'fallback_to_url',
    applies: (error) => error.includes('not found') || error.includes('找不到'),
    newParams: (ctx) => ({ ...ctx.params, useUrlDirect: true }),
    description: '直接使用URL'
  },
];

// 获取备选选择器
function getAlternativeSelector(selector?: string): string[] {
  if (!selector) return ['button', 'a', 'input[type="submit"]'];
  
  const alternatives: Record<string, string[]> = {
    'button': ['button[type="submit"]', 'a.btn', '.button', 'input[type="submit"]'],
    'input': ['input[type="text"]', 'textarea', 'input[type="email"]'],
    'form': ['form', '.form', '[role="form"]'],
  };
  
  for (const [key, alts] of Object.entries(alternatives)) {
    if (selector.includes(key)) {
      return alts;
    }
  }
  
  return [selector];  // 返回原选择器
}

// 错误恢复决策
export function decideRecovery(context: ErrorContext): {
  shouldRetry: boolean;
  strategy: RecoveryStrategy | null;
  maxRetries: number;
} {
  const errorType = classifyError(context.error);
  const maxRetries = 3;
  
  // 超过最大重试次数，不再重试
  if (context.attempt >= maxRetries) {
    return { shouldRetry: false, strategy: null, maxRetries };
  }
  
  // 查找适用的恢复策略
  for (const strategy of RECOVERY_STRATEGIES) {
    if (strategy.applies(context.error, context)) {
      return {
        shouldRetry: true,
        strategy,
        maxRetries
      };
    }
  }
  
  // 未知错误，默认重试一次
  return {
    shouldRetry: context.attempt < 2,
    strategy: null,
    maxRetries
  };
}

// 执行恢复
export async function recoverWithStrategy(
  context: ErrorContext,
  executeAction: (action: string, params: any) => Promise<any>
): Promise<{ success: boolean; result?: any; error?: string }> {
  const { shouldRetry, strategy, maxRetries } = decideRecovery(context);
  
  if (!shouldRetry) {
    return { success: false, error: `重试${maxRetries}次后仍失败: ${context.error}` };
  }
  
  console.log(`[Recovery] Applying strategy: ${strategy?.name || 'default'}, attempt: ${context.attempt + 1}`);
  
  // 应用策略获取新参数
  const newParams = strategy ? strategy.newParams(context) : context.params;
  
  try {
    const result = await executeAction(context.action, newParams);
    
    if (result.success) {
      console.log('[Recovery] Success after recovery!');
      return { success: true, result };
    }
    
    // 再次失败，递归重试
    return recoverWithStrategy(
      {
        ...context,
        attempt: context.attempt + 1,
        error: result.error || 'unknown'
      },
      executeAction
    );
  } catch (e: any) {
    // 异常情况下也尝试恢复
    if (context.attempt < maxRetries) {
      return recoverWithStrategy(
        {
          ...context,
          attempt: context.attempt + 1,
          error: e.message
        },
        executeAction
      );
    }
    
    return { success: false, error: e.message };
  }
}

// 带自愈的执行包装
export function withRecovery(
  action: string,
  params: any,
  executeAction: (action: string, params: any) => Promise<any>
): Promise<any> {
  const context: ErrorContext = {
    action,
    params,
    error: '',
    attempt: 0
  };
  
  return executeAction(action, params)
    .then(result => {
      if (!result.success && result.error) {
        context.error = result.error;
        return recoverWithStrategy(context, executeAction);
      }
      return { success: true, result };
    })
    .catch(error => {
      context.error = error.message;
      return recoverWithStrategy(context, executeAction);
    });
}

export default { decideRecovery, recoverWithStrategy, withRecovery };
