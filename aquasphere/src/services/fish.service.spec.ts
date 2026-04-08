import { TestBed } from '@angular/core/testing';
import { FishService } from './fish.service';

describe('FishService', () => {
  let service: FishService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FishService);
    spyOn(Math, 'random').and.returnValue(0.5);
  });

  it('should create the starter fish set', () => {
    service.createStarterFish();
    expect(service.fish.length).toBe(3);
    expect(service.fish.map(fish => fish.name)).toEqual(['Goldie', 'Blinky', 'Ruby']);
  });

  it('should add a requested fish type at the provided coordinates', () => {
    service.addFish('goldfish', 120, 140, 800, 600);
    expect(service.fish.length).toBe(1);
    expect(service.fish[0].type).toBe('goldfish');
    expect(service.fish[0].x).toBe(120);
    expect(service.fish[0].y).toBe(140);
  });

  it('should ignore unknown fish types', () => {
    service.addFish('unknown-type');
    expect(service.fish.length).toBe(0);
  });

  it('should update fish movement and increase hunger', () => {
    const fish = {
      id: 'fish-1',
      type: 'goldfish',
      x: 10,
      y: 20,
      speedX: -2,
      speedY: 0,
      direction: 0,
      isFeeding: false,
      hunger: 10,
      lastFeedTime: Date.now() - 6000,
      size: 25,
      color: '#FFD700'
    };

    service.updateFish([fish as any], [], service.fishTypes, 800, 600, 1, []);

    expect(fish.hunger).toBeGreaterThan(10);
    expect(fish.x).toBeGreaterThanOrEqual(25 * 1.5);
    expect(fish.speedX).toBeGreaterThan(0);
  });
});