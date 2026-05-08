# Product Requirements Document (PRD)

## Produkt: Terrain Poster Configurator

**Datei:** `.agents/PRDs/PRD.md`  
**Version:** 1.0  
**Status:** MVP-Spezifikation  
**Sprache:** Deutsch  

---

# 1. Executive Summary

Der **Terrain Poster Configurator** ist eine WebApp für einen Shopify-Shop, in dem Kunden personalisierte Rahmen/Poster mit einem aufgeklebten 3D-gedruckten Terrain-Ausschnitt bestellen können. Grundlage ist eine vom Kunden hochgeladene `.gpx`-Datei, aus der eine Route visualisiert wird. Der Kunde kann diese Route zunächst in einer 2D-Kartenansicht prüfen, anschließend in einer stilisierten 3D-Terrain-Vorschau betrachten und am Ende in einem Poster-Mockup mit persönlichen Textdaten sehen.

Das kaufbare Produkt ist kein rein digitales Modell, sondern ein physisches Premium-Produkt: ein Poster oder Rahmen mit einem 12 cm großen runden oder hexagonalen 3D-Terrain-Ausschnitt. Unterhalb des 3D-Drucks stehen vom Kunden manuell eingegebene Informationen wie Name, Event, Datum, Zeit, Distanz und weitere optionale Angaben.

Der MVP konzentriert sich bewusst auf eine hochwertige Vorschau und eine einfache Shopify-Bestellung. Es werden im MVP **keine druckfertigen 3MF-, STL- oder Produktionsdateien automatisch erzeugt**. Shopify beziehungsweise die WebApp muss primär die GPX-Datei speichern beziehungsweise mit der Bestellung verknüpfen. Weitere produktrelevante Angaben gibt der Kunde manuell ein.

## Core Value Proposition

Kunden können ihre persönliche Route in wenigen Schritten in ein hochwertiges, emotionales Terrain-Poster verwandeln und bereits vor dem Kauf eine produktnahe 2D-, 3D- und Poster-Vorschau erleben.

## MVP Goal Statement

Der MVP soll Kunden ermöglichen, eine GPX-Datei hochzuladen, die Route in 2D zu prüfen, einen Kreis- oder Hexagon-Ausschnitt als 3D-Terrainmodell zu visualisieren, Basisoptionen wie Form, Farben, Gebäude und Höhenüberhöhung zu wählen und das Produkt anschließend mit verknüpfter GPX-Datei in den Shopify-Warenkorb zu legen.

---

# 2. Mission

## Product Mission Statement

Der Terrain Poster Configurator macht persönliche Outdoor-, Lauf-, Wander- und Radfahr-Erlebnisse als hochwertiges, individualisiertes 3D-Terrain-Poster erlebbar und bestellbar.

## Core Principles

1. **Vorschau vor Automatisierung**  
   Der MVP priorisiert eine überzeugende Kunden-Vorschau, nicht die automatische Produktionsdatei-Erstellung.

2. **Mobile-first und flüssig**  
   Der Viewer muss auf Desktop und mobilen Geräten bedienbar sein; Performance ist wichtiger als maximale Detailtreue.

3. **Produktnah statt GIS-realistisch**  
   Die 3D-Ansicht soll wie ein echtes druckbares Modell wirken, nicht wie eine technische Karten- oder Satellitenanwendung.

4. **Einfacher Kaufprozess**  
   Der Kunde soll ohne technisches Wissen vom GPX-Upload bis zum Warenkorb gelangen.

5. **MVP bewusst begrenzen**  
   Keine 3MF-Erstellung, keine Produktionsautomatisierung, keine komplexe CAD-Pipeline im ersten Schritt.

---

# 3. Target Users

## Primary User Personas

### Persona 1: Läufer / Event-Finisher

**Beschreibung:**  
Personen, die an Marathons, Halbmarathons, Trailruns oder anderen Laufveranstaltungen teilnehmen und ihre Route als Erinnerungsstück festhalten möchten.

**Beispiel:**  
Eine Läuferin möchte ihren ersten Marathon als Poster mit Route, Datum, Zeit und Distanz an die Wand hängen.

**Technisches Niveau:**  
Niedrig bis mittel. GPX-Dateien sind eventuell bekannt, aber komplexe Kartentools oder 3D-Software nicht.

---

### Persona 2: Radfahrer / Gravel / Mountainbike

**Beschreibung:**  
Sportliche Nutzer, die besondere Touren, Anstiege oder Events als Terrainmodell darstellen möchten.

**Beispiel:**  
Ein Gravel-Fahrer lädt seine Alpenüberquerung als GPX hoch und wählt eine starke Höhenüberhöhung.

**Technisches Niveau:**  
Mittel. GPX-Dateien werden häufig aus Garmin, Komoot, Strava oder ähnlichen Tools exportiert.

---

### Persona 3: Wanderer / Outdoor-Enthusiast

