export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'feeding' | 'time' | 'fish' | 'cleaning' | 'points';
  requirement: number; // target value to unlock
  reward?: string; // e.g., 'theme:tropical'
  unlocked: boolean;
  unlockedAt?: number; // timestamp
  progress: number; // current value towards requirement
}

export interface AchievementProgress {
  totalFeedCount: number;
  totalPlayTime: number; // milliseconds
  totalFishPlaced: number;
  totalCleaningActions: number;
  totalPointsEarned: number;
  maxFishAlive: number;
  longestSessionTime: number;
}
