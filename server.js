require("dotenv").config();

const http = require("http");
const config = require("config");

const app = require("./app");
const { initializeSocket } = require("./socket");
const { startWorkers } = require("./workers/index");


const server = http.createServer(app);

initializeSocket(server);

const port = process.env.PORT || config.get("Port");

server.listen(port, () => {
  console.log(`Workstation API running on port ${port}`);

  startWorkers();
});
