import { TestBed } from '@angular/core/testing';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  let service: OnboardingService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(OnboardingService);
  });

  it('should start with seen set to false', () => {
    expect(service.getSeen()).toBeFalse();
  });

  it('should make the onboarding visible when start is called', () => {
    const emissions: boolean[] = [];
    const subscription = service.visible$.subscribe(value => emissions.push(value));
    service.start();
    subscription.unsubscribe();

    expect(emissions).toContain(true);
  });

  it('should persist the seen flag when completed', () => {
    service.complete();
    expect(service.getSeen()).toBeTrue();
    expect(localStorage.getItem('aquasphere_onboardingSeen')).toBe('true');
  });

  it('should hide the onboarding when skipped', () => {
    const emissions: boolean[] = [];
    const subscription = service.visible$.subscribe(value => emissions.push(value));
    service.start();
    service.skip();
    subscription.unsubscribe();

    expect(emissions[0]).toBeFalse();
    expect(emissions).toContain(true);
    expect(emissions[emissions.length - 1]).toBeFalse();
  });
});