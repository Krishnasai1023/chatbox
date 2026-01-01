const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");

const router = express.Router();

// Device registration with IP consent
router.post("/register", async (req, res) => {
  try {
    const { deviceId, deviceType, publicKey, ipConsent } = req.body;

    if (!deviceId || !publicKey) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Hash device ID
    const deviceIdHash = crypto
      .createHash("sha256")
      .update(deviceId)
      .digest("hex");

    // Handle IP only if user consented
    let ipHash = null;
    if (ipConsent === true) {
      const ipAddress = req.ip;
      ipHash = crypto
        .createHash("sha256")
        .update(ipAddress)
        .digest("hex");
    }

    let user = await User.findOne({ deviceIdHash });

    if (user) {
      user.lastLogin = new Date();
      if (ipHash) user.ipHash = ipHash;
      await user.save();

      return res.json({ message: "Device already registered" });
    }

    // New device registration
    user = new User({
      deviceIdHash,
      deviceType: deviceType || "web",
      publicKey,
      ipHash
    });

    await user.save();

    res.json({ message: "Device registered successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
