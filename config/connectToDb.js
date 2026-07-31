const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

let keepAliveTimer;

const startKeepAlive = () => {
  if (keepAliveTimer) return;

  const intervalMs = Number(process.env.MONGO_KEEPALIVE_MS) || 10 * 60 * 1000;

  keepAliveTimer = setInterval(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
      }
    } catch (error) {
      console.log("MongoDB keep-alive ping failed:", error.message);
    }
  }, intervalMs);

  keepAliveTimer.unref?.();
};

module.exports = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected To MongoDB ^_^");
    startKeepAlive();
  } catch (error) {
    console.log("Connection Failed To MongoDB! ):", error);
  }
};
