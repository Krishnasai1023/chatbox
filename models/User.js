const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  deviceIdHash: {
    type: String,
    required: true,
    unique: true
  },
  deviceType: {
    type: String,
    enum: ["web", "android", "windows", "mac"],
    default: "web"
  },
  publicKey: {
    type: String,
    required: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  ipHash: {
    type: String,
    default: null   // stored only if user consents
  }
});

module.exports = mongoose.model("User", userSchema);