**Beschreibung:**  
Nutzer, die eine besondere Wanderung, Bergtour oder Reise als Geschenk oder Erinnerung visualisieren möchten.

**Beispiel:**  
Eine Kundin erstellt ein Poster einer gemeinsamen Bergwanderung als Geschenk.

**Technisches Niveau:**  
Niedrig bis mittel.

---

### Persona 4: Geschenk-Käufer

**Beschreibung:**  
Personen, die ein personalisiertes Geschenk bestellen, aber möglicherweise selbst keine GPX-Erfahrung haben.

**Beispiel:**  
Ein Partner bestellt ein Terrain-Poster zum Jubiläum eines Radrennens.

**Technisches Niveau:**  
Niedrig. Der Upload- und Bestellprozess muss besonders verständlich sein.

---

## Key User Needs

- GPX-Datei unkompliziert hochladen
- Route visuell überprüfen
- Produktform wählen: Kreis oder Hexagon
- 3D-Vorschau auf Desktop und Mobile ansehen
- Farben einfach auswählen
- Terrain dramatischer oder realistischer darstellen
- Manuelle Eventdaten eingeben
- Vertrauen in das spätere physische Produkt bekommen

## Key Pain Points

- Viele Kartenprodukte wirken generisch und flach
- GPX- und Terrain-Tools sind oft technisch und nicht kundenfreundlich
- Mobile Konfiguratoren sind oft schwer bedienbar
- Kunden können sich ein 3D-Druckprodukt ohne Vorschau schwer vorstellen

---

# 4. MVP Scope

## In Scope

### Core Functionality

- [x] Upload genau einer `.gpx`-Datei
- [x] Validierung der GPX-Datei
- [x] Abbruch mit verständlicher Fehlermeldung, wenn keine Höhenwerte enthalten sind
- [x] 2D-Kartenansicht auf OpenStreetMap-Basis
- [x] Route in der 2D-Karte anzeigen
- [x] Automatische Bounding-Fläche um die Route
- [x] Auswahl zwischen Kreis und Hexagon
- [x] Zoom in der 2D-Karte
- [x] Warnung, wenn Route außerhalb des Ausschnitts liegt
- [x] 3D-Terrain-Vorschau
- [x] Route liegt visuell auf dem Terrain
- [x] Sichtbarer Rand/Sockel um den 12-cm-Ausschnitt
- [x] Optional Gebäude anzeigen
- [x] Gebäude als einfache extrudierte Blöcke
- [x] Monochrome Terrain-Darstellung
- [x] Elevation Scale über Slider von 1 bis 3
- [x] Feste Farbpalette für Route
- [x] Feste Farbpalette für Terrain und Gebäude
- [x] Skeleton Preview während des Ladens
- [x] Poster-Mockup als dritter Viewer-Schritt
- [x] Manuelle Eingabefelder für Name, Datum, Event, Zeit, Distanz und weitere Daten
- [x] Desktop- und Mobile-Bedienung
- [x] Touchsteuerung im 3D-Viewer
- [x] Maussteuerung im 3D-Viewer
- [x] Shopify-Warenkorb-Übergabe
- [x] Verknüpfung der GPX-Datei mit der Bestellung

---

### Technical

- [x] Frontend-basierter Konfigurator
- [x] GPX Parsing im Browser oder über leichtes Backend
- [x] Dateiablage für GPX-Dateien außerhalb von Shopify oder über geeignete Shopify-kompatible Upload-Lösung
- [x] Speicherung einer GPX-Referenz in Shopify
- [x] Performance-Optimierung für Mobile
- [x] Reduzierte Mesh-Komplexität für mobile Geräte
- [x] Progressive Loading / Skeleton Preview

---

### Integration

- [x] Shopify Produktseite oder eingebetteter Konfigurator
- [x] Add-to-Cart Flow
- [x] Shopify Line Item Properties für Kundendaten und/oder GPX-Referenz
- [x] Kundendaten können manuell eingegeben und mit Bestellung gespeichert werden

---

### Deployment

- [x] WebApp erreichbar über Shopify-Produktseite oder eingebettetes Widget
- [x] Unterstützung moderner Desktop-Browser
- [x] Unterstützung moderner Mobile-Browser
- [x] HTTPS-only Deployment

---

## Out of Scope

### Core Functionality

- [ ] Mehrere GPX-Dateien pro Bestellung
- [ ] GPX-Routen kombinieren
- [ ] GPX-Routen bearbeiten oder glätten
- [ ] Route manuell verschieben
- [ ] Bounding-Shape manuell verschieben
- [ ] Bounding-Shape frei skalieren
- [ ] 2D-Karte drehen
- [ ] Start- und Zielmarker im MVP
- [ ] Automatische Berechnung aller Textdaten für das Poster
- [ ] Benutzerkonten
- [ ] Gespeicherte Projekte

---

### Production / Manufacturing

