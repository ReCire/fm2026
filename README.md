# Anstoß Mobile Pro

Ein Fußball-Managerspiel als installierbare Web-App (PWA) — läuft im Browser auf
iOS und Android, lässt sich auf den Homescreen legen und funktioniert offline.

## Stand

Das Spiel liegt derzeit als **eine einzelne `index.html`** vor (~4.800 Zeilen,
29 Screens, 182 Funktionen). Das ist der funktionierende Prototyp. Der Umbau in
eine modulare Architektur ist geplant und in einem eigenen Architektur-Dokument
beschrieben — siehe `docs/` bzw. den Bauplan-Link im Projekt.

Der unveränderte Ausgangsstand liegt als erster Commit im Repo. Alles ab dort
ist jederzeit zurückdrehbar.

## Lokal starten

```bash
python3 -m http.server 5599
```

Dann http://localhost:5599 öffnen. Ein Build-Schritt ist (noch) nicht nötig.

## Deployment

Vercel, direkt aus diesem Repo:

1. Repo auf GitHub pushen.
2. Auf vercel.com → **Add New → Project → Import Git Repository** → dieses Repo.
3. Framework Preset: **Other**. Kein Build Command, kein Output Directory.
4. Deploy.

Ab dann gilt: jeder Push auf `main` geht live, jeder Pull Request bekommt eine
eigene Preview-URL, die man direkt auf dem Handy testen kann.

## Auf dem Handy installieren

- **iOS/Safari:** Teilen-Menü → *Zum Home-Bildschirm*
- **Android/Chrome:** Menü → *App installieren*

Danach startet das Spiel ohne Browser-Leiste und läuft ohne Internetverbindung.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Das komplette Spiel (Prototyp) |
| `manifest.webmanifest` | PWA-Manifest: Name, Icons, Farben, Standalone-Modus |
| `sw.js` | Service Worker: Offline-Betrieb. `CACHE`-Konstante bei jedem Release hochzählen |
| `icons/` | App-Icons inkl. maskable Icon für Android und `apple-touch-icon` |
| `vercel.json` | Cache-Header (Service Worker nie cachen, Icons dauerhaft) |
| `.claude/launch.json` | Startkonfiguration für den lokalen Dev-Server |

## Speicherstände

Der aktuelle Prototyp speichert in `localStorage` unter `anstoss_fm13_save_v1`.
Im Admin-Screen gibt es Export/Import als JSON. Beim Umbau wandert das nach
IndexedDB, weil iOS `localStorage` bei Speicherdruck löschen darf.
