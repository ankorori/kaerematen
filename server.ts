import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { RoomManager } from "./server/rooms";
import type { ClientToServerEvents, ServerToClientEvents } from "./lib/types";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
  const manager = new RoomManager(io);

  io.on("connection", (socket) => {
    socket.on("create_room", (ack) => {
      ack(manager.createRoom());
    });

    socket.on("join", (payload, ack) => {
      manager.handleJoin(socket, payload, ack);
    });

    socket.on("watch", (payload, ack) => {
      manager.handleWatch(socket, payload, ack);
    });

    socket.on("start_game", () => manager.handleStart(socket));
    socket.on("submit_answer", (payload) => manager.handleSubmit(socket, payload));
    socket.on("force_match", () => manager.handleForceMatch(socket));
    socket.on("restart_game", () => manager.handleRestart(socket));
    socket.on("disconnect", () => manager.handleDisconnect(socket));
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
