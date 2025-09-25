import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AquariumComponent } from './aquarium/aquarium.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AquariumComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'AquaSphere';
}
