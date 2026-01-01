const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
require("dotenv").config();

const authRoutes = require("./routes/Auth.js");
const Device = require("./models/Device");
const SavedMessage = require("./models/SavedMessage");

const app = express();
const server = http.createServer(app);

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ================= ROUTES =================
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Secure Chat Backend is running");
});

// ================= MONGODB =================
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// ================= SOCKET.IO =================
const { Server } = require("socket.io");
const io = new Server(server, { cors: { origin: "*" } });

// ================= IN-MEMORY STORES =================
const deviceSocketMap = {};   // deviceId -> socket.id
const devicePublicKeys = {};  // deviceId -> publicKey

function broadcastOnlineDevices() {
  io.emit("online_devices", Object.keys(deviceSocketMap));
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // =================================================
  // REGISTER DEVICE + PUBLIC KEY
  // =================================================
  socket.on("register_device", async ({ deviceId, publicKey, platform, userAgent }) => {
    socket.deviceId = deviceId;
    deviceSocketMap[deviceId] = socket.id;
    devicePublicKeys[deviceId] = publicKey;

    await Device.findOneAndUpdate(
      { deviceId },
      {
        deviceId,
        platform,
        userAgent,
        isOnline: true,
        lastSeen: new Date()
      },
      { upsert: true }
    );

    // Send existing public keys
    for (const id in devicePublicKeys) {
      socket.emit("public_key", {
        deviceId: id,
        publicKey: devicePublicKeys[id]
      });
    }

    socket.broadcast.emit("public_key", { deviceId, publicKey });
    broadcastOnlineDevices();
  });

  // =================================================
  // PRIVATE MESSAGE (ENCRYPTED)
  // =================================================
  socket.on("private_message", ({ toDeviceId, encryptedText }) => {
    const targetSocketId = deviceSocketMap[toDeviceId];
    if (targetSocketId) {
      io.to(targetSocketId).emit("receive_private_message", {
        from: socket.deviceId,
        encryptedText
      });
    }
  });

  // =================================================
  // GROUP CHAT
  // =================================================
  socket.on("create_group", ({ groupId }) => {
    socket.join(groupId);
  });

  socket.on("join_group", ({ groupId }) => {
    socket.join(groupId);
  });

  socket.on("group_message", ({ groupId, encryptedText }) => {
    socket.to(groupId).emit("receive_group_message", {
      from: socket.deviceId,
      groupId,
      encryptedText
    });
  });

  // =================================================
  // SAVE MESSAGE (EXPLICIT)
  // =================================================
  socket.on("save_message", async (data) => {
    await SavedMessage.create({
      ownerDeviceId: socket.deviceId,
      ...data
    });
  });

  socket.on("get_saved_messages", async () => {
    const msgs = await SavedMessage.find({
      ownerDeviceId: socket.deviceId
    }).sort({ savedAt: -1 });

    socket.emit("saved_messages", msgs);
  });

  // =================================================
  // DISCONNECT
  // =================================================
  socket.on("disconnect", async () => {
    console.log("Socket disconnected:", socket.id);

    if (socket.deviceId) {
      delete deviceSocketMap[socket.deviceId];
      delete devicePublicKeys[socket.deviceId];

      await Device.findOneAndUpdate(
        { deviceId: socket.deviceId },
        {
          isOnline: false,
          lastSeen: new Date()
        }
      );

      broadcastOnlineDevices();
    }
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
