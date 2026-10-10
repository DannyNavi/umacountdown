# Exile World

A shared atlas of where people live. Click the map to drop a pin. The map and every pin are rendered on the server, so a refresh anywhere shows the same homes.

## Run it locally

```bash
npm install
npm run dev
```

You need Node.js 22.18 or newer. Open [http://127.0.0.1:47291](http://127.0.0.1:47291).

Local development runs in the Cloudflare Workers runtime. Pins are stored in a local D1 database, and the `pins` table is created the first time the atlas is opened.

## Deploy to Cloudflare Workers

From the project directory:

```bash
npx cf auth login
npx cf d1 create --name exile-world
```

Copy the database id from that command into `cloudflare.config.ts`, on the `DB` binding:

```ts
DB: bindings.d1({ name: "exile-world", id: "<database-id>" }),
```

Then create the table and publish the Worker:

```bash
npx cf d1 migrations apply <database-id> --dir migrations
npm run deploy
```

`npm run deploy` builds the app and publishes one Worker. Homes live in that D1 database. Workers and D1 both have a free tier that covers a small shared atlas.

## How the shared map works

- The home page is rendered on each request. It reads D1 and draws the world, including every pin, before the browser takes over.
- Dropping a pin sends `POST /api/pins`. The Worker writes the row, and the next render includes that pin.
- Open pages ask `GET /api/pins` every few seconds, so a pin dropped in one browser shows up in the others without a reload.

There is no account system: anyone who can open the app can add a home, and pins are not deleted from the interface. The place is required. The name can be left blank, and that home is shown as Anonymous. The atlas holds at most 500 homes.

Major countries are named on the map. The largest are labeled in the world view; closer countries appear as you zoom in.
