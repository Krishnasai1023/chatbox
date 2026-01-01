const mongoose = require("mongoose");

const DeviceSchema = new mongoose.Schema({
  deviceId: { type: String, unique: true },
  platform: String,
  userAgent: String,
  isOnline: Boolean,
  lastSeen: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Device", DeviceSchema);
