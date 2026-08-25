const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const { User, validateRegisterUser, validateUpdateUser } = require("../models/User");
const { Role } = require("../models/Role");

const isAdmin = (req) => ["admin", "superadmin", "أدمن"].includes(String(req.user?.role?.name || "").trim().toLowerCase());

exports.getAllUsersCtrl = asyncHandler(async (req, res) => {
  const { page = 1, perPage = 10, minSalary, maxSalary, orderByAlpha, role } = req.query;
  const filter = { isDeleted: false };
  if (minSalary) filter.salary = { ...filter.salary, $gte: Number(minSalary) };
  if (maxSalary) filter.salary = { ...filter.salary, $lte: Number(maxSalary) };
  if (role) filter.role = role;
  let sortOption = { createdAt: -1 };
  if (orderByAlpha === "1") sortOption = { "fullName.firstName": 1 };
  if (orderByAlpha === "0") sortOption = { "fullName.firstName": -1 };

  const users = await User.find(filter).populate("role").skip((Number(page) - 1) * Number(perPage)).limit(Number(perPage)).sort(sortOption);
  const documentCount = await User.countDocuments(filter);
  res.status(200).json({ users, pagination: { page: Number(page), perPage: Number(perPage), count: users.length, documentCount } });
});

exports.getUserByIdCtrl = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate("role");
  if (!user || user.isDeleted) return res.status(404).json({ message: "User not found" });
  res.status(200).json(user);
});

exports.createUserCtrl = asyncHandler(async (req, res) => {
  const { error } = validateRegisterUser(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  const { email, username, password, role } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ message: "Email already exists" });
  if (await User.findOne({ username })) return res.status(400).json({ message: "Username already exists" });
  if (!(await Role.findById(role))) return res.status(400).json({ message: "Invalid role ID" });
  const user = await User.create({ ...req.body, password: await bcrypt.hash(password, 10) });
  await user.populate("role");
  res.status(201).json(user);
});

exports.updateUserCtrl = asyncHandler(async (req, res) => {
  const { error } = validateUpdateUser(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  if (!isAdmin(req) && req.user.id !== req.params.id) return res.status(403).json({ message: "Not allowed to update this user" });
  if (!isAdmin(req)) {
    delete req.body.role;
    delete req.body.salary;
    delete req.body.isActive;
    delete req.body.isDeleted;
  }
  if (req.body.role && !(await Role.findById(req.body.role))) return res.status(400).json({ message: "Invalid role ID" });
  if (req.body.password) req.body.password = await bcrypt.hash(req.body.password, 10);
  const user = await User.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }).populate("role");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(200).json(user);
});

exports.deleteUserCtrl = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  user.isDeleted = true;
  user.isActive = false;
  await user.save();
  res.status(200).json({ message: "User deleted successfully" });
});

exports.getAllBriefUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isDeleted: false }, { _id: 1, "fullName.firstName": 1, "fullName.lastName": 1, role: 1 }).populate("role");
  res.status(200).json({ users: users.map((u) => ({ _id: u._id, name: `${u.fullName.firstName} ${u.fullName.lastName}`, role: u.role })) });
});
