const mongoose = require("mongoose");

const SavedMessageSchema = new mongoose.Schema({
  ownerDeviceId: String,      // who saved it
  fromDeviceId: String,
  toDeviceId: String,
  isGroup: Boolean,
  groupId: String,
  messageText: String,
  encryptedText: String,
  savedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SavedMessage", SavedMessageSchema);
