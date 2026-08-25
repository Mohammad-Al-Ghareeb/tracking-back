require("dotenv").config();
const mongoose = require("mongoose");
const connectToDb = require("../config/connectToDb");

async function migrate() {
  await connectToDb();
  const collection = mongoose.connection.collection("orders");

  const resultPending = await collection.updateMany(
    { status: "PENDING" },
    [
      { $set: {
        notes: { $ifNull: ["$notes", ""] },
        rawMaterials: { $ifNull: ["$rawMaterials", []] },
        materialCost: { $ifNull: ["$materialCost", 0] },
        additionalCost: { $ifNull: ["$additionalCost", 0] },
        totalPrice: { $ifNull: ["$totalPrice", { $ifNull: ["$cost", 0] }] },
        inventoryConsumed: { $ifNull: ["$inventoryConsumed", false] },
      } },
    ]
  );

  const resultInProgress = await collection.updateMany(
    { status: "IN_PROGRESS" },
    [
      { $set: {
        status: "CUTTING",
        notes: { $ifNull: ["$notes", ""] }, rawMaterials: { $ifNull: ["$rawMaterials", []] },
        materialCost: { $ifNull: ["$materialCost", 0] }, additionalCost: { $ifNull: ["$additionalCost", 0] },
        totalPrice: { $ifNull: ["$totalPrice", { $ifNull: ["$cost", 0] }] }, inventoryConsumed: { $ifNull: ["$inventoryConsumed", false] },
      } },
    ]
  );

  const resultCompleted = await collection.updateMany(
    { status: { $in: ["COMPLETED", "DELIVERED"] } },
    [
      { $set: {
        status: "DELIVERY",
        deliveredAt: { $ifNull: ["$deliveredAt", { $ifNull: ["$updatedAt", "$createdAt"] }] },
        notes: { $ifNull: ["$notes", ""] }, rawMaterials: { $ifNull: ["$rawMaterials", []] },
        materialCost: { $ifNull: ["$materialCost", 0] }, additionalCost: { $ifNull: ["$additionalCost", 0] },
        totalPrice: { $ifNull: ["$totalPrice", { $ifNull: ["$cost", 0] }] }, inventoryConsumed: { $ifNull: ["$inventoryConsumed", false] },
      } },
    ]
  );

  const resultCancelled = await collection.updateMany(
    { status: "CANCELLED" },
    [
      { $set: {
        status: "PENDING", isCancelled: true,
        cancelledAt: { $ifNull: ["$cancelledAt", { $ifNull: ["$updatedAt", "$createdAt"] }] },
        notes: { $ifNull: ["$notes", ""] }, rawMaterials: { $ifNull: ["$rawMaterials", []] },
        materialCost: { $ifNull: ["$materialCost", 0] }, additionalCost: { $ifNull: ["$additionalCost", 0] },
        totalPrice: { $ifNull: ["$totalPrice", { $ifNull: ["$cost", 0] }] }, inventoryConsumed: { $ifNull: ["$inventoryConsumed", false] },
      } },
    ]
  );

  console.log({
    pending: resultPending.modifiedCount,
    inProgressToCutting: resultInProgress.modifiedCount,
    completedToDelivery: resultCompleted.modifiedCount,
    cancelled: resultCancelled.modifiedCount,
  });
  await mongoose.connection.close();
}

migrate().catch(async (error) => {
  console.error(error);
  await mongoose.connection.close().catch(() => undefined);
  process.exitCode = 1;
});
