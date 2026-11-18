import http from "node:http";
import { createApp } from "./app.ts";
import { config } from "./config.ts";
import { pool } from "./db/pool.ts";
import { migrate } from "./db/migrate.ts";
import { attachWebsocket } from "./ws/hub.ts";

const app = createApp();
const server = http.createServer(app);
attachWebsocket(server);

await migrate();

server.listen(config.port, () => {
  console.log(`api listening on ${config.port}`);
});

async function shutdown() {
  server.close();
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
