import { TestBed } from '@angular/core/testing';
import { AchievementService } from './achievement.service';

describe('AchievementService', () => {
  let service: AchievementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AchievementService);
  });

  it('should expose all defined achievements', () => {
    expect(service.getAchievements().length).toBe(11);
  });

  it('should unlock the first feeding achievement after one feed', () => {
    const unlocked = service.incrementFeedCount();
    expect(unlocked.some(achievement => achievement.id === 'feed_1')).toBeTrue();
    expect(service.getAchievement('feed_1')?.unlocked).toBeTrue();
  });

  it('should unlock the one-hour achievement after enough play time', () => {
    const unlocked = service.updatePlayTime(60 * 60 * 1000);
    expect(unlocked.some(achievement => achievement.id === 'time_1h')).toBeTrue();
    expect(service.getAchievement('time_1h')?.unlocked).toBeTrue();
  });

  it('should expose unlocked reward themes after the reward achievement unlocks', () => {
    service.incrementFeedCount();
    for (let i = 0; i < 9; i++) {
      service.incrementFeedCount();
    }

    expect(service.getAchievement('feed_10')?.unlocked).toBeTrue();
    expect(service.getUnlockedThemes()).toContain('classic');
    expect(service.getUnlockedThemes()).toContain('tropical');
  });
});