import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const STORAGE_KEY = 'aquasphere_onboardingSeen';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  // visible: whether the modal is currently showing
  private visibleSubject = new BehaviorSubject<boolean>(false);
  readonly visible$ = this.visibleSubject.asObservable();

  // current step index (0..n-1)
  private stepSubject = new BehaviorSubject<number>(0);
  readonly step$ = this.stepSubject.asObservable();

  // seen flag persisted in localStorage (and mirrored via subject)
  private seenSubject = new BehaviorSubject<boolean>(this.readLocal());
  readonly seen$ = this.seenSubject.asObservable();

  constructor() {}

  private readLocal(): boolean {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'true';
    } catch (e) {
      return false;
    }
  }

  private writeLocal(val: boolean) {
    try {
      localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
    } catch (e) {
      // ignore
    }
  }

  getSeen(): boolean {
    return !!this.seenSubject.value;
  }

  setSeen(val: boolean) {
    this.writeLocal(!!val);
    this.seenSubject.next(!!val);
  }

  start() {
    if (this.getSeen()) return; // already seen
    this.stepSubject.next(0);
    this.visibleSubject.next(true);
  }

  next(totalSteps = 1) {
    const cur = this.stepSubject.value;
    const next = Math.min(totalSteps - 1, cur + 1);
    this.stepSubject.next(next);
  }

  prev() {
    const cur = this.stepSubject.value;
    const p = Math.max(0, cur - 1);
    this.stepSubject.next(p);
  }

  skip() {
    this.visibleSubject.next(false);
  }

  complete() {
    this.setSeen(true);
    this.visibleSubject.next(false);
  }
}

