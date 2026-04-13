# Roadmap – Spielaufbau-Simulator

> Nur grobe Orientierung. Einzelschritte werden pro Arbeitsauftrag geplant.

## Phase 0 – Fundament

- [x] Domain-Briefing (`docs/DOMAIN.md`)
- [x] Architektur-Entscheidungen (`docs/ARCHITECTURE.md`)
- [x] Projekt-Scaffold (Vite + React + TS)
- [x] Ordnerstruktur `ui / state / sim / domain`
- [x] Walking-Skeleton: leeres Feld mit 4-3-3 aus Domain gerendert
- [x] Lint / Typecheck / Build grün

## Phase 1 – Sichtbares Taktikboard

- [x] Feldgrafik (mobile-first, responsiv)
- [x] Spieler-Marker mit Rollenkürzel
- [x] Formationen 4-3-3 und 4-4-2 (aktuell fest verdrahtet)
- [x] Ballträger darstellen (Startfall: Torwart)

## Phase 2 – Erste Interaktion

- [x] Passauswahl: Ballträger → Ziel-Mitspieler
- [x] Szene-Modell + State-Reducer
- [x] Lokale Persistenz der letzten Szene (`state/persistence.ts`, an `useScene` verdrahtet)

## Phase 3 – Erste Regel-Engine

- [x] Pressing-Reaktion: ballnaher Stürmer presst (`rules/pressBallHolder`)
- [x] Passweg-Sicherung durch zweiten Stürmer (`rules/coverCenter`)
- [x] Rückziehen überspielter Mittelfeldlinie (`rules/compactLine`)
- [x] Bewertung 4-stufig (`open` / `pressure` / `risky` / `loss-danger`)
- [x] Pass-Vorschau-Engine (`sim/simulatePassPreview`)
- [x] Visualisierung der Bewertung (Ring + Badge)
- [x] UI-Integration der Pass-Vorschau (Hover / Fokus)
- [x] UI-Einschub für Passschärfe & Passgenauigkeit (velocity ohne Rating-Effekt)

## Phase 4 – Vergleichsfälle

- [x] LIV-Breite breit ↔ eng (`StartVariant`, UI-Umschalter)
- [x] Erster Kontakt sauber ↔ neutral ↔ unsauber
- [ ] Nebeneinanderstellung von Szenen

## Später (bewusst offen)

- Animation von Gegner-Verschiebung
- Weitere Pressing-Arten (Mittelfeldpressing, Abwarten)
- Weitere Systeme (3-4-3, 4-2-3-1 …)
- Coaching-Hinweise
- Export / Teilen
