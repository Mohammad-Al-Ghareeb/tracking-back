const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

let keepAliveTimer;
let connectionPromise;

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
  if (mongoose.connection.readyState === 1) return;
  if (connectionPromise) return connectionPromise;

  const mongoUrl =
    process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUrl)
    throw new Error("MONGO_URL, MONGO_URI, or MONGODB_URI is required");

  connectionPromise = mongoose
    .connect(mongoUrl, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
      console.log("Connected To MongoDB ^_^");
      startKeepAlive();
    })
    .catch((error) => {
      connectionPromise = undefined;
      console.log("Connection Failed To MongoDB! ):", error.message);
      throw error;
    });

  return connectionPromise;
};
