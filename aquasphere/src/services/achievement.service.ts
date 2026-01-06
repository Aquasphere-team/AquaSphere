import { Injectable } from '@angular/core';
import { Achievement, AchievementProgress } from '../models/achievement.model';

@Injectable({ providedIn: 'root' })
export class AchievementService {
  private achievements: Achievement[] = [
    // Feeding Achievements
    {
      id: 'feed_1',
      name: 'Erste Fütterung',
      description: 'Füttere deine Fische zum ersten Mal',
      icon: '🐟',
      category: 'feeding',
      requirement: 1,
      unlocked: false,
      progress: 0
    },
    {
      id: 'feed_10',
      name: 'Fleißiger Fütterer',
      description: 'Füttere deine Fische 10 Mal',
      icon: '🍽️',
      category: 'feeding',
      requirement: 10,
      reward: 'theme:tropical',
      unlocked: false,
      progress: 0
    },
    {
      id: 'feed_50',
      name: 'Futter-Meister',
      description: 'Füttere deine Fische 50 Mal',
      icon: '🌟',
      category: 'feeding',
      requirement: 50,
      unlocked: false,
      progress: 0
    },
    {
      id: 'feed_100',
      name: 'Futter-Legende',
      description: 'Füttere deine Fische 100 Mal',
      icon: '👑',
      category: 'feeding',
      requirement: 100,
      reward: 'theme:sunset',
      unlocked: false,
      progress: 0
    },

    // Time Achievements
    {
      id: 'time_1h',
      name: 'Erste Stunde',
      description: 'Spiele 1 Stunde lang',
      icon: '⏰',
      category: 'time',
      requirement: 60 * 60 * 1000, // 1 hour in ms
      unlocked: false,
      progress: 0
    },
    {
      id: 'time_24h',
      name: 'Ein Tag im Aquarium',
      description: 'Spiele 24 Stunden lang (Aquarium-Zeit)',
      icon: '🌍',
      category: 'time',
      requirement: 24 * 60 * 60 * 1000, // 24 hours in ms
      reward: 'theme:deep',
      unlocked: false,
      progress: 0
    },

    // Fish Achievements
    {
      id: 'fish_5',
      name: 'Kleine Sammlung',
      description: 'Platziere 5 Fische',
      icon: '🐠',
      category: 'fish',
      requirement: 5,
      unlocked: false,
      progress: 0
    },
    {
      id: 'fish_20',
      name: 'Große Familie',
      description: 'Platziere 20 Fische',
      icon: '🐟',
      category: 'fish',
      requirement: 20,
      unlocked: false,
      progress: 0
    },

    // Cleaning Achievements
    {
      id: 'clean_10',
      name: 'Sauberkeitsfanatiker',
      description: 'Reinige dein Aquarium 10 Mal',
      icon: '🧽',
      category: 'cleaning',
      requirement: 10,
      unlocked: false,
      progress: 0
    },

    // Points Achievements
    {
      id: 'points_1000',
      name: 'Reicher Aquarianer',
      description: 'Sammle 1000 Punkte',
      icon: '💰',
      category: 'points',
      requirement: 1000,
      unlocked: false,
      progress: 0
    },
    {
      id: 'points_5000',
      name: 'Punkte-Magnat',
      description: 'Sammle 5000 Punkte',
      icon: '💎',
      category: 'points',
      requirement: 5000,
      unlocked: false,
      progress: 0
    }
  ];

  private progress: AchievementProgress = {
    totalFeedCount: 0,
    totalPlayTime: 0,
    totalFishPlaced: 0,
    totalCleaningActions: 0,
    totalPointsEarned: 0,
    maxFishAlive: 0,
    longestSessionTime: 0
  };

  private newlyUnlockedAchievements: Achievement[] = [];

  getAchievements(): Achievement[] {
    return [...this.achievements];
  }

  getProgress(): AchievementProgress {
    return { ...this.progress };
  }

  getNewlyUnlocked(): Achievement[] {
    const result = [...this.newlyUnlockedAchievements];
    this.newlyUnlockedAchievements = [];
    return result;
  }

  // Update progress and check for unlocks
  updateProgress(type: keyof AchievementProgress, value: number): Achievement[] {
    this.progress[type] = value;

    const unlocked: Achievement[] = [];

    this.achievements.forEach(achievement => {
      if (achievement.unlocked) return;

      // Update progress based on category
      switch (achievement.category) {
        case 'feeding':
          achievement.progress = this.progress.totalFeedCount;
          break;
        case 'time':
          achievement.progress = this.progress.totalPlayTime;
          break;
        case 'fish':
          achievement.progress = this.progress.totalFishPlaced;
          break;
        case 'cleaning':
          achievement.progress = this.progress.totalCleaningActions;
          break;
        case 'points':
          achievement.progress = this.progress.totalPointsEarned;
          break;
      }

      // Check if unlocked
      if (achievement.progress >= achievement.requirement) {
        achievement.unlocked = true;
        achievement.unlockedAt = Date.now();
        unlocked.push(achievement);
        this.newlyUnlockedAchievements.push(achievement);
        console.log(`🏆 Achievement unlocked: ${achievement.name}`);
      }
    });

    return unlocked;
  }

  // Increment specific counters
  incrementFeedCount(): Achievement[] {
    return this.updateProgress('totalFeedCount', this.progress.totalFeedCount + 1);
  }

  incrementFishPlaced(): Achievement[] {
    return this.updateProgress('totalFishPlaced', this.progress.totalFishPlaced + 1);
  }

  incrementCleaningActions(): Achievement[] {
    return this.updateProgress('totalCleaningActions', this.progress.totalCleaningActions + 1);
  }

  updatePlayTime(milliseconds: number): Achievement[] {
    return this.updateProgress('totalPlayTime', milliseconds);
  }

  updateTotalPoints(points: number): Achievement[] {
    if (points > this.progress.totalPointsEarned) {
      return this.updateProgress('totalPointsEarned', points);
    }
    return [];
  }

  // Get unlocked themes
  getUnlockedThemes(): string[] {
    const themes = ['classic']; // classic is always unlocked
    this.achievements.forEach(achievement => {
      if (achievement.unlocked && achievement.reward?.startsWith('theme:')) {
        const themeName = achievement.reward.split(':')[1];
        themes.push(themeName);
      }
    });
    return themes;
  }

  // Check if a theme is unlocked
  isThemeUnlocked(theme: string): boolean {
    if (theme === 'classic') return true;
    return this.getUnlockedThemes().includes(theme);
  }

  // Load state from saved data
  loadState(data: { achievements?: Achievement[]; progress?: AchievementProgress }): void {
    if (data.achievements) {
      // Merge saved achievements with current definitions
      data.achievements.forEach(saved => {
        const achievement = this.achievements.find(a => a.id === saved.id);
        if (achievement) {
          achievement.unlocked = saved.unlocked;
          achievement.unlockedAt = saved.unlockedAt;
          achievement.progress = saved.progress;
        }
      });
    }

    if (data.progress) {
      this.progress = { ...data.progress };
    }
  }

  // Get state for saving
  getState() {
    return {
      achievements: this.achievements.map(a => ({
        id: a.id,
        unlocked: a.unlocked,
        unlockedAt: a.unlockedAt,
        progress: a.progress
      })),
      progress: { ...this.progress }
    };
  }

  // Get achievement by ID
  getAchievement(id: string): Achievement | undefined {
    return this.achievements.find(a => a.id === id);
  }

  // Get achievements by reward type
  getAchievementsByReward(rewardType: string): Achievement[] {
    return this.achievements.filter(a => a.reward?.startsWith(rewardType));
  }
}
