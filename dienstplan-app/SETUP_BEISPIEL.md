# Dienstplan-App - Einrichtungsbeispiel mit echten Mitarbeitern

Dieses Dokument zeigt, wie man die Dienstplan-App mit realen Mitarbeiterdaten aus deinem Einzelhandelsbetrieb einrichtet.

## Deine Mitarbeiter

Basierend auf dem Einsatzplan vom 8./9.2026 (8:00 - 2026):

### 👤 Frau Jansen (Spätschicht-Spezialistin)
- **Max. Stunden/Woche:** 40h
- **Standard-Verfügbarkeit:** Spätschicht (18:00-22:00)
- **Besonderheiten:**
  - Mittwoch & Donnerstag: **ab 18:00 Uhr nur**
  - Übrige Tage: reguläre Spätschichten möglich
- **Notizen:** "Spätschicht-Woche aktuell"

**In der App:**
1. Mitarbeiter erstellen: "Frau Jansen"
2. Max Stunden: 40
3. Notizen: "Spätschicht-Woche, Mi/Do ab 18:00"
4. Tab "Tägliche Verfügbarkeiten":
   - **Mittwoch:** Spätschicht, Zeit 18:00-22:00
   - **Donnerstag:** Spätschicht, Zeit 18:00-22:00
   - **Übrige Tage:** Spätschicht (ohne Zeitbeschränkung)

---

### 👤 Frau Krötzsch (Frühschicht-Spezialistin)
- **Max. Stunden/Woche:** 40h
- **Standard-Verfügbarkeit:** Frühschicht (06:00-14:00)
- **Besonderheiten:**
  - Nur Frühschichten möglich
  - Keine Spätschicht
- **Notizen:** "Nur Frühschicht"

**In der App:**
1. Mitarbeiter erstellen: "Frau Krötzsch"
2. Max Stunden: 40
3. Notizen: "Nur Frühschicht (06:00-14:00)"
4. Tab "Tägliche Verfügbarkeiten":
   - **Alle Tage:** Nur "Frühschicht" auswählen

---

### 👤 Weitere Mitarbeiter
(Aus deinem Einsatzplan)

| Name | Früh | Mittel | Spät | Max/Woche | Notizen |
|------|------|--------|------|-----------|---------|
| Andrea | ✓ | ✓ | ✓ | 40h | Flexibel |
| Agentur | ✓ | ✓ | ✓ | 40h | Kurzfristig |
| (weitere) | ... | ... | ... | ... | ... |

---

## Schichttypen einrichten

Definiere die Schichten deines Betriebs:

### Frühschicht
- **Name:** Frühschicht
- **Zeit:** 06:00 - 14:00
- **Stunden:** 8h

### Mittelschicht / Mittag
- **Name:** Mittelschicht
- **Zeit:** 11:00 - 19:00
- **Stunden:** 8h

### Spätschicht
- **Name:** Spätschicht
- **Zeit:** 18:00 - 22:00 (oder 18:00 - 23:00)
- **Stunden:** 4h (oder 5h)

---

## Dienstplan erstellen - Schritt für Schritt

### 1. App öffnen
```
http://localhost:5173 (Development)
```

### 2. Neuen Dienstplan erstellen
- Button: "+ Neuer Dienstplan"
- Name: z.B. "Februar 2026"
- Klick: "Dienstplan erstellen"

### 3. Schichttypen definieren
- Tab: "⚙️ Einstellungen"
- Schichttypen hinzufügen (s.o.)

### 4. Mitarbeiter hinzufügen
- Tab: "👥 Mitarbeiter"
- "+ Mitarbeiter hinzufügen" für jeden
- Besonderheiten in "Notizen" eintragen
- Tägliche Verfügbarkeiten konfigurieren

### 5. Plan generieren
- Tab: "📋 Schichtplan"
- Button: "🔄 Neu generieren"
- Generator verteilt Schichten automatisch

### 6. Manuell nachbearbeiten
- Klick auf Schicht im Kalender zum Ändern
- Mitarbeiter austauschen oder Schicht löschen

