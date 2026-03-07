/**
 * User Profile - 用户画像系统
 * 
 * 学习用户偏好，提供个性化服务
 */

import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_PATH = path.join(__dirname, '../../../workspace');
const PROFILE_FILE = path.join(WORKSPACE_PATH, 'profile.json');

export interface UserProfile {
  name: string;
  preferences: {
    theme?: 'light' | 'dark';
    language?: 'zh' | 'en';
    notifications?: boolean;
  };
  history: {
    lastSession?: string;
    lastActive?: string;
    commandCount?: number;
  };
  skills: {
    used: string[];
    favorite?: string;
  };
}

// 默认画像
const defaultProfile: UserProfile = {
  name: 'User',
  preferences: {
    theme: 'light',
    language: 'zh',
    notifications: true,
  },
  history: {
    commandCount: 0,
  },
  skills: {
    used: [],
  },
};

/**
 * 加载用户画像
 */
export function loadProfile(): UserProfile {
  if (fs.existsSync(PROFILE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf-8'));
    } catch {
      return { ...defaultProfile };
    }
  }
  return { ...defaultProfile };
}

/**
 * 保存用户画像
 */
export function saveProfile(profile: UserProfile): void {
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(profile, null, 2));
}

/**
 * 更新用户画像
 */
export function updateProfile(updates: Partial<UserProfile>): UserProfile {
  const profile = loadProfile();
  const updated = { ...profile, ...updates };
  saveProfile(updated);
  return updated;
}

/**
 * 记录技能使用
 */
export function recordSkillUsage(skillName: string): void {
  const profile = loadProfile();
  profile.history.commandCount = (profile.history.commandCount || 0) + 1;
  
  if (!profile.skills.used.includes(skillName)) {
    profile.skills.used.push(skillName);
  }
  
  profile.history.lastActive = new Date().toISOString();
  saveProfile(profile);
}

/**
 * 获取用户统计
 */
export function getUserStats(): any {
  const profile = loadProfile();
  return {
    totalCommands: profile?.history?.commandCount || 0,
    skillsUsed: profile?.skills?.used?.length || 0,
    lastActive: profile?.history?.lastActive || 'never',
    favoriteSkill: profile?.skills?.used?.[0] || 'none',
  };
}
