# 📅 Dienstplan Generator

Eine moderne Dienstplan-App mit automatischem Generator für den Einzelhandel. Die App läuft als Progressive Web App (PWA) und funktioniert offline auf iOS und Android.

## Features

✨ **Automatische Schichtplanung**
- Intelligenter Algorithmus berücksichtigt Mitarbeiterverfügbarkeiten
- Gleichmäßige Verteilung der Schichten
- Respektiert maximale Stunden pro Woche
- Vermeidung von Wochenend-Clustern

👥 **Mitarbeiterverwaltung**
- Unbegrenzte Mitarbeiter
- Tägliche Verfügbarkeiten pro Mitarbeiter (z.B. "nur Frühschicht", "ab 18:00 Uhr")
- Nicht verfügbare Tage definieren
- Farbkodierung für visuelle Übersicht

📋 **Schichtplan-Editor**
- Monatsansicht mit drag-and-drop
- Schichten manuell zuweisen oder ändern
- Export/Import als JSON
- Statistiken & Mitarbeiter-Auslastung

📱 **Progressive Web App**
- Installierbar auf Handy (iOS & Android)
- Funktioniert offline
- Service Worker für Caching
- Responsive Design

## Installation & Start

```bash
# Dependencies installieren
npm install

# Dev-Server starten (http://localhost:5173)
npm run dev

# Production Build erstellen
npm run build

# Für Production vorschauen
npm run preview
```

## Technologie

- **Frontend:** React 18 + TypeScript
- **State Management:** Zustand
- **Styling:** Tailwind CSS
- **Build:** Vite
- **Datum:** date-fns
- **PWA:** Service Worker, Web Manifest

## Datenstruktur

### Mitarbeiter (Employee)
```typescript
{
  id: string
  name: string                    // z.B. "Frau Jansen"
  maxHoursPerWeek: number         // z.B. 40
  availableShifts: ShiftType[]    // Standard-Verfügbarkeiten
  dayAvailability?: DayAvailability[]  // Tägliche Exceptions
  unavailableDates: string[]      // Nicht verfügbare Tage
  color: string                   // Farbe für Kalender
  notes?: string                  // z.B. "nur Spätschicht"
}
```

### Tägliche Verfügbarkeit (DayAvailability)
```typescript
{
  dayOfWeek: number           // 0=Mo, 1=Di, ..., 6=So
  availableShifts: string[]   // ShiftType IDs
  timeRangeStart?: string     // z.B. "18:00" für ab 18 Uhr
  timeRangeEnd?: string       // z.B. "22:00"
}
```

## Beispiel-Mitarbeiter

**Frau Jansen** (Spätschicht-Woche)
- Max. 40 Stunden/Woche
- Verfügbar für Spätschichten
- Mi/Do: ab 18:00 Uhr
- Mo/Di/Fr/Sa/So: Frühschicht nicht verfügbar

**Frau Krötzsch** (Frühschicht-spezialistin)
- Max. 40 Stunden/Woche
- Nur Frühschichten (6:00-14:00)

## Verwendung

### 1. Neuen Dienstplan erstellen
Klick auf "+ Neuer Dienstplan" und gib einen Namen ein (z.B. "Januar 2026")

### 2. Mitarbeiter hinzufügen
Tab "Mitarbeiter" → "+ Mitarbeiter hinzufügen"
- Name eingeben
- Max. Stunden/Woche setzen
- Optional: tägliche Verfügbarkeiten konfigurieren

### 3. Plan generieren
Tab "Schichtplan" → "🔄 Neu generieren"
Der Algorithmus verteilt die Schichten automatisch

### 4. Manuell anpassen
Klick auf eine Schicht im Kalender zum Bearbeiten

### 5. Exportieren
"💾 Exportieren" als JSON-Datei speichern

## Offline-Betrieb

Die App nutzt einen Service Worker, um offline zu funktionieren:
- Alle Daten werden in `localStorage` gespeichert
- Service Worker cached wichtige Dateien
- Änderungen werden automatisch synchronisiert

## Browser-Unterstützung

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 15+
- ✅ Mobile Browser (iOS Safari, Chrome Mobile)

## Auf Handy installieren

**iOS:**
1. In Safari öffnen
2. Teilen-Menü → "Zum Home-Bildschirm"

**Android:**
1. In Chrome öffnen
2. Menü → "App installieren"

## Deployment

```bash
# Build für Production
npm run build

# Mit Vercel deployen
vercel deploy

# Oder mit anderem Host
# Folder: dist/
```

## Roadmap

- [ ] Erweiterte Schichtkonflikt-Erkennung
- [ ] Import aus Excel/CSV
- [ ] Benachrichtigungen für Schichtwechsel
- [ ] Mehrsprachige UI
- [ ] Team-Zusammenarbeit
- [ ] Vertragszeiten verwalten

## Lizenz

MIT

---

**Entwickelt für:** Einzelhandels-Dienstplanung
**Aktualisiert:** 2026-01
