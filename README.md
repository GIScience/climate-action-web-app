[![pipeline status](https://gitlab.gistools.geog.uni-heidelberg.de/climate-action/web-app/badges/main/pipeline.svg)](https://gitlab.gistools.geog.uni-heidelberg.de/climate-action/web-app/-/commits/main)
[![Latest Release](https://gitlab.gistools.geog.uni-heidelberg.de/climate-action/web-app/-/badges/release.svg)](https://gitlab.gistools.geog.uni-heidelberg.de/climate-action/web-app/-/releases)
[![coverage report](https://gitlab.gistools.geog.uni-heidelberg.de/climate-action/web-app/badges/main/coverage.svg)](https://gitlab.gistools.geog.uni-heidelberg.de/climate-action/web-app/-/commits/main)

# Climate Action Frontend

![Alt text](/screenshot.jpg?raw=true "Platform Screenshot")

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
docker build --build-arg BUILD_TARGET={build_target} . --tag heigit/ca-web-app:devel
docker run --publish 8080:80 heigit/ca-web-app:devel
```

Then head to [localhost:8080](localhost:8080).

To push a new version to [Docker Hub](https://hub.docker.com/orgs/heigit) run

```shell
docker image push heigit/ca-web-app:devel
```

## Unit Tests

Run `npm run test` to execute the unit and integration tests via [Karma](https://karma-runner.github.io).