- [ ] Automatische 3MF-Erstellung
- [ ] STL-Export
- [ ] Automatische Druckdaten-Erstellung
- [ ] CAD-Boolean-Operationen
- [ ] Automatische Druckoptimierung
- [ ] Automatische Produktionspipeline
- [ ] Automatische Slicer-Integration

---

### Advanced Commerce

- [ ] Dynamische Preisberechnung im MVP
- [ ] Checkout-App-Erweiterung
- [ ] Fulfillment-Automatisierung
- [ ] Produktvarianten-Logik für komplexe Herstellungskosten

---

### Advanced Visualization

- [ ] Fotorealistisches Rendering
- [ ] Satelliten-Texturen
- [ ] Komplexe Dachformen
- [ ] Echte Gebäudedetails
- [ ] Routenanimation
- [ ] Social Sharing Preview

---

# 5. User Stories

## Story 1: GPX Upload

**As a** Kunde,  
**I want to** eine `.gpx`-Datei hochladen,  
**so that** meine persönliche Route als Grundlage für das Terrain-Poster verwendet werden kann.

### Konkretes Beispiel
Ein Kunde exportiert eine GPX-Datei aus Komoot oder Garmin und lädt sie auf der Produktseite hoch.

### Akzeptanzkriterien

- [ ] Nur `.gpx`-Dateien werden akzeptiert
- [ ] Die Datei wird validiert
- [ ] Fehlende Höhenwerte führen zu einem verständlichen Abbruch
- [ ] Erfolgreicher Upload führt zum nächsten Schritt

---

## Story 2: 2D Route prüfen

**As a** Kunde,  
**I want to** meine Route auf einer 2D-Karte sehen,  
**so that** ich sicher bin, dass die richtige Strecke verwendet wird.

### Konkretes Beispiel
Nach dem Upload sieht der Kunde seine Marathonroute auf OpenStreetMap und kann hinein- oder herauszoomen.

### Akzeptanzkriterien

- [ ] Route wird auf einer Karte angezeigt
- [ ] Karte basiert auf OpenStreetMap
- [ ] Zoom ist möglich
- [ ] Route ist klar sichtbar

---

## Story 3: Ausschnittsform wählen

**As a** Kunde,  
**I want to** zwischen Kreis und Hexagon wählen,  
**so that** das finale Produkt meinem Stil entspricht.

### Konkretes Beispiel
Ein Kunde wählt Hexagon für eine moderne Optik, ein anderer wählt Kreis für einen klassischen Look.

### Akzeptanzkriterien

- [ ] Kreis auswählbar
- [ ] Hexagon auswählbar
- [ ] Form wird in 2D sichtbar
- [ ] Form wird später in 3D und im Poster-Mockup übernommen

---

## Story 4: Route innerhalb des Ausschnitts prüfen

**As a** Kunde,  
**I want to** gewarnt werden, wenn meine Route außerhalb des Ausschnitts liegt,  
**so that** ich keine fehlerhafte Vorschau bestelle.

### Konkretes Beispiel
Wenn ein langer Trailrun nicht vollständig in den 12-cm-Kreis passt, erscheint eine freundliche Warnung.

### Akzeptanzkriterien

- [ ] Out-of-bounds wird erkannt
- [ ] Warnung ist freundlich formuliert
- [ ] Kunde kann per Zoom anpassen

---

## Story 5: 3D Terrain ansehen

**As a** Kunde,  
**I want to** eine 3D-Vorschau meines Terrain-Ausschnitts sehen,  
**so that** ich mir das spätere physische Produkt besser vorstellen kann.

### Konkretes Beispiel
Der Kunde sieht ein monochromes Terrainmodell mit seiner Route auf der Oberfläche.

### Akzeptanzkriterien

- [ ] Terrain wird in 3D dargestellt
- [ ] Route liegt auf dem Terrain
- [ ] Viewer ist per Touch und Maus bedienbar
- [ ] Ladezustand wird über Skeleton Preview dargestellt

---

## Story 6: Gebäude optional anzeigen

**As a** Kunde,  
**I want to** Gebäude ein- oder ausschalten,  
**so that** ich zwischen einem cleanen Terrain-Design und einer urbaneren Darstellung wählen kann.

### Konkretes Beispiel
Bei einem Stadtmarathon aktiviert der Kunde einfache Gebäudeblöcke.

### Akzeptanzkriterien

- [ ] Gebäude können aktiviert/deaktiviert werden
- [ ] Gebäude erscheinen als einfache extrudierte Blöcke
- [ ] Wenn keine Gebäudedaten verfügbar sind, erscheint eine freundliche Meldung

---

## Story 7: Farben und Höhenüberhöhung wählen

**As a** Kunde,  
**I want to** Route, Terrain, Gebäude und Höhenüberhöhung einstellen,  
**so that** die Vorschau meinem gewünschten Produktlook entspricht.

