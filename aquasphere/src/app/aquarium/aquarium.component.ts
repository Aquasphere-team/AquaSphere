import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-aquarium',
  imports: [],
  templateUrl: './aquarium.component.html',
  styleUrl: './aquarium.component.css'
})
export class AquariumComponent implements OnInit, OnDestroy {
  @ViewChild('aquariumCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private ctx!: CanvasRenderingContext2D;
  private particles: any[] = [];
  private waveOffset = 0;
  private lightIntensity = 1;
  private animationId?: number;
  private isRunning = true;

  ngOnInit(): void {
    this.initializeAquarium();
    console.log('🐠 AquaSphere Angular gestartet!');
  }

  ngOnDestroy(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private initializeAquarium(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    
    this.initializeCanvas();
    this.createWaterParticles();
    this.animate();
  }

  private initializeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = 800;
    canvas.height = 600;
    
    // Responsive anpassen
    window.addEventListener('resize', () => {
      const container = canvas.parentElement!;
      const rect = container.getBoundingClientRect();
      canvas.width = Math.min(rect.width, 800);
      canvas.height = Math.min(rect.height, 600);
    });
  }

  private createWaterParticles(): void {
    this.particles = [];
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.6 + 0.2,
        color: this.getRandomWaterColor()
      });
    }
  }

  private getRandomWaterColor(): string {
    const colors = [
      'rgba(135, 206, 235, 0.4)',  // Sky blue
      'rgba(173, 216, 230, 0.4)',  // Light blue
      'rgba(176, 224, 230, 0.4)',  // Powder blue
      'rgba(70, 130, 180, 0.4)',   // Steel blue
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private animate(): void {
    if (!this.isRunning) return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Animationen zeichnen
    this.drawWaterBackground();
    this.drawCausticEffect();
    this.drawWaterParticles();
    this.drawWaterWaves();
    this.drawLightEffect();

    this.waveOffset += 0.03;
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private drawWaterBackground(): void {
    const canvas = this.canvasRef.nativeElement;
    const gradient = this.ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(135, 206, 235, 0.2)');
    gradient.addColorStop(0.3, 'rgba(70, 130, 180, 0.4)');
    gradient.addColorStop(0.7, 'rgba(25, 25, 112, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 0, 139, 0.8)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  private drawWaterWaves(): void {
    const canvas = this.canvasRef.nativeElement;
    const waveHeight = 25;
    const waveLength = canvas.width / 3;
    
    this.ctx.beginPath();
    this.ctx.moveTo(0, canvas.height - waveHeight);
    
    for (let x = 0; x <= canvas.width; x += 4) {
      const y = canvas.height - waveHeight + 
               Math.sin((x / waveLength) * Math.PI * 2 + this.waveOffset) * 12;
      this.ctx.lineTo(x, y);
    }
    
    this.ctx.lineTo(canvas.width, canvas.height);
    this.ctx.lineTo(0, canvas.height);
    this.ctx.closePath();
    
    // Sand-Gradient
    const sandGradient = this.ctx.createLinearGradient(0, canvas.height - 50, 0, canvas.height);
    sandGradient.addColorStop(0, 'rgba(139, 69, 19, 0.4)');
    sandGradient.addColorStop(1, 'rgba(160, 82, 45, 0.7)');
    
    this.ctx.fillStyle = sandGradient;
    this.ctx.fill();
  }

  private drawWaterParticles(): void {
    const canvas = this.canvasRef.nativeElement;
    
    this.particles.forEach(particle => {
      // Bewegung
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      
      // Bounds checking
      if (particle.x < 0 || particle.x > canvas.width) {
        particle.speedX *= -1;
      }
      if (particle.y < 0 || particle.y > canvas.height) {
        particle.speedY *= -1;
      }
      
      // Partikel zeichnen
      this.ctx.globalAlpha = particle.opacity;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
      
      // Leichte Opacity-Animation
      particle.opacity += (Math.random() - 0.5) * 0.03;
      particle.opacity = Math.max(0.1, Math.min(0.8, particle.opacity));
    });
  }

  private drawLightEffect(): void {
    const canvas = this.canvasRef.nativeElement;
    
    // Licht von oben
    const lightGradient = this.ctx.createLinearGradient(0, 0, 0, canvas.height / 2);
    lightGradient.addColorStop(0, `rgba(255, 255, 255, ${0.15 * this.lightIntensity})`);
    lightGradient.addColorStop(0.4, `rgba(255, 255, 255, ${0.08 * this.lightIntensity})`);
    lightGradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = lightGradient;
    this.ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
    
    // Licht-Pulsation
    this.lightIntensity = 0.7 + Math.sin(Date.now() * 0.003) * 0.3;
  }

  private drawCausticEffect(): void {
    const canvas = this.canvasRef.nativeElement;
    const time = Date.now() * 0.002;
    
    this.ctx.globalAlpha = 0.15;
    
    for (let i = 0; i < 8; i++) {
      const x = (Math.sin(time + i * 0.8) * 0.4 + 0.5) * canvas.width;
      const y = (Math.cos(time * 1.2 + i * 0.6) * 0.3 + 0.4) * canvas.height;
      
      const causticGradient = this.ctx.createRadialGradient(x, y, 0, x, y, 90);
      causticGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      causticGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
      causticGradient.addColorStop(1, 'transparent');
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, 90, 0, Math.PI * 2);
      this.ctx.fillStyle = causticGradient;
      this.ctx.fill();
    }
    
    this.ctx.globalAlpha = 1;
  }

  // Button Event Handlers
  feedFish(): void {
    console.log('🐟 Fische werden gefüttert!');
    
    // Futter-Partikel hinzufügen
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        this.particles.push({
          x: Math.random() * 700 + 50,
          y: -20,
          size: Math.random() * 4 + 2,
          speedX: (Math.random() - 0.5) * 2,
          speedY: Math.random() * 3 + 2,
          opacity: 0.9,
          color: 'rgba(255, 165, 0, 0.8)', // Orange Futter
          isFeed: true,
          life: 200
        });
      }, i * 150);
    }
  }

  toggleLight(): void {
    console.log('💡 Licht umgeschaltet!');
    this.lightIntensity = this.lightIntensity > 0.5 ? 0.2 : 1.5;
  }

  cleanAquarium(): void {
    console.log('🧽 Aquarium wird gereinigt!');
    
    // Futter-Partikel entfernen
    this.particles = this.particles.filter(p => !p.isFeed);
    
    // Neue saubere Partikel hinzufügen
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: Math.random() * 2 + 0.8,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.2,
        color: 'rgba(173, 216, 230, 0.5)'
      });
    }
  }
}
