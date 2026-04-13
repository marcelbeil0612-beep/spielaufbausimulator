# Architektur – Spielaufbau-Simulator

> Ziel: didaktische Klarheit, saubere Trennung, einfache Erweiterbarkeit.
> Keine Abstraktionen auf Vorrat. Jede Schicht hat **einen** Job.

---

## 1. Vier Schichten

```
┌──────────────────────────────────────────────┐
│  ui/      Darstellung, Interaktions-Events   │  React-Komponenten, CSS Modules
├──────────────────────────────────────────────┤
│  state/   Anwendungszustand, Hooks, Reducer  │  useReducer, Store-Hooks
├──────────────────────────────────────────────┤
│  sim/     Regel-Engine (Reaktionen, Bewertung) │ reine Funktionen
├──────────────────────────────────────────────┤
│  domain/  Typen, Formationen, Szenen, Feldmaß │ nur Daten & Typen
└──────────────────────────────────────────────┘
```

## 2. Abhängigkeitsrichtung

**Strikt von oben nach unten. Niemals umgekehrt.**

- `ui/`     → darf `state/`, `domain/` importieren.
- `state/`  → darf `sim/`, `domain/` importieren.
- `sim/`    → darf **nur** `domain/` importieren.
- `domain/` → **keine** Imports aus `ui`, `state`, `sim`.

Das hält `sim/` und `domain/` **rein testbar** (keine React-Abhängigkeit, keine DOM-Abhängigkeit).

## 3. Verantwortlichkeiten

### `domain/`
- Typen: `Player`, `Position`, `Formation`, `Scene`, `Team`, `Pitch`.
- Statische Formationen (4-3-3, 4-4-2 …) als Daten.
- Feldmaße und Koordinatensystem.
- **Keine Logik**, die Zustand verändert.

### `sim/`
- Reine Funktionen: `reactTo(scene, action) → scene`.
- Bewertung: `evaluate(scene) → Rating`.
- Regeln sind hier versioniert und testbar ohne UI.

### `state/`
- Hält die aktuelle Szene, Historie, Konfiguration.
- Ruft `sim/` bei Aktionen auf.
- Stellt UI-freundliche Selektoren / Hooks bereit.

### `ui/`
- Rendert Spielfeld, Spieler, Bewertung.
- Löst Aktionen via State-Hooks aus.
- **Keine Regel-Logik.** UI ist dumm.

## 4. Koordinatensystem

- Feld-Koordinaten normalisiert: **x ∈ [0, 100], y ∈ [0, 100]**.
- Ursprung **links unten** aus Sicht des eigenen Teams (eigenes Tor = y nahe 0, gegnerisches Tor = y nahe 100).
- Pixel-Mapping erst in der `ui/`-Schicht.

Begründung: Rendern wird responsiv / mobile-first. Die Domain kennt keine Pixel.

## 5. Testing

- **Vitest** für Unit-Tests.
- `domain/` und `sim/` sind 100 %-pur → leicht testbar.
- `state/` testbar via Reducer-Tests (Input-Output).
- `ui/` zuerst manuell / per Browser, später ggf. Component-Tests.

## 6. Styling

- **CSS Modules**, keine CSS-Frameworks.
- Mobile-first: Basislayout für schmale Viewports, dann `@media` für Desktop-Komfort.
- Farb- und Spacing-Tokens in `src/ui/tokens.css`.

## 7. Persistenz

- `state/persistence.ts` kapselt `localStorage`.
- Keine andere Schicht redet direkt mit dem Browser-Storage.

## 8. Was wir **nicht** tun (Guardrails)

- Keine State-Management-Library, solange `useReducer` genügt.
- Keine UI-Komponentenbibliothek einziehen, um nicht zu überladen.
- Keine Abstraktion ohne zwei konkrete Anwendungsfälle.
- Keine toten Dateien – unbenutzter Code wird gelöscht, nicht auskommentiert.
