[![pipeline status](https://gitlab.heigit.org/climate-action/web-app/badges/main/pipeline.svg)](https://gitlab.heigit.org/climate-action/web-app/-/commits/main)
[![Latest Release](https://gitlab.heigit.org/climate-action/web-app/-/badges/release.svg)](https://gitlab.heigit.org/climate-action/web-app/-/releases)
[![coverage report](https://gitlab.heigit.org/climate-action/web-app/badges/main/coverage.svg)](https://gitlab.heigit.org/climate-action/web-app/-/commits/main)

# Climate Action Navigator

![Alt text](docs/screenshot.jpg?raw=true 'Dashboard Screenshot')

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About the Project</a>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
    	  <li><a href="#backend-server">Backend Server</a></li>
        <li><a href="#code-formatting--pre-commit-hook">Code Formatting & Pre-commit Hook</a></li>
      </ul>
    </li>
    <li><a href="#build">Build</a></li>
    <li><a href="#docker">Docker</a></li>
    <li><a href="#incident--maintenance-announcements">Incident & Maintenance Announcements</a></li>
    <li><a href="#tests">Tests</a></li>
    <li><a href="#references">References</a></li>
    <li><a href="#attribution">Attribution</a></li>
  </ol>
</details>

## About the Project

This is the repository of the frontend website of HeiGIT's [Climate Action](https://heigit.org/climate-action/) project. Visit the [Demo Website](https://staging.climate-action.heigit.org/dashboard) to view the current status of the dashboard, and access the available plugins.

## Getting Started

### Prerequisites

- [pnpm](https://pnpm.io/installation)
- Angular CLI `pnpm install -g @angular/cli`
- [Docker Engine](https://docs.docker.com/engine/install/) for Linux or [Docker Desktop](https://docs.docker.com/desktop/) for Mac/Windows in case you wish to run the backend server

### Installation

1. Clone the repository locally
2. Run `pnpm install` to install the dependencies
3. Create the configuration file:
    - Copy `src/assets/env.template.js` to `src/assets/env.js`
    - Edit `env.js` with your settings:
        - `ENVIRONMENT_TYPE`: Set to `'development'` for local development
        - `GEOCODE_API_KEY`: Get an API key from [HeiGIT](https://account.heigit.org/) for the Search function
        - `CLIMATE_ACTION_API_URL`: Set to `'api/v1/gateway'` for local development with the backend
        - Other values can typically use the defaults provided
4. Run `pnpm dev` or `ng serve` to start the dev server
5. Navigate to `http://localhost:4200/`

The application will automatically reload if you change any of the source files.

**Note**: The `src/assets/env.js` file contains configuration for local development. For production deployments, these values are injected at runtime via environment variables (see Docker section below).

### Backend Server

To see more than the raw website and access the plugins, you will need to set up a local dev environment of the [Climate Action Infrastructure](https://gitlab.heigit.org/climate-action/infrastructure).

Make sure to start at least one plugin along with the API Gateway, for example `docker compose up -d ca-plugin-blueprint ca-api-gateway`

### Code Formatting & Pre-commit Hook

Formatting is enforced automatically – there is nothing to activate or configure manually:

- [Prettier](https://prettier.io/) formats all code and organizes/sorts imports. Configuration lives in `.prettierrc.json`.
- A pre-commit hook ([husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged)) runs Prettier on staged files at every commit. The hook is installed automatically by `pnpm install` (via the `prepare` script) – no further setup needed.

To format the whole project manually, run `pnpm exec prettier --write .`

## Build

Run `pnpm build` to build the project. The application is built as a single, environment-agnostic bundle that can be configured at runtime via environment variables.

## Docker

The web app is [Dockerised](Dockerfile) with runtime configuration support.

### Building the Docker image

```shell
docker build . --tag repo.heigit.org/climate-action/web-app:{image_tag}
```

### Running with environment variables

```shell
docker run --publish 8080:80 \
  -e ENVIRONMENT_TYPE="development" \
  -e CLIMATE_ACTION_API_URL="http://localhost/api/v1/gateway" \
  -e GEOCODE_API_KEY="your-ors-api-key" \
  -e APPWRITE_PROJECT_ID="your-project-id" \
  -e APPWRITE_ENDPOINT="appwrite-api-endpoint" \
  -e APPWRITE_WEBSITE_URL="appwrite-frontend" \
  repo.heigit.org/climate-action/web-app:{image_tag}
```

Then head to [localhost:8080](http://localhost:8080).

### Pushing to [Docker Hub](https://repo.heigit.org/climate-action)

```shell
docker image push repo.heigit.org/climate-action/web-app:{image_tag}
```

**Note**: The same Docker image can be used for all environments (development, staging, production - if compatible) by simply changing the environment variables at runtime.

## Incident & Maintenance Announcements

Incident and maintenance announcements are fetched from [Cachet](https://cachethq.io/) and displayed in the web app.

- The Cachet URL is stored in the `CACHET_URL` environment variable.
- The watched components are stored in the `CACHET_WATCHED_COMPONENTS` environment variable. This is a comma-separated list of `Group: Component` pairs (e.g. `Climate Action: Climate Action Navigator, OpenRouteService: Directions API`); an announcement is surfaced only when it references a component whose name **and** parent group match one of these pairs.
- The number of days to look ahead for maintenance announcements is stored in the `SCHEDULE_LOOKAHEAD_DAYS` environment variable.

If Cachet is unreachable, maintenance schedules fall back to a static JSON document, which can be hosted anywhere (e.g. [NPoint](https://npoint.io/)). The full URL of the document is stored in the `FALLBACK_SCHEDULES_URL` environment variable (leave it empty to disable the fallback).
To update the fallback maintenance announcements, simply edit the hosted document, and the changes will be reflected in the web app. The document is an array of announcements shaped like:

```json
[
    {
        "maintenanceType": "Scheduled maintenance",
        "impact": "Expect brief downtime.",
        "downtimeStart": "2026-07-05T06:00:00Z",
        "downtimeEnd": "2026-07-05T08:00:00Z"
    }
]
```

## Tests

Run `pnpm test:all` to execute the unit & integration tests on [Jest](https://jestjs.io/) and E2E tests on [Cypress](https://www.cypress.io/).
For the cypress tests to succeed you will need a running instance of your app (see 4. under [Installation](#Installation)).
Additionally, for interactive cypress runs using `cy:open` you need to make sure your test-browser is set to English.

## References

- [Matplotlib Colormaps](https://matplotlib.org/stable/users/explain/colors/colormaps.html)

## Attribution

- Stars background image: Photo by [Olena Bohovyk](https://unsplash.com/@olenkasergienko) on [Unsplash](https://unsplash.com)
