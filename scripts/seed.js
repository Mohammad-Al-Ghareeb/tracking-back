require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectToDb = require("../config/connectToDb");
const { Role } = require("../models/Role");
const { User } = require("../models/User");

const roles = [
  { name: "admin", description: "Administrator" },
  { name: "customer", description: "Customer" },
  { name: "employee", description: "Employee" },
];

const users = [
  {
    fullName: { firstName: "Admin", lastName: "Admin" },
    username: "admin",
    email: "admin@gmail.com",
    password: "12345678",
    role: "admin",
  },
  {
    fullName: { firstName: "Kinda", lastName: "Customer" },
    username: "Kinda",
    email: "kinda@gmail.com",
    password: "12345678",
    role: "customer",
  },
  {
    fullName: { firstName: "Employee", lastName: "User" },
    username: "kdl",
    email: "kdl@gmail.com",
    password: "12345678",
    role: "employee",
  },
];

async function seed() {
  await connectToDb();

  const roleIds = {};
  for (const role of roles) {
    const savedRole = await Role.findOneAndUpdate(
      { name: role.name },
      { $set: role },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    roleIds[role.name] = savedRole._id;
  }

  for (const user of users) {
    const { password, role, ...userData } = user;
    await User.findOneAndUpdate(
      { email: user.email },
      {
        $set: {
          ...userData,
          password: await bcrypt.hash(password, 10),
          role: roleIds[role],
          isActive: true,
          isDeleted: false,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );
  }

  console.log("Seed completed successfully.");
  await mongoose.connection.close();
}

seed().catch(async (error) => {
  console.error("Seed failed:", error);
  await mongoose.connection.close().catch(() => undefined);
  process.exitCode = 1;
});
