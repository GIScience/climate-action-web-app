# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project mostly adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://gitlab.heigit.org/climate-action/web-app/-/compare/3.4.0...main)

### Changed

- Hook into Cachet to fetch upcoming maintenance schedules and display them as toasts ([#414](https://gitlab.heigit.org/climate-action/web-app/-/issues/414))

### Added

- Fetch active incidents from Cachet affecting upstream services and display them as toasts ([#421](https://gitlab.heigit.org/climate-action/web-app/-/issues/421))
- Allow users to upload GeoJSON, KML, and GPX files as AoI ([#376](https://gitlab.heigit.org/climate-action/web-app/-/issues/376))

### Fixed

- Make the custom AoI name field call out for attention when empty, to indicate it is required ([#478](https://gitlab.heigit.org/climate-action/web-app/-/issues/478))

## [3.4.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/3.4.0) - 2026-06-03

### Changed

- Updated Angular (and associated libraries) to v21
- Made Geocode & Maps URL an environment variable, and switched to new api.heigit.org service

### Added

- Derive plugin online/offline status from the API, and indicate offline plugins in the plugin catalog ([#272](https://gitlab.heigit.org/climate-action/web-app/-/issues/272))

### Fixed

- Pipeline now fails fast on test failures ([#461](https://gitlab.heigit.org/climate-action/web-app/-/issues/461))
- Labels for continuous legends can now wrap up to 2 lines ([#465](https://gitlab.heigit.org/climate-action/web-app/-/issues/465))
- Scope FoW to individual map instances to prevent hijacking between report items
- Use a UUID based identifier for artifacts in the report, to prevent incorrect collision checks

## [3.3.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/3.3.0) - 2026-04-23

### Added

- Computations can now be requested in supported languages other than English
- Allow the use of x-mark-important to force a parameter one level up

### Fixed

- Legend category toggles still activate after returning from report instantiation
- Plugin parameter groups (mapping input) appear in dedicated dialogs, with required and optional fields separated ([#458](https://gitlab.heigit.org/climate-action/web-app/-/issues/458))

### Changed

- Collapse-out optional plugin-parameters into a dialogue only if they exceed 3

## [3.2.1](https://gitlab.heigit.org/climate-action/web-app/-/releases/3.2.1) - 2026-03-26

### Fixed

- "Missing translation" warnings on language switch that crashed the console

## [3.2.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/3.2.0) - 2026-03-26

### Added

- Ability to toggle visibility of vector layer categories via the legend ([#162](https://gitlab.heigit.org/climate-action/web-app/-/issues/162))

### Fixed

- Plugin Name should now reflect correctly in all places (for e.g. toasts) ([#442](https://gitlab.heigit.org/climate-action/web-app/-/issues/442))
- Raster resampling has been set to nearest neighbour, and thus sharper/accurate rendering of GeoTIFFs
- Longer list of artifacts do not get clipped anymore ([#454](https://gitlab.heigit.org/climate-action/web-app/-/issues/454))
- Timestamp formatting matches the selected language's locale ([#457](https://gitlab.heigit.org/climate-action/web-app/-/issues/457))
- Maintenance Announcements path now uses an external service (NPoint) to host the JSON document

### Removed

- Removed all OpenLayers dependencies and patterns

## [3.1.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/3.1.0) - 2026-03-03

### Added

- Lazy loading implemented for bigger libraries (Plotly, jsPDF) to reduce initial bundle size
- Dynamically import components as necessary to chunk the application further
- User defined parameters are now highlighted when viewing Computation parameters
- Demo computations are now displayed with a badge in the list ([#441](https://gitlab.heigit.org/climate-action/web-app/-/issues/441))

### Fixed

- Define and use a cache for Jest in dev and pipeline
- Fix longer artifacts getting clipped in the viewer without a scrollbar ([#431](https://gitlab.heigit.org/climate-action/web-app/-/issues/431))
- Legends are now included in the PDF export ([#423](https://gitlab.heigit.org/climate-action/web-app/-/issues/423))

### Changed

- Adapt to updated backend library (Climatoology v7)

## [3.0.3](https://gitlab.heigit.org/climate-action/web-app/-/releases/3.0.3) - 2025-12-16

### Fixed

- Fix nginx URL rewrite to work regardless of trailing slash

## [3.0.2](https://gitlab.heigit.org/climate-action/web-app/-/releases/3.0.2) - 2025-12-16

### Added

- Set caching to 1 year for hashed assets served by nginx

### Fixed

- Fix misclicks on search location suggestions caused by cursor microdrags
- Fix URL rewrite for /webapp to be able to handle old share links

## [3.0.1](https://gitlab.heigit.org/climate-action/web-app/-/releases/3.0.1) - 2025-12-10

### Fixed

- Fix black pixel (nodata) handling in GeoTIFFs to match previous OL workaround
- Added a link to take the user home in the 404 (Page not found) page

## [3.0.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/3.0.0) - 2025-12-09

### Changed

- Switched the map library to [MapLibre](https://maplibre.org/maplibre-gl-js/docs/), and we now have vector basemaps via [Versatiles](https://github.com/versatiles-org/versatiles-style) tiles and styles (using Shortbread schema) ([#180](https://gitlab.heigit.org/climate-action/web-app/-/issues/180))
- Computations are now paginated during fetch from Appwrite, also switched storage to be Appwrite first (and switch to local for fallback) ([#337](https://gitlab.heigit.org/climate-action/web-app/-/issues/337))
- Switched to Globe Projection on load, which spins while in Landing view ([#174](https://gitlab.heigit.org/climate-action/web-app/-/issues/174))
- Primary/Secondary artifacts are not folded under a 'Show More' view anymore; rather primary artifacts are grouped and displayed under a 'main' tag ([#258](https://gitlab.heigit.org/climate-action/web-app/-/issues/258))
- Move the artifact's 'Download' & 'Detailed Description' to be accessible directly from the list overview ([#96](https://gitlab.heigit.org/climate-action/web-app/-/issues/96))
- Replace requests to WMS + GetFeatureInfo with Vector Tile Server + OGC API, for Ohsome Boundaries ([#387](https://gitlab.heigit.org/climate-action/web-app/-/issues/387))
- AoI name for computation is picked based on currently selected language ([#324](https://gitlab.heigit.org/climate-action/web-app/-/issues/324))
- Updated Angular (and associated libraries) to v20

### Added

- Provide ability within Report Builder to export it to PDF ([#298](https://gitlab.heigit.org/climate-action/web-app/-/issues/298))
- Users can now (soft)delete computations from the list
- Simple in-memory cache for `/metadata` responses ([#155](https://gitlab.heigit.org/climate-action/web-app/-/issues/155))
- Artifacts are now grouped and filterable under each computation ([#260](https://gitlab.heigit.org/climate-action/web-app/-/issues/260))
- Plotly control added to view plots in fullscreen, especially useful for dense treemaps
- App will now check for upcoming maintenance entries and display a toast on launch ([#357](https://gitlab.heigit.org/climate-action/web-app/-/issues/357))
- Interface has been made multi-lingual, with German|Deutsch offered as an option for now ([#54](https://gitlab.heigit.org/climate-action/web-app/-/issues/54))
- Display live area in km² when using the Circle or Rectangle drawing tool ([#405](https://gitlab.heigit.org/climate-action/web-app/-/issues/405))
- Add functionality to add up to 2 geo-results to the map at the same time ([#355](https://gitlab.heigit.org/climate-action/web-app/-/issues/355))

### Fixed

- Landing page now displays last computation details only, since we do only paginated fetches when required
- Periodic sync for scheduled computations isn't broken by switching between browser tabs ([#378](https://gitlab.heigit.org/climate-action/web-app/-/issues/378))
- Scheduled runs are more stable and shouldn't vanish randomly ([#404](https://gitlab.heigit.org/climate-action/web-app/-/issues/404))

## [2.5.1](https://gitlab.heigit.org/climate-action/web-app/-/releases/2.5.1) - 2025-07-21

### Fixed

- Set custom HTTP headers only in 'dev' environment

## [2.5.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/2.5.0) - 2025-07-17

### Added

- Custom areas can now be drawn on the map and used for computations ([#127](https://gitlab.heigit.org/climate-action/web-app/-/issues/127))
- Limited set of controls now provided within Plotly charts, including export as JPEG ([#98](https://gitlab.heigit.org/climate-action/web-app/-/issues/98))
- App name and version is now included in API calls header ([#374](https://gitlab.heigit.org/climate-action/web-app/-/issues/374))

## [2.4.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/2.4.0) - 2025-06-27

### Changed

- Updated Angular (and associated libraries) to v19

### Added

- A badge for plugins if their development state differs from "active"
- Product Walkthrough to guide first-time users through their first computation ([#296](https://gitlab.heigit.org/climate-action/web-app/-/issues/296))
- Partial failures in computations (missing artifacts) are now conveyed to the user ([#312](https://gitlab.heigit.org/climate-action/web-app/-/issues/312))

### Fixed

- Toasts are now much more stable, and provide more context about states in general ([#341](https://gitlab.heigit.org/climate-action/web-app/-/issues/341))

## [2.3.1](https://gitlab.heigit.org/climate-action/web-app/-/releases/2.3.1) - 2025-05-21

### Added

- Added a warning for those visiting from mobile devices

### Fixed

- Display the correct timestamp of the computations after converting from UTC ([#349](https://gitlab.heigit.org/climate-action/web-app/-/issues/349))
- Fix CSS glitch preventing further navigation on MacOS Safari ([#351](https://gitlab.heigit.org/climate-action/web-app/-/issues/351))

## [2.3.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/2.3.0) - 2025-05-14

### Changed

- Demo computations are now pre-fetched and displayed for a new user ([#336](https://gitlab.heigit.org/climate-action/web-app/-/issues/336))

## [2.2.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/2.2.0) - 2025-05-13

### Changed

- The custom JSONSchema parser was replaced with a slight adaption of the Formly-provided parser
- Date input is now shown in a more human friendly manner
- It was decided to call the website `Climate Action Navigator` hence all occurrences were
  renamed ([#251](https://gitlab.heigit.org/climate-action/web-app/-/issues/251))
- Compute Panel has been reorganised and UI elements distributed. Optional Attributes open in a new dialog. ([#263](https://gitlab.heigit.org/climate-action/web-app/-/issues/263))\
- Default map set to Carto Positron and layer opacity set to 0.8 for better colour accuracy ([#328](https://gitlab.heigit.org/climate-action/web-app/-/issues/328))

- Moved the Unit Testing Framework from Karma to
  Jest ([#303](https://gitlab.heigit.org/climate-action/web-app/-/issues/303))
- A new charting library (Plotly) is implemented to handle updated charts from the backend ([#287](https://gitlab.heigit.org/climate-action/web-app/-/issues/287))

### Fixed

- Now supporting mapping/grouping input fields ([#145](https://gitlab.heigit.org/climate-action/web-app/-/issues/145))

### Added

- Added a report builder to the dashboard to view multiple artifacts at
  once ([#210](https://gitlab.heigit.org/climate-action/web-app/-/issues/210))
- Users can now request a demo computation, if the plugin provides that functionality
- Computations can now be shared and imported between
  users ([#116](https://gitlab.heigit.org/climate-action/web-app/-/issues/116))
- The user now gets informed about the reason for a failed computation (if the plugin provides this
  information) ([#240](https://gitlab.heigit.org/climate-action/web-app/-/issues/240))
- Compute now requires User Authentication by means of the HeiGIT Account (implemented via Appwrite) ([#37](https://gitlab.heigit.org/climate-action/web-app/-/issues/37))
- User's local Computations IDs are now synced to the Appwrite database
- We now have a logo! ([#270](https://gitlab.heigit.org/climate-action/web-app/-/issues/270))

## [2.1.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/2.1.0) - 2025-01-29

### Changed

- Removed backwards compatibility for AoI with the old backend
- Change visual anchor for continuous legend ticks to triangle markers instead of
  hyphens ([#250](https://gitlab.heigit.org/climate-action/web-app/-/issues/250))

### Fixed

- Refactored types and names of interfaces to match the backend
- Allow accessing computations even if plugin is
  offline ([#167](https://gitlab.heigit.org/climate-action/web-app/-/issues/167))

### Added

- Landing page now displays a summary for revisiting
  users ([#182](https://gitlab.heigit.org/climate-action/web-app/-/issues/182))
- Display computation parameters in a dialog ([#206](https://gitlab.heigit.org/climate-action/web-app/-/issues/206))
- Default opacity of GeoJSON and GeoTIFF layers is now set to 0.6 (instead of
  1.0) ([#253](https://gitlab.heigit.org/climate-action/web-app/-/issues/253))
- Greyscale basemap option ([#252](https://gitlab.heigit.org/climate-action/web-app/-/issues/252))
- Change legend title to layer name ([#239](https://gitlab.heigit.org/climate-action/web-app/-/issues/239))

- Use Prettier for code formatting

## [2.0.0](https://gitlab.heigit.org/climate-action/web-app/-/releases/2.0.0) - 2024-12-17

### Fixed

- Rename default soil consumption to land
  consumption ([#148](https://gitlab.heigit.org/climate-action/web-app/-/issues/148))
- Always override the default icons in the plugin
  catalog ([#64](https://gitlab.heigit.org/climate-action/web-app/-/issues/64))
- Utilises new 'computation/state' endpoint to check computation state, to fix scheduled runs disappearing
  randomly ([#238](https://gitlab.heigit.org/climate-action/web-app/-/issues/238))
- Fix multiple usability issues concerning starting a new
  computation ([#183](https://gitlab.heigit.org/climate-action/web-app/-/issues/183))

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