### Konkretes Beispiel
Ein Kunde wählt weißes Terrain, orange Route und Elevation Scale 3 für einen dramatischen Alpenlook.

### Akzeptanzkriterien

- [ ] Route: orange, grün, blau, rot, weiß, gelb, schwarz
- [ ] Terrain: grau, schwarz, weiß
- [ ] Gebäude: gleiche Palette wie Terrain
- [ ] Elevation Scale: 1 bis 3
- [ ] Änderungen aktualisieren die Vorschau

---

## Story 8: Poster-Mockup sehen

**As a** Kunde,  
**I want to** das finale Poster mit 3D-Ausschnitt und Textdaten sehen,  
**so that** ich vor dem Kauf ein klares Gefühl für das finale Produkt bekomme.

### Konkretes Beispiel
Der Kunde sieht einen Rahmen mit dem 12-cm-Terrain oben und darunter Name, Event, Datum, Zeit und Distanz.

### Akzeptanzkriterien

- [ ] Poster-Mockup wird als dritter Viewer-Schritt angezeigt
- [ ] 12-cm-Ausschnitt ist sichtbar
- [ ] Manuelle Textdaten erscheinen im Mockup
- [ ] Mockup ist responsive

---

## Story 9: Bestellung mit GPX verknüpfen

**As a** Shop-Betreiber,  
**I want to** die GPX-Datei mit der Shopify-Bestellung verknüpfen,  
**so that** ich das Produkt nach der Bestellung manuell produzieren kann.

### Konkretes Beispiel
In der Shopify-Bestellung ist ein Link zur hochgeladenen GPX-Datei sichtbar.

### Akzeptanzkriterien

- [ ] GPX-Datei wird gespeichert
- [ ] Bestellung enthält GPX-Referenz
- [ ] Manuelle Kundendaten werden mit Bestellung gespeichert
- [ ] Shop-Betreiber kann alle Daten zur Produktion abrufen

---

# 6. Core Architecture & Patterns

## High-Level Architecture Approach

Der MVP folgt einer **Frontend-zentrierten Konfigurator-Architektur** mit leichter Backend-Unterstützung für Uploads, Speicherung und Shopify-Kommunikation.

```text
Kunde
  ↓
Shopify Produktseite / eingebettete WebApp
  ↓
GPX Upload + Konfiguration
  ↓
2D Viewer + 3D Viewer + Poster Mockup
  ↓
GPX Storage
  ↓
Shopify Cart / Order mit GPX-Referenz und Kundendaten
  ↓
Manuelle Produktion
```

## Architecture Principles

### 1. Preview-first
Die App erzeugt eine überzeugende visuelle Vorschau, aber keine finalen Produktionsdaten.

### 2. Lightweight Backend
Backend wird nur für Upload, Speicherung, API-Schutz und Shopify-Integration benötigt.

### 3. Shared Configuration State
2D Viewer, 3D Viewer, Poster Mockup und Add-to-Cart verwenden denselben zentralen Konfigurationszustand.

### 4. Progressive Rendering
Zuerst Skeleton Preview, danach einfache Terrain-Vorschau, danach finale Vorschauqualität.

### 5. Mobile Performance First
Die Geometriequalität wird auf mobilen Geräten reduziert, wenn nötig.

---

## Suggested Directory Structure

```text
.agents/
  PRDs/
    PRD.md

apps/
  web/
    app/
      product-configurator/
        page.tsx
    components/
      upload/
      map-viewer/
      terrain-viewer/
      poster-mockup/
      shopify/
      ui/
    features/
      gpx/
      map/
      terrain/
      mockup/
      checkout/
    lib/
      gpx/
      geometry/
      terrain/
      shopify/
      storage/
    types/
      configurator.ts
    styles/

api/
  upload-gpx/
  shopify-cart/
  terrain-data/
```

---

## Key Design Patterns

### State Machine / Step Flow

Die User Journey besteht aus klaren Schritten:

```text
UPLOAD → 2D_MAP → 3D_PREVIEW → POSTER_MOCKUP → CART
```

### Central Config Object

Beispiel:

```ts
type ConfiguratorState = {
  gpxUrl: string | null;
  shape: 'circle' | 'hexagon';
  elevationScale: 1 | 2 | 3;
  buildingsEnabled: boolean;
  routeColor: 'orange' | 'green' | 'blue' | 'red' | 'white' | 'yellow' | 'black';
  terrainColor: 'gray' | 'black' | 'white';
  buildingColor: 'gray' | 'black' | 'white';
  posterText: {
    name?: string;
    event?: string;
    date?: string;
    time?: string;
    distance?: string;
    elevation?: string;
  };
};
```

### Graceful Degradation

Wenn Gebäudedaten oder Terrain-Details nicht verfügbar sind, soll die App weiterhin funktionieren und eine freundliche Meldung anzeigen.

---

# 7. Tools / Features

## Feature 1: GPX Upload