### 7. Speichern & Exportieren
- "💾 Exportieren" → JSON-Datei speichern
- Beim nächsten Öffnen: Datei importieren

---

## JSON-Export-Beispiel

So sieht der Export aus (für Sicherung oder Übergabe):

```json
{
  "id": "abc12345",
  "name": "Februar 2026",
  "startDate": "2026-02-01",
  "endDate": "2026-02-28",
  "employees": [
    {
      "id": "emp-0",
      "name": "Frau Jansen",
      "maxHoursPerWeek": 40,
      "notes": "Spätschicht-Woche, Mi/Do ab 18:00",
      "dayAvailability": [
        {
          "dayOfWeek": 2,
          "availableShifts": ["shift-2"],
          "timeRangeStart": "18:00",
          "timeRangeEnd": "22:00"
        },
        {
          "dayOfWeek": 3,
          "availableShifts": ["shift-2"],
          "timeRangeStart": "18:00",
          "timeRangeEnd": "22:00"
        }
      ]
    },
    {
      "id": "emp-1",
      "name": "Frau Krötzsch",
      "maxHoursPerWeek": 40,
      "notes": "Nur Frühschicht",
      "dayAvailability": [
        {
          "dayOfWeek": 0,
          "availableShifts": ["shift-0"]
        }
      ]
    }
  ],
  "shiftTypes": [
    {
      "id": "shift-0",
      "name": "Frühschicht",
      "startTime": "06:00",
      "endTime": "14:00",
      "hoursPerShift": 8
    },
    {
      "id": "shift-2",
      "name": "Spätschicht",
      "startTime": "18:00",
      "endTime": "22:00",
      "hoursPerShift": 4
    }
  ],
  "shifts": [
    {
      "id": "s001",
      "date": "2026-02-01",
      "shiftType": "shift-0",
      "employee": "emp-1"
    }
  ]
}
```

---

## Tipps & Tricks

### 🎯 Generator optimal nutzen
1. **Zuerst Verfügbarkeiten definieren** → Dann generieren
2. **Gleichmäßige Auslastung:** Generator bevorzugt ausgelastete Mitarbeiter nicht
3. **Regelmäßig neu generieren:** Mit aktualisierten Verfügbarkeiten

### 📱 Auf dem Handy nutzen
1. App in Chrome/Safari öffnen
2. "Installieren" oder "Zum Homescreen"
3. Offline arbeiten ✓

### 💾 Daten sichern
1. Regelmäßig exportieren
2. JSON-Datei auf Drive/Cloud speichern
3. Backup ermöglicht schnelle Wiederherstellung

### 🔧 Häufige Anpassungen
- **Mitarbeiter kurzfristig ausfallen:** Klick auf Schicht → Name ändern
- **Neue Mitarbeiter:** "+ Mitarbeiter hinzufügen" → Neu generieren
- **Spätere Anpassungen:** Plan laden → Bearbeiten → Exportieren

---

## Fehlerbehebung

### Generator plant Mitarbeiter nicht
**Mögliche Ursachen:**
- Verfügbarkeit nicht korrekt gesetzt
- Max. Stunden bereits erreicht
- Nicht verfügbare Tage konfiguriert

**Lösung:**
1. Mitarbeiter-Details prüfen
2. Verfügbarkeiten überprüfen
3. Nicht verfügbare Tage löschen
4. Neu generieren

### Daten verschwunden
- App nutzt **localStorage** → Daten bleiben bei Neuladen
- Bei Cache-Löschen → JSON-Export verwenden
- Service Worker garantiert Offline-Zugriff

### Plan wird nicht angezeigt
- Browser-Konsole öffnen (F12)
- localStorage überprüfen
- Seite neu laden

---

## Nächste Schritte

1. **Alle Mitarbeiter importieren**
2. **Schichten definieren** (Früh/Mittel/Spät)
3. **Erstmalig generieren**
4. **Anpassen & testen**
5. **Regelmäßig exportieren**

---

**Fragen oder Probleme?** → App-Konsole (F12) prüfen oder in der README nachschlagen.

Viel Erfolg bei der Planung! 📅
