import { Component } from '@angular/core';
import { AquariumComponent } from './aquarium/aquarium.component';

@Component({
  selector: 'app-root',
  imports: [AquariumComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'AquaSphere';
}