### Purpose
Ermöglicht dem Kunden, seine Route als Grundlage für die Vorschau bereitzustellen.

### Key Operations

- Datei auswählen
- Dateityp prüfen
- GPX parsen
- Höhenwerte prüfen
- Datei speichern
- GPX-Referenz erzeugen

### Constraints

- Nur eine Datei
- Nur `.gpx`
- Keine automatische Korrektur fehlerhafter Dateien
- Kein Multi-GPX

---

## Feature 2: 2D Map Viewer

### Purpose
Route sichtbar machen und Ausschnitt prüfen.

### Key Operations

- OpenStreetMap anzeigen
- Route als Linie rendern
- Bounding Shape berechnen
- Kreis oder Hexagon anzeigen
- Zoom erlauben
- Out-of-bounds prüfen

### Customer Controls

- Zoom
- Formauswahl Kreis/Hexagon

### Nicht erlaubt

- Karte drehen
- Shape verschieben
- Route bearbeiten

---

## Feature 3: 3D Terrain Viewer

### Purpose
Produktnahe 3D-Vorschau des Terrain-Ausschnitts.

### Visual Requirements

- Echt druckbarer Look
- Monochromes Terrain
- Sichtbarer Rand/Sockel
- Route auf Terrainoberfläche
- Gebäude als einfache Blöcke
- Hochwertig, clean, minimalistisch

### Controls

- Modell rotieren
- Modell zoomen
- Elevation Scale 1–3
- Gebäude ein/aus
- Routefarbe wählen
- Terrainfarbe wählen
- Gebäudefarbe wählen

---

## Feature 4: Poster Mockup Viewer

### Purpose
Der Kunde sieht das finale kaufbare Produkt als Poster/Rahmen.

### Elements

- Posterfläche
- Rahmenoptik
- 12-cm Terrain-Ausschnitt
- Kreis oder Hexagon
- Manuelle Textangaben unterhalb des Drucks

### Text Fields

- Name
- Datum
- Event
- Zeit
- Distanz
- Höhenmeter
- optionale Zusatzangaben

---

## Feature 5: Shopify Add-to-Cart

### Purpose
Übergibt das konfigurierte Produkt an Shopify.

### Daten, die an Shopify gehen sollen

- GPX-Datei-Referenz
- Manuelle Kundendaten
- Form: Kreis/Hexagon
- Gewählte Farben
- Gebäude an/aus
- Elevation Scale

### Wichtige Vereinfachung

Shopify muss nicht die 3D-Datei speichern. Shopify braucht vor allem die GPX-Referenz und manuell eingegebene Kundendaten.

---

# 8. Technology Stack

## Frontend

| Technologie | Empfehlung | Zweck |
|---|---:|---|
| Next.js | 14+ | App Framework |
| React | 18+ | UI |
| TypeScript | 5+ | Typsicherheit |
| Tailwind CSS | 3+ | Styling |
| Zustand | latest | Client State |
| React Hook Form | latest | Formulare |
| Zod | latest | Validierung |

---

## 2D Map

| Technologie | Empfehlung | Zweck |
|---|---:|---|
| MapLibre GL JS | latest | 2D-Kartenansicht |
| OpenStreetMap Tiles | n/a | Kartenbasis |

---

## 3D Rendering

| Technologie | Empfehlung | Zweck |
|---|---:|---|
| Three.js | latest | WebGL Rendering |
| React Three Fiber | latest | React Integration |
| Drei | latest | Controls, Helpers |

---

## GPX / Geo Processing

| Technologie | Zweck |
|---|---|
| GPX Parser Library | GPX-Datei parsen |
| Turf.js | Bounds, Geometrie, Distanzprüfungen |
| Custom Geometry Helpers | Kreis/Hexagon/Out-of-bounds |

---

## Storage

| Option | Zweck |
|---|---|
| Cloudflare R2 | GPX-Datei speichern |
| Supabase Storage | Alternative für GPX-Datei speichern |
| S3-kompatibler Storage | Alternative |

---

## Shopify

| Technologie | Zweck |
|---|---|
| Shopify AJAX Cart API | Add-to-Cart innerhalb Theme |
| Shopify Line Item Properties | Kundendaten / GPX-Referenz speichern |
| Shopify Theme Embed | Einbettung in Produktseite |

---

## Optional Dependencies

- Sentry für Fehlertracking
- PostHog oder Plausible für Analytics
- Vercel für Hosting
- Cloudflare für CDN und Storage

---

# 9. Security & Configuration

## Authentication / Authorization

Für den MVP ist keine Kundenregistrierung erforderlich.

### Admin / Shop Owner
Nicht im MVP spezifiziert. Zugriff auf Bestelldaten erfolgt über Shopify Admin.

---

## File Upload Security

### Requirements

- Nur `.gpx` erlauben
- MIME-Type prüfen
- Dateigröße limitieren
- Server-seitige Validierung
- Keine ausführbaren Dateien erlauben
- Uploads mit zufälligen IDs speichern
- Keine Originalpfade oder privaten Kundendaten im Dateinamen speichern

