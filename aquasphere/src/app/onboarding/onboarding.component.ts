import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingService } from '../../services/onboarding.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css']
})
export class OnboardingComponent implements OnInit {
  steps = [
    { title: 'Willkommen', text: 'Willkommen bei AquaSphere! Kurze Tour durch die wichtigsten Funktionen.' },
    { title: 'Füttern', text: 'Drücke den 🐟 Button um Futter zu geben. Füttern kostet 2 Punkte.' },
    { title: 'Reinigen', text: 'Aktiviere die Bürste 🧽 um Flecken zu entfernen. Putzerfische entfernen sichtbare Flecken.' },
    { title: 'Fisch-Info', text: 'Tippe einen Fisch an, um Infos zu sehen oder seinen Namen zu ändern.' },
    { title: 'Zeit & Licht', text: 'Die Aquarium-Zeit läuft automatisch. Licht-Button gibt eine kurzfristige Aufhellung.' }
  ];

  visible = false;
  step = 0;

  constructor(@Inject(OnboardingService) private onboarding: OnboardingService) {}

  ngOnInit(): void {
    this.onboarding.visible$.subscribe((v: boolean) => this.visible = v);
    this.onboarding.step$.subscribe((s: number) => this.step = s);
  }

  next() {
    if (this.step < this.steps.length - 1) this.onboarding.next(this.steps.length);
    else this.finish();
  }

  prev() { if (this.step > 0) this.onboarding.prev(); }

  skip() { this.onboarding.skip(); }

  finish() { this.onboarding.complete(); }
}
