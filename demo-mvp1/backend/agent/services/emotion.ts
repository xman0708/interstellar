/**
 * Emotion System - 情绪系统
 * 
 * 模拟生命体的情绪变化
 */

export type Emotion = 'happy' | 'neutral' | 'thinking' | 'excited' | 'sleepy';

interface EmotionState {
  emotion: Emotion;
  energy: number;     // 0-100
  lastUpdate: string;
}

const EMOTION_THRESHOLDS = {
  excited: { minEnergy: 90 },
  happy: { minEnergy: 70 },
  neutral: { minEnergy: 30 },
  sleepy: { minEnergy: 0 },
};

let currentState: EmotionState = {
  emotion: 'neutral',
  energy: 80,
  lastUpdate: new Date().toISOString(),
};

/**
 * 获取当前情绪
 */
export function getEmotion(): EmotionState {
  // 根据能量值更新情绪
  if (currentState.energy >= 90) currentState.emotion = 'excited';
  else if (currentState.energy >= 70) currentState.emotion = 'happy';
  else if (currentState.energy >= 30) currentState.emotion = 'neutral';
  else currentState.emotion = 'sleepy';
  
  return { ...currentState };
}

/**
 * 情绪变化
 */
export function changeEmotion(delta: number): EmotionState {
  currentState.energy = Math.max(0, Math.min(100, currentState.energy + delta));
  currentState.lastUpdate = new Date().toISOString();
  
  return getEmotion();
}

/**
 * 交互影响情绪
 */
export function onInteraction(type: 'positive' | 'negative' | 'neutral'): EmotionState {
  const changes = {
    positive: 5,
    negative: -10,
    neutral: 0,
  };
  
  return changeEmotion(changes[type]);
}

/**
 * 随时间自然变化
 */
export function tick(): EmotionState {
  // 每分钟自然消耗一点能量
  changeEmotion(-1);
  return getEmotion();
}

/**
 * 情绪对应的响应
 */
export function getGreeting(): string {
  const emotion = getEmotion();
  
  const greetings: Record<Emotion, string[]> = {
    excited: ['哇！有什么有趣的吗？', '我准备好了！', '有新挑战吗？'],
    happy: ['你好！有什么可以帮你的？', '今天状态不错！', '需要我帮忙吗？'],
    neutral: ['你好。', '有什么需求？', '随时待命。'],
    sleepy: ['（打哈欠）...', '有点困了。', '让我清醒一下...'],
  };
  
  const options = greetings[emotion.emotion];
  return options[Math.floor(Math.random() * options.length)];
}
