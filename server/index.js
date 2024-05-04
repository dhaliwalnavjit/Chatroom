const express = require("express");
const http = require("http");
const cors = require("cors");

const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");

const corsOptions = {
  origin: process.env.clientURL || "http://localhost:3000",
  credentials: true,
  optionSuccessStatus: 200,
};

const router = require("./router");

const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: corsOptions,
});
io.on("connection", (socket) => {
  socket.on("join", ({ name, room }, callback) => {
    const { user, error } = addUser({ name, room, id: socket.id });
    if (error) return callback(error);
    socket.emit("message", {
      user: "admin",
      text: `${user.name} welcome to the room ${user.room}`,
    });
    socket.broadcast
      .to(user.room)
      .emit("message", { user: "admin", text: `${user.name} has joined` });
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });
    socket.join(user.room);
    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit("message", { user: user.name, text: message });
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", {
        user: "Admin",
        text: `${user.name} has left.`,
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

app.use(cors(corsOptions));

app.use(router);

server.listen(PORT, () => console.log(`server has started on port ${PORT}`));