---

## Configuration Management

### Example Environment Variables

```env
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=
NEXT_PUBLIC_SHOPIFY_PRODUCT_ID=
SHOPIFY_STOREFRONT_ACCESS_TOKEN=
GPX_STORAGE_BUCKET=
GPX_STORAGE_ACCESS_KEY=
GPX_STORAGE_SECRET_KEY=
NEXT_PUBLIC_MAP_TILE_URL=
```

---

## Privacy / DSGVO Considerations

GPX-Dateien können sensible Standortdaten enthalten.

### In Scope

- Datenschutzhinweis beim Upload
- Speicherung nur zweckgebunden für Bestellung/Produktion
- Klare Information, dass Route zur Produktherstellung genutzt wird
- Löschkonzept definieren

### Out of Scope für MVP, aber später relevant

- Kundenkonto mit Dateiverwaltung
- Automatische Löschfristen im Admin-UI
- Vollständiges Consent Management System

---

## Deployment Considerations

- HTTPS erforderlich
- CDN für statische Assets
- Mobile Safari explizit testen
- WebGL-Fallback oder Fehlermeldung bei nicht unterstützten Geräten
- Rate-Limit für Upload-Endpunkt

---

# 10. API Specification

## 10.1 POST `/api/gpx/upload`

### Purpose
GPX-Datei hochladen, validieren und speichern.

### Request

```http
POST /api/gpx/upload
Content-Type: multipart/form-data
```

### Form Data

| Field | Type | Required | Description |
|---|---|---:|---|
| file | File | yes | GPX-Datei |

### Success Response

```json
{
  "success": true,
  "gpxUrl": "https://storage.example.com/gpx/uuid.gpx",
  "fileName": "route.gpx",
  "hasElevation": true,
  "routeBounds": {
    "minLat": 48.1,
    "minLng": 11.5,
    "maxLat": 48.2,
    "maxLng": 11.7
  }
}
```

### Error Response

```json
{
  "success": false,
  "errorCode": "NO_ELEVATION_DATA",
  "message": "Deine GPX-Datei enthält keine Höhenwerte. Bitte lade eine GPX-Datei mit Höheninformationen hoch."
}
```

---

## 10.2 GET `/api/terrain/data`

### Purpose
Lädt oder berechnet vereinfachte Terrain- und Gebäudedaten für den 3D-Viewer.

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---:|---|
| gpxUrl | string | yes | Referenz zur GPX-Datei |
| shape | string | yes | `circle` oder `hexagon` |
| buildings | boolean | no | Gebäude anzeigen |
| quality | string | no | `mobile`, `preview`, `desktop` |

### Success Response

```json
{
  "success": true,
  "terrain": {
    "heightmapUrl": "https://...",
    "bounds": {},
    "resolution": 128
  },
  "buildings": {
    "available": true,
    "features": []
  }
}
```

---

## 10.3 POST `/api/shopify/cart`

### Purpose
Produkt mit Line Item Properties zum Shopify-Warenkorb hinzufügen.

### Request

```json
{
  "variantId": "gid://shopify/ProductVariant/123456789",
  "quantity": 1,
  "properties": {
    "GPX Datei": "https://storage.example.com/gpx/uuid.gpx",
    "Form": "Hexagon",
    "Route Farbe": "Orange",
    "Terrain Farbe": "Weiß",
    "Gebäude": "Ja",
    "Elevation Scale": "2",
    "Name": "Max Mustermann",
    "Event": "Berlin Marathon",
    "Datum": "2026-09-27",
    "Zeit": "03:42:10",
    "Distanz": "42,2 km"
  }
}
```

### Success Response

```json
{
  "success": true,
  "cartUrl": "https://shop.example.com/cart"
}
```

---

# 11. Success Criteria

## MVP Success Definition

Der MVP ist erfolgreich, wenn ein Kunde auf Desktop und Mobile eine GPX-Datei hochladen, Route und Terrain visuell prüfen, das Poster als Mockup sehen und eine Bestellung mit verknüpfter GPX-Datei in Shopify abschließen kann.

---

## Functional Requirements

- [ ] GPX Upload funktioniert zuverlässig
- [ ] GPX ohne Höhenwerte wird abgelehnt
- [ ] Route wird in 2D angezeigt
- [ ] Kreis und Hexagon sind auswählbar
- [ ] Out-of-bounds Warnung funktioniert
- [ ] 3D Terrain wird dargestellt
- [ ] Gebäude können optional angezeigt werden
- [ ] Elevation Scale 1–3 funktioniert
- [ ] Farbwahl aktualisiert Vorschau
- [ ] Skeleton Preview erscheint während Ladezeiten
- [ ] Poster-Mockup zeigt manuelle Textdaten
- [ ] Add-to-Cart funktioniert
- [ ] Shopify-Bestellung enthält GPX-Referenz
- [ ] Mobile Touchsteuerung funktioniert

