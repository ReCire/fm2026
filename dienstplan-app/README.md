# 📅 Dienstplan Generator v2.0

Intelligente Schichtplanung für Einzelhandel mit **Chat-Interface** und **echten Mitarbeiterdaten**.

## ✨ Features

- 💬 **Chat-basiertes Interface** - Natürliche Eingabe von Mitarbeitern und Verfügbarkeiten
- 🔄 **Intelligenter Generator** - Berücksichtigt Stundenzahlen, Verfügbarkeiten, Ruhetage
- 📋 **Schichtplan-Übersicht** - Wochenansicht mit farbcodeiertem Kalender
- 💾 **Speicherung** - LocalStorage + Export/Import
- 📱 **PWA-ready** - Funktioniert offline und auf Handy installierbar
- 🎨 **Modernes Dark-Design** - Tailwind CSS mit Gradient-Elementen

## 🚀 Installation & Start

```bash
# Installiere Dependencies
npm install

# Dev-Server (http://localhost:5173)
npm run dev

# Production Build
npm run build
```

## 📖 Verwendung

### Schritt 1: Plan erstellen
- Gehe zu "Home" → "+ Neuer Plan"
- Gib die Woche ein

### Schritt 2: Mitarbeiter hinzufügen via Chat
```
"Füge Frau Krötzsch 25 Früh hinzu"
"Frau Jansen 35 Spät"
"Max 40 Früh und Mittel"
```

### Schritt 3: Plan anzeigen
- Tab "📋 Plan anzeigen"
- Sieht alle generierten Schichten

### Schritt 4: Exportieren
- JSON-Export für Backup und Übergabe

## 🎯 Chat-Befehle

| Befehl | Beispiel |
|---|---|
| Mitarbeiter hinzufügen | `Füge Max 40 Früh hinzu` |
| Mit mehreren Schichten | `Frau J. 35 Früh und Spät` |
| Mitarbeiter auflisten | `Zeige Mitarbeiter` |
| Plan generieren | `Generiere den Plan` |
| Hilfe | `Hilf mir` |

## 📊 Datenstruktur

```json
{
  "schedule": {
    "id": "abc123",
    "name": "Woche 45",
    "weekStart": "2026-11-09",
    "weekEnd": "2026-11-15",
    "employees": [
      {
        "id": "emp-1",
        "name": "Frau Krötzsch",
        "hoursPerWeek": 25,
        "availableShifts": ["früh"],
        "unavailableDates": []
      }
    ],
    "shifts": [
      {
        "id": "shift-1",
        "date": "2026-11-09",
        "shiftType": "früh",
        "employee": "emp-1"
      }
    ]
  }
}
```

## 🛠️ Technologie

- **React 18** mit TypeScript
- **Vite** für schnelle Entwicklung
- **Zustand** für State Management
- **Tailwind CSS** für Styling
- **date-fns** für Datum-Logik
- **PWA** mit Service Worker

## 📱 Auf Handy installieren

**iOS (Safari):**
1. App öffnen
2. Teilen → "Zum Homescreen"

**Android (Chrome):**
1. App öffnen
2. Menü → "App installieren"

## 📝 Lizenz

MIT

---

**Version 2.0** - Rewrite mit Chat-Interface basierend auf echten Einsatzplänen
