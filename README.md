# ws

## the backend application created for StackIt.cash

Intended implementation will handle the following components & services

* TypeScript
* Express.js
* NodeJS
* Unit Tests via Jasmine
* BDD via cucumber-ts
* TypeDoc
* Karma Code Coverage
* Mermaid for diagrams

Possible implementation of ProtoBuf.

Possible implementation of Web interface running on NGINX.

Possible implementation of Flutter UI.

## Payment Dependencies

* Moonpay
* Stripe

## Database Dependencies

* SqLite

## Node.js Dependency

* Targeting version `24.12.0` LTS

```bash
nvm -v
nvm install 24.12.0
nvm use 24.12.0
```

## Run local database container.  Docker Desktop must be installed and active internet connection to download images

```bash
docker-compose up -d
```

## Local Dababase connect through CLI

```bash
docker exec -it my_postgres psql -U myuser -d mydb
```

```http
GET http://localhost/health HTTP/1.1

###
GET http://localhost/api/session HTTP/1.1

### Reset Data for demonstration of transaction processing
GET http://localhost/reset HTTP/1.1

```