---

## Quality Indicators

- 3D Viewer läuft flüssig auf aktuellen Smartphones
- Kunden verstehen den Flow ohne Erklärung
- Ladezustände wirken hochwertig und nicht kaputt
- Fehlertexte sind freundlich und verständlich
- Shop-Betreiber kann GPX-Datei aus Bestellung abrufen

---

## User Experience Goals

- Der Flow fühlt sich wie ein Premium-Konfigurator an
- Die 3D-Vorschau erzeugt einen Wow-Effekt
- Die App wirkt nicht wie ein technisches GIS-Tool
- Mobile Bedienung ist genauso wichtig wie Desktop

---

# 12. Implementation Phases

## Phase 1: Foundation & GPX Upload

### Goal
Grundlage für den Konfigurator schaffen und GPX-Dateien zuverlässig verarbeiten.

### Deliverables

- [ ] Next.js Projektsetup
- [ ] Designsystem-Grundlage
- [ ] Stepper-Flow `Upload → 2D → 3D → Mockup → Cart`
- [ ] GPX Upload UI
- [ ] GPX Parsing
- [ ] Höhenwert-Prüfung
- [ ] Storage Integration
- [ ] Fehlerzustände

### Validation Criteria

- Eine gültige GPX-Datei kann hochgeladen werden
- Eine GPX-Datei ohne Höhenwerte wird abgelehnt
- Upload-Referenz wird gespeichert

### Estimated Timeline
1–2 Wochen

---

## Phase 2: 2D Map Viewer

### Goal
Route in 2D sichtbar machen und Ausschnittslogik implementieren.

### Deliverables

- [ ] MapLibre / OSM Integration
- [ ] Route Rendering
- [ ] Automatische Bounds-Berechnung
- [ ] Kreis Overlay
- [ ] Hexagon Overlay
- [ ] Zoomsteuerung
- [ ] Out-of-bounds Validierung
- [ ] Responsive Map Layout

### Validation Criteria

- Route erscheint korrekt auf Karte
- Kreis/Hexagon werden korrekt angezeigt
- Warnung erscheint bei Route außerhalb der Form

### Estimated Timeline
1–2 Wochen

---

## Phase 3: 3D Terrain Viewer

### Goal
Produktnahe Terrain-Vorschau mit Route, Gebäuden und Farboptionen erstellen.

### Deliverables

- [ ] Three.js / React Three Fiber Setup
- [ ] Terrain Mesh Rendering
- [ ] Monochromes Materialsystem
- [ ] Route auf Terrainoberfläche
- [ ] Sichtbarer Rand/Sockel
- [ ] Elevation Scale Slider 1–3
- [ ] Gebäude Toggle
- [ ] Einfache Gebäude-Extrusion
- [ ] Farbpaletten
- [ ] Touch- und Maussteuerung
- [ ] Skeleton Preview
- [ ] Mobile Performance Optimierung

### Validation Criteria

- Viewer funktioniert auf Desktop und Mobile
- Modell ist flüssig bedienbar
- Route, Terrain, Sockel und optionale Gebäude sind sichtbar

### Estimated Timeline
3–5 Wochen

---

## Phase 4: Poster Mockup & Shopify Integration

### Goal
Finale Produktvorschau und Bestellung ermöglichen.

### Deliverables

- [ ] Poster-Mockup UI
- [ ] Darstellung des 12-cm-Ausschnitts
- [ ] Manuelle Eingabefelder
- [ ] Validierung der Pflichtfelder
- [ ] Shopify Add-to-Cart
- [ ] Line Item Properties
- [ ] GPX-Referenz in Bestellung
- [ ] Finaler responsiver Polish

### Validation Criteria

- Kunde kann Produkt in Warenkorb legen
- Bestellung enthält GPX-Link und Kundendaten
- Poster-Mockup wirkt produktnah

### Estimated Timeline
1–2 Wochen

---

# 13. Future Considerations

## Post-MVP Enhancements

- Automatische 3MF-Erstellung
- Automatische STL-Erstellung
- Admin-Dashboard für Produktionsdaten
- Gespeicherte Kundenprojekte
- Mehrere GPX-Dateien kombinieren
- Automatische GPX-Stat-Berechnung
- Dynamische Preisberechnung
- Preview-Screenshot in Bestellung speichern
- Produktvarianten nach Rahmen/Farben/Material
- Kundenkonto mit Reorder-Funktion

---

## Integration Opportunities

- Shopify App statt Theme Embed
- Strava Import
- Komoot Import
- Garmin Connect Import
- Fulfillment- oder Printfarm-Integration
- Automatisierte Produktionswarteschlange

---

## Advanced Features

