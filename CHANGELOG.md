# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project mostly adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://gitlab.heigit.org/climate-action/web-app/-/compare/2.0.0...main)

### Added

- Landing page now displays a summary for revisiting users ([#182](https://gitlab.heigit.org/climate-action/web-app/-/issues/182))

## [2.0.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/2.0.0) - 2024-12-17

### Fixed

- Rename default soil consumption to land
  consumption ([#148](https://gitlab.heigit.org/climate-action/web-app/-/issues/148))
- Always override the default icons in the plugin catalog ([#64](https://gitlab.heigit.org/climate-action/web-app/-/issues/64))
- Utilises new 'computation/state' endpoint to check computation state, to fix scheduled runs disappearing
  randomly ([#238](https://gitlab.heigit.org/climate-action/web-app/-/issues/238))
- Fix multiple usability issues concerning starting a new computation ([#183](https://gitlab.heigit.org/climate-action/web-app/-/issues/183))

### Added

- Added Layer Switcher to map (now with HeiGIT Carto and Bing Aerial maps), with opacity slider for GeoTIFF/GeoJSON
  layers from artifacts
- Search function to help with finding PoIs during compute, and locations within
  results ([#179](https://gitlab.heigit.org/climate-action/web-app/-/issues/179))
- Compute for any region or locality in the world! Boundaries are now read from the Ohsome API
  server ([#78](https://gitlab.heigit.org/climate-action/web-app/-/issues/78))

- Utilize `geojson-vt` library to render GeoJSON layers in a more performant way
- Added visual regression testing with Cypress
- Adapted compute request to the new Celery backend
- Icons are now fetched from a dedicated endpoint
- In plugin catalog, add plugin name to hover info

## [1.3.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/1.3.0) - 2024-10-14

### Changed

- Reworked Interface to make it more map centric
- Reworked User-Flow from start to finish, consolidated the Plugin Computation and Results screens
- Reorganized the structure of the components to match what's shown in the frontend
- Computations of only the currently selected plugin is now shown
- AoI is now shown in the list of Artifacts ([#109](https://gitlab.heigit.org/climate-action/web-app/-/issues/109))
- User is now informed about the reason behind a failed
  run ([133](https://gitlab.heigit.org/climate-action/web-app/-/issues/133))
- Clicking on vector geodata (GeoJSON results) now opens a tooltip with
  info ([#154](https://gitlab.heigit.org/climate-action/web-app/-/issues/154))

- Updated Angular (and associated libraries) to v17
- Leverage new Artifact Metadata endpoint ([#105](https://gitlab.heigit.org/climate-action/web-app/-/issues/105))

### Removed

- Failed computations are no longer shown

### Fixed

- Lines in linear vector results being too thin ([#139](https://gitlab.heigit.org/climate-action/web-app/-/issues/139))
- continuous legend to be inverted ([#147](https://gitlab.heigit.org/climate-action/web-app/-/issues/147))

### Added

- New Landing Page ([#170](https://gitlab.heigit.org/climate-action/web-app/-/issues/170))
- Many new ROIs to select from ([#22](https://gitlab.heigit.org/climate-action/web-app/-/issues/22))
- Fog of War layer on the map to focus the content on the currently selected area of
  interest ([#158](https://gitlab.heigit.org/climate-action/web-app/-/issues/158))

## [1.2.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/1.2.0) - 2024-06-20

### Changed

- All available plugins are now shown ([#132](https://gitlab.heigit.org/climate-action/web-app/-/issues/132))

### Fixed

- Automatically title-case labels in legends and
  charts ([#124](https://gitlab.heigit.org/climate-action/web-app/-/issues/124))

### Added

- HeiGIT Logo and other formalities required for public
  access ([#126](https://gitlab.heigit.org/climate-action/web-app/-/issues/126))
- Introduced Cypress, an E2E testing framework

## [1.1.1](https://gitlab.heigit.org/climate-action/web-app/-/releases/1.1.1) - 2024-06-17

### Removed

- Google Fonts to reduce external requests ([#80](https://gitlab.heigit.org/climate-action/web-app/-/issues/80))

## [1.1.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/1.1.0) - 2024-06-13

### Added

- Tooltip labels for charts ([#68](https://gitlab.heigit.org/climate-action/web-app/-/issues/68))
- Captions for Artifacts ([#108](https://gitlab.heigit.org/climate-action/web-app/-/issues/108))

## [1.0.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/1.0.0) - 2024-06-10

### Added

- First basic front-end for CA platform
