import { fakeAsync, TestBed, flush } from '@angular/core/testing';
import { CanvasService } from './canvas.service';
import { ParticleService } from './particle.service';

describe('ParticleService', () => {
  let service: ParticleService;
  let canvasServiceMock: jasmine.SpyObj<CanvasService>;

  beforeEach(() => {
    canvasServiceMock = jasmine.createSpyObj<CanvasService>('CanvasService', ['getRandomWaterColor']);
    canvasServiceMock.getRandomWaterColor.and.returnValue('rgba(1, 2, 3, 0.4)');

    TestBed.configureTestingModule({
      providers: [
        ParticleService,
        { provide: CanvasService, useValue: canvasServiceMock }
      ]
    });

    service = TestBed.inject(ParticleService);
  });

  it('should initialize the requested number of particles', () => {
    service.initParticles(5, 100, 100);
    expect(service.getParticles().length).toBe(5);
  });

  it('should add feed particles after the scheduled delay', fakeAsync(() => {
    service.addFeedBurst(2, 10, 20, 5);
    flush();
    expect(service.getParticles().length).toBe(2);
  }));

  it('should spawn cleaning particles directly', () => {
    service.spawnCleaningParticles(50, 50, 3);
    expect(service.getParticles().length).toBe(3);
    expect(service.getParticles().every(p => p.life === 300)).toBeTrue();
  });

  it('should remove feed particles during cleaning and repopulate background particles', () => {
    service.setParticles([
      { x: 1, y: 1, size: 1, speedX: 0, speedY: 0, opacity: 1, color: 'x', isFeed: true },
      { x: 2, y: 2, size: 1, speedX: 0, speedY: 0, opacity: 1, color: 'y' }
    ]);

    service.cleanAndPopulate(8, 100, 100);

    expect(service.getParticles().some(p => p.isFeed)).toBeFalse();
    expect(service.getParticles().length).toBeGreaterThan(0);
  });
});