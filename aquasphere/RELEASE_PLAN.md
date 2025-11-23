# AquaSphere - Release Plan

## ✅ Aktueller Stand (Fertig)

### Backend & Auth
- ✅ Supabase Cloud Integration
- ✅ Multi-Device Login System
- ✅ User Registration (Email + Username + Passwort)
- ✅ Session Persistence
- ✅ Cloud Save/Load von Aquarium-State

### Core Features
- ✅ 5 Fischarten mit Schwimm-AI
  - Goldfish, Bluefish, Redfish, Greenfish, Angelfish
  - Bewegung mit Target-Seeking und Richtungswechsel
- ✅ 7 Dekorationstypen
  - Pflanzen: Fern, Anubias, Moss
  - Steine: Small Rock, Big Rock
  - Korallen: Red Coral, Orange Coral
- ✅ Platzierungs-System (Click-to-place)
- ✅ Lösch-Modus mit visuellem Indikator
- ✅ Basis-Aktionen: Füttern, Licht, Reinigen

### UI/UX
- ✅ Handy-Mockup Design
- ✅ Canvas-Rendering mit Wasser-Effekten
- ✅ Menü-Button unten rechts
- ✅ Auswahlleiste für Dekorationen/Fische
- ✅ Auth-Overlay für Login/Register
- ✅ Profile-Button oben links

---

## 🎯 Geplante Features (Priorität 1)

### 1. Futter-System mit Fisch-Reaktion ⭐
 
**Beschreibung:**
- Beim Füttern spawnen Futter-Partikel im Aquarium
- Futter sinkt langsam nach unten
- Fische schwimmen aktiv zum nächsten Futter
- Futter verschwindet wenn gefressen

**Technisch:**
- Neue `FoodParticle` Interface mit x, y, velocity
- Array `foodParticles: FoodParticle[]`
- `feedFish()` spawnt 3-5 Partikel an zufälligen Positionen
- In `animate()`: Futter-Physik + Fisch-Targeting
- Fische wählen nächstes Futter als Ziel
- Collision Detection: Futter entfernen wenn Fisch nah genug

---

### 2. Hunger-System ⭐
**Beschreibung:**
- Jeder Fisch hat Hunger-Level (0-100)
- Hunger sinkt langsam über Zeit
- Visueller Indikator: Roter Balken über hungriger Fische (hunger < 30)
- Füttern erhöht Hunger wieder

**Technisch:**
- Fish Interface erweitern: `hunger: number` Property
- In `animate()`: `fish.hunger -= 0.01` (oder Delta-Time basiert)
- In `drawFish()`: Wenn hunger < 30, roten Balken zeichnen
- Bei Futter-Kollision: `fish.hunger = Math.min(100, fish.hunger + 20)`
- State Save/Load berücksichtigt Hunger

---

### 3. Wasserqualität-System
**Beschreibung:**
- Wasserqualität verschlechtert sich über Zeit
- Visuell: Wasser wird grünlicher/trüber wenn dreckig
- UI-Anzeige: Balken oder Prozent-Wert
- "Reinigen"-Button setzt Qualität auf 100%

**Technisch:**
- Variable `waterQuality: number = 100`
- In `animate()`: `waterQuality -= 0.005` (pro Frame)
- In `drawWater()`: Farbe basierend auf waterQuality anpassen
  - 100%: Klares Blau `#0066cc`
  - 50%: Grünlich `#4d7f5c`
  - 0%: Dunkelgrün `#2d4a36`
- `cleanAquarium()`: `this.waterQuality = 100`
- UI: Kleiner Balken oder Text in Ecke

---

### 4. Fisch-Info beim Klick 
**Beschreibung:**
- Auf Fisch klicken zeigt kleines Info-Popup
- Anzeige: Fisch-Typ, Hunger, Alter (Zeit seit Platzierung)
- Auto-Close nach 3 Sekunden

**Technisch:**
- Variable `selectedFish: Fish | null = null`
- Bei Canvas-Click: Prüfe ob Fisch getroffen (Distanz-Check)
- Popup-Div mit *ngIf im HTML
- `setTimeout()` zum Auto-Close
- CSS: Kleines abgerundetes Overlay, semi-transparent

---

### 5. Statistik-Panel 
**Beschreibung:**
- Zeigt Aquarium-Statistiken an
- Anzahl: Fische, Pflanzen, Dekorationen
- Total gefüttert (Counter)
- Session-Zeit

**Technisch:**
- Toggle-Button in UI (z.B. "📊" Icon)
- Variable `showStats: boolean = false`
- Overlay-Panel mit Stats
- Counter: `totalFeedCount: number = 0` in `feedFish()` inkrementieren
- Session-Zeit: `sessionStartTime` in `ngOnInit()`, Differenz berechnen

---

## 📋 Optional (Priorität 2)

### 6. Tag/Nacht-Zyklus
- Licht dimmt automatisch basierend auf echter Uhrzeit
- Fische schwimmen langsamer nachts
- Optional: Toggle für manuelle Kontrolle

### 7. Aquarium-Themes/Hintergründe
- Verschiedene Hintergrund-Designs
- Auswahl im Settings-Menü
- Einfach: Gradient-Farben ändern

### 8. Tutorial/Onboarding
- Beim ersten Start: Kurze Anleitung
- "Platziere deinen ersten Fisch!"
- localStorage für "tutorial_completed" Flag

### 9. Achievements (Advanced)
- Milestone-System
- z.B. "10 Fische gefüttert", "24h ohne Hunger"
- Speicherung in Supabase

---

## 🚀 Release Checklist

### Code Quality
- [ ] Alle Debug console.log() entfernen
- [ ] TypeScript Warnings beheben
- [ ] Code kommentieren (wichtige Funktionen)

### Testing
- [ ] Multi-Device Login testen (2 Browser)
- [ ] Save/Load Cycle testen
- [ ] Alle Features durchgehen
- [ ] Mobile Responsive testen

### Deployment
- [ ] Build für Produktion: `ng build --configuration production`
- [ ] Deployment Target wählen (GitHub Pages / Vercel / etc.)
- [ ] Environment Variables prüfen (Supabase Keys sicher?)

### Dokumentation
- [ ] README.md updaten
- [ ] Setup-Anleitung für Teammitglieder
- [ ] Feature-Liste dokumentieren

---

## 📝 Notizen

**Geschätzte Gesamtzeit für Priorität 1 Features:**

**Empfohlene Reihenfolge:**
1. Futter-System (sofort sichtbarer Effekt)
2. Hunger-System (baut auf #1 auf)
3. Wasserqualität (unabhängig, schnell)
4. Statistik-Panel (einfach, poliert App ab)
5. Fisch-Info (Nice-to-have Detail)

**Nächste Schritte:**
1. Entscheiden welche Features definitiv ins Release sollen
2. Features einzeln implementieren und testen
3. Git Commit nach jedem fertigen Feature
4. Final Testing vor Release
