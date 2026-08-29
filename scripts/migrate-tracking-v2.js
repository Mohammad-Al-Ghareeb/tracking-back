const mongoose = require("mongoose");
require("dotenv").config();
const { inferRoleGroup } = require("../utils/roleAccess");

async function run() {
  const uri = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URL/MONGO_URI/MONGODB_URI is required");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const roles = await db.collection("roles").find({}).toArray();
  for (const role of roles) {
    const group = role.group || inferRoleGroup(role.name) || "EMPLOYEE";
    await db.collection("roles").updateOne({ _id: role._id }, { $set: { group } });
  }
  await db.collection("rawmaterials").updateMany({}, { $unset: { isActive: "" } });
  await db.collection("orders").updateMany({ status: "DELIVERY", deliveredAt: { $ne: null } }, { $set: { status: "DELIVERED" } });
  console.log("Tracking v2 migration completed");
  await mongoose.disconnect();
}
run().catch(async (error) => { console.error(error); try { await mongoose.disconnect(); } catch {} process.exit(1); });
