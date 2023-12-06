# Climate Action frontend

## Installation

Run `npm install` to install the dependencies.
Make sure the [Angular CLI](https://angular.io/cli) is properly installed.

## Development server

Run `npm run dev` for a dev server and navigate to `http://localhost:4200/`.
The application will automatically reload if you change any of the source files.

Yet, to see more than the raw website (i.e. any functionality) you need to set up a local dev environment of the [Climate Action Infrastructure](https://gitlab.gistools.geog.uni-heidelberg.de/climate-action/infrastructure).
Make sure to start at least one plugin.

## Build

Run `npm run build:{build_target}` to build the project.
Currently available `build_target`s are 

 - staging
 - prod

### Docker

The tool is also [Dockerised](Dockerfile). To start it, run the following commands

```shell
docker build --build-arg BUILD_TARGET={build_target} . --tag heigit/ca-web-app:devel
docker run --publish 8080:80 heigit/ca-web-app:devel
```

then head to [localhost:8080](localhost:8080).

To push a new version to [Docker Hub](https://hub.docker.com/orgs/heigit) run

```shell
docker image push heigit/ca-web-app:devel
```

## Running unit tests

Run `npm run test` to execute the unit and integration tests via [Karma](https://karma-runner.github.io).