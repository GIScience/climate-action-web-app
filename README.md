[![pipeline status](https://gitlab.gistools.geog.uni-heidelberg.de/climate-action/web-app/badges/main/pipeline.svg)](https://gitlab.gistools.geog.uni-heidelberg.de/climate-action/web-app/-/commits/main)
[![Latest Release](https://gitlab.gistools.geog.uni-heidelberg.de/climate-action/web-app/-/badges/release.svg)](https://gitlab.gistools.geog.uni-heidelberg.de/climate-action/web-app/-/releases)
[![coverage report](https://gitlab.gistools.geog.uni-heidelberg.de/climate-action/web-app/badges/main/coverage.svg)](https://gitlab.gistools.geog.uni-heidelberg.de/climate-action/web-app/-/commits/main)

# Climate Action Frontend

![Alt text](docs/screenshot.jpg?raw=true 'Platform Screenshot')

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
      </ul>
    </li>
    <li><a href="#build">Build</a></li>
    <li><a href="#docker">Docker</a></li>
    <li><a href="#unit-tests">Unit Tests</a></li>
  </ol>
</details>

## About the Project

This is the repository of the frontend website of HeiGIT's [Climate Action](https://heigit.org/climate-action/) project. Visit the [Demo Website](https://staging.climate-action.heigit.org/webapp/dashboard) to view the current status of the dashboard, and access the available plugins.

## Getting Started

### Prerequisites

- Node Packet Manager `npm install npm@latest -g`
- Angular CLI `npm install -g @angular/cli`
- [Docker Engine](https://docs.docker.com/engine/install/) for Linux or [Docker Desktop](https://docs.docker.com/desktop/) for Mac/Windows in case you wish to run the backend server

### Installation

Clone the repository locally, and run `npm install` to install the dependencies.

Run `npm run dev` or `ng serve` for a dev server and navigate to `http://localhost:4200/`.
The application will automatically reload if you change any of the source files.

For the Search function to work, you'll need to acquire an API key from our search results provider, [OpenRouteService (ORS)](https://openrouteservice.org/). Once you have the key, fill it in `src/environments/api-keys/keys.ts.example` and rename it to `keys.ts`.

### Backend Server

To see more than the raw website and access the plugins, you will need to set up a local dev environment of the [Climate Action Infrastructure](https://gitlab.gistools.geog.uni-heidelberg.de/climate-action/infrastructure).

Make sure to start at least one plugin along with the API Gateway, for example `docker compose up -d ca-plugin-blueprint ca-api-gateway`

## Build

Run `npm run build:{build_target}` to build the project.
Currently available `build_target`s are

- dev
- staging
- prod

## Docker

The web app itself is also [Dockerised](Dockerfile). To start it, run the following commands

```shell
docker build --build-arg BUILD_TARGET={build_target} . --tag repo.heigit.org/climate-action/web-app:{build_target}
docker run --publish 8080:80 repo.heigit.org/climate-action/web-app:{build_target}
```

Then head to [localhost:8080](localhost:8080).

To push a new version to [Docker Hub](https://repo.heigit.org/climate-action) run

```shell
docker image push repo.heigit.org/climate-action/web-app:{build_target}
```

## Tests

Run `npm run test:all` to execute the unit & integration tests on [Jasmine](https://jasmine.github.io/) via [Karma](https://karma-runner.github.io) and E2E tests on [Cypress](https://www.cypress.io/).

## References

- [Matplotlib Colormaps](https://matplotlib.org/stable/users/explain/colors/colormaps.html)
