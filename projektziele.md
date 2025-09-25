# Projektziele

## 1. Virtuelles Unterwassererlebnis ermöglichen

Die App soll Nutzer*innen eine benutzerfreundliche Plattform bieten, um ein eigenes, digitales Aquarium zu gestalten und lebendige Unterwasserwelten zu erleben.
Ziel ist es, Menschen eine entspannende und kreative Möglichkeit zu geben, Fische zu beobachten, das Becken zu dekorieren und eine kleine Auszeit vom Alltag zu genießen – ganz ohne die Kosten, den Platzbedarf und die Pflege eines echten Aquariums.

## 2. Kreativität und Personalisierung fördern

Nutzer*innen können ihr Aquarium individuell gestalten, verschiedene Fischarten auswählen, Pflanzen platzieren und eigene Farbschemata oder Themenwelten erstellen.
Ziel ist es, ein hohes Maß an Individualisierung und Gestaltungsfreiheit zu bieten, sodass jede Unterwasserwelt einzigartig ist.

## 3. Spielerische Interaktion und Langzeitmotivation

Durch Funktionen wie Füttern, Wachstum der Fische oder das Freischalten neuer Arten sollen Nutzer*innen zum regelmäßigen Besuch ihrer digitalen Unterwasserwelt motiviert werden.
Ziel ist es, Entspannung und Gamification zu verbinden und so ein langanhaltendes Nutzererlebnis zu schaffen.

## 4. Niedrige Einstiegshürden und breite Zugänglichkeit

Das Aquarium soll ohne komplizierte Anmeldungen oder kostenintensive Hardware nutzbar sein.
Ziel ist es, eine einfache, intuitive Oberfläche zu bieten, die auf Smartphones, Tablets und Desktop-Geräten gleichermaßen funktioniert.

## 5. Technologische Innovation und Zukunftsfähigkeit

Die App setzt auf moderne Webtechnologien wie Angular, HTML5 Canvas oder SVG für Animationen, um flüssige Bewegungen und reaktive Steuerung zu ermöglichen.
Ziel ist es, eine skalierbare und erweiterbare Plattform zu schaffen, die in Zukunft um neue Funktionen wie Multiplayer-Features, Community-Sharing oder AR-Erweiterungen ergänzt werden kann.

# Systemkonzepte

## Datenbasis und Informationsmanagement

**Fischdatenbank:** Alle Fischarten, ihre Animationen, Farben und Eigenschaften werden in einer zentralen Datenbank verwaltet. Neue Arten können jederzeit ergänzt werden.

**Dekorationsobjekte:** Pflanzen, Steine und andere Deko-Elemente werden in modularen Datensätzen organisiert, damit Nutzer*innen regelmäßig neue Inhalte erhalten können.

**Nutzerdaten:** Fortschritte wie freigeschaltete Fische, Aquarium-Level oder Dekorationen werden lokal gespeichert und optional in der Cloud gesichert, um mehrere Geräte zu synchronisieren.

## Benutzeroberfläche und Navigation

**Aquarium-Hauptansicht:** Das Herzstück ist eine animierte Aquarium-Ansicht, in der Fische schwimmen und Nutzer*innen mit ihnen interagieren können (z. B. Füttern).

**Gestaltungsmodus:** Ein spezieller Modus erlaubt das Platzieren, Verschieben und Drehen von Dekorationen.

**Menü & Dashboard:** Übersicht über Aquarium-Status (Anzahl Fische, Wachstum, verfügbare Deko), Einstellungen und Fortschritte.

**Responsives Design:** Das Layout passt sich an Smartphones, Tablets und Desktop an, damit das Erlebnis auf allen Geräten gleich hochwertig ist.

## Personalisierung und Empfehlungssystem

**Profilverwaltung:** Nutzer*innen können ein Profil mit Aquarium-Namen, Farbschemata und Lieblingsthemen anlegen.

**Intelligente Vorschläge:** Basierend auf Nutzerverhalten werden passende Fischarten, Deko-Elemente oder Mini-Quests empfohlen (z. B. „Füttere deine Fische, um neue Arten freizuschalten").

**Community-Features (optional):** Möglichkeit, Screenshots zu teilen oder Aquarien anderer Nutzer zu bewerten.

## Technologische Basis

**Frontend:** Angular als zentrales Framework für die Benutzeroberfläche, kombiniert mit HTML5 Canvas/SVG für flüssige Animationen.

**Backend (optional):** Ein Node.js/Express-Server oder eine Cloud-Datenbank (z. B. Firebase) für optionale Online-Speicherung und Updates.

**Speicherung:** LocalStorage oder IndexedDB für Offline-Funktionalität; Cloud-Integration für Synchronisierung.

## Zukunftsfähigkeit und Erweiterbarkeit

**Regelmäßige Updates:** Einführung neuer Fischarten, Dekorationen und Animationen, um Nutzer*innen langfristig zu binden.

**Skalierbarkeit:** Möglichkeit, später Premium-Features (z. B. seltene Fische, besondere Effekte) oder AR/VR-Elemente hinzuzufügen.

**Community & Multiplayer:** Langfristig denkbar sind gemeinsame Aquarienräume oder der Austausch von Fischen zwischen Nutzer*innen.

## UI-Konzept

**Startbildschirm:** Begrüßung mit dem eigenen Aquarium oder einem Demo-Aquarium für neue Nutzer*innen.

**Hauptansicht:** Vollbild-Aquarium mit animierten Fischen, leichten Wellenbewegungen und dekorierbaren Objekten.

**Interaktionsbuttons:** Klar platzierte Buttons für Füttern, Hinzufügen von Fischen oder Start des Gestaltungsmodus.

**Design-Fokus:** Ruhige Farbtöne (Blautöne, weiche Animationen) für eine entspannende, meditative Atmosphäre.

---
**Navigation:** [🏠 README](./README.md) | ⬅️ [Ausgangssituation](./Ausgangsituation.md) | ➡️ [Rahmenbedingungen](./rahmenbedingungen.md)