- Routenanimation im 3D-Viewer
- Höhenprofil unterhalb der Karte
- Start/Ziel Marker
- Gravur-Optionen
- Geschenkverpackung
- Wandhalterung oder Standfuß als Upsell
- Qualitätsmodi für Desktop/Mobile

---

# 14. Risks & Mitigations

## Risk 1: 3D Performance auf Mobile

### Risiko
Terrain, Route und Gebäude können auf mobilen Geräten zu hoher GPU-Last führen.

### Mitigation

- Mobile Quality Mode
- Reduzierte Mesh-Auflösung
- Skeleton Preview
- Progressive Rendering
- Gebäude optional deaktivierbar

---

## Risk 2: GPX-Dateien enthalten schlechte oder fehlende Höhenwerte

### Risiko
Einige GPX-Dateien enthalten keine oder fehlerhafte Elevation-Daten.

### Mitigation

- Höhenwert-Prüfung direkt nach Upload
- Freundliche Fehlermeldung
- Klare Upload-Hinweise
- Kein automatisches Reparieren im MVP

---

## Risk 3: Gebäudedaten sind nicht überall verfügbar

### Risiko
OSM-Gebäudedaten können je nach Region fehlen oder unvollständig sein.

### Mitigation

- Gebäude als optionales Feature
- Freundliche Meldung bei fehlenden Daten
- Terrain-Vorschau bleibt weiterhin nutzbar

---

## Risk 4: Scope Creep durch Produktionsautomatisierung

### Risiko
Automatische 3MF-/STL-Erstellung könnte den MVP stark verzögern.

### Mitigation

- Produktion bleibt manuell
- 3MF explizit out of scope
- Fokus auf Vorschau und Shopify-Bestellung

---

## Risk 5: Shopify speichert Dateien nicht ideal für diesen Anwendungsfall

### Risiko
Shopify ist nicht primär als GPX-Dateispeicher gedacht.

### Mitigation

- Datei extern speichern
- Nur Referenz in Shopify Line Item Properties speichern
- Klare Zuordnung über Bestellung

---

# 15. Appendix

## Related Documents

- Dieses PRD: `.agents/PRDs/PRD.md`

---

## Key Dependencies

| Dependency | Purpose |
|---|---|
| Shopify | Shop, Warenkorb, Bestellung |
| OpenStreetMap | 2D Kartenbasis |
| MapLibre GL JS | 2D Viewer |
| Three.js | 3D Viewer |
| React Three Fiber | React-Integration für 3D |
| GPX Parser | GPX-Verarbeitung |
| Cloud Storage | GPX-Dateien speichern |

---

## Terminology

| Begriff | Bedeutung |
|---|---|
| GPX | GPS Exchange Format für Routen |
| DEM | Digital Elevation Model / Höhendaten |
| Terrain | 3D-Höhenmodell des Kartenausschnitts |
| Bounding Shape | Kreis oder Hexagon um Route |
| Line Item Properties | Shopify-Metadaten an Warenkorb-/Bestellposition |
| Skeleton Preview | Platzhalter-Vorschau während Ladezeit |

---

## Assumptions Made

- Die Produktion des finalen 3D-Drucks erfolgt im MVP manuell.
- Shopify soll primär GPX-Referenz und manuelle Kundendaten speichern.
- Der 3D Viewer ist eine Vorschau und kein CAD- oder Produktionssystem.
- Das finale physische Terrain hat 12 cm Durchmesser beziehungsweise eine vergleichbare Hexagon-Größe.
- Gebäude werden im MVP als einfache Blöcke dargestellt.
- Performance ist wichtiger als maximale topografische Detailtreue.
- Kundendaten wie Distanz, Zeit und Event werden manuell eingegeben.

---

# PRD Created

**File**: `.agents/PRDs/PRD.md`

**Product**: Terrain Poster Configurator

**Problem**: Kunden können ihre persönlichen GPX-Routen aktuell nicht einfach, visuell überzeugend und produktnah als 3D-Terrain-Poster konfigurieren.

**Solution**: Ein Shopify-integrierter Web-Konfigurator mit GPX Upload, 2D-Routenvorschau, 3D-Terrain-Preview, Poster-Mockup und Speicherung der GPX-Referenz zur manuellen Produktion.

## Sections Summary

- 9 user stories defined
- 30+ MVP features in scope
- 4 implementation phases
- 5 risks identified

## Assumptions Made

- Produktion bleibt im MVP manuell
- Keine automatische 3MF-/STL-Erstellung
- GPX-Datei wird extern gespeichert, Shopify speichert die Referenz
- Kunden geben Postertexte manuell ein
- 3D-Viewer ist Preview-only

## Recommended Next Steps

1. Review und Feinabstimmung des PRD
2. UX-Wireframes für die fünf Schritte erstellen
3. Technischen Prototyp für GPX Upload + 2D Map bauen
4. 3D Terrain Viewer früh als Proof of Concept testen
5. Danach Implementierungsplan auf Basis dieses PRD erstellen
