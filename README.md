# Climate Action frontend

# For Developers
This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.2.1.
## Development server

Run `npm install` to install the dependencies.

Run `npm run dev` or `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `npm run build` or `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

### Docker

The tool is also [Dockerised](Dockerfile). To start it, run the following commands

```shell
docker build . --tag heigit/ca-web-app:devel
docker run --publish 8080:80 heigit/ca-web-app:devel
```

then head to [localhost:8080](localhost:8080).

To push a new version to [Docker Hub](https://hub.docker.com/orgs/heigit) run

```shell
docker image push heigit/ca-web-app:devel
```

## Running unit tests

Run `npm run test` or `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

Style support from [Colorlib Adminator](https://github.com/puikinsh/Adminator-admin-dashboard)
