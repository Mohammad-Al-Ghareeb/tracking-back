const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const { User, validateRegisterAdmin, validateUpdateUser } = require("../models/User");
const { Role } = require("../models/Role");
const { Order } = require("../models/Order");
const { localizeJoiError } = require("../utils/localization");

const isAdmin = (req) => ["admin", "superadmin", "أدمن"].includes(String(req.user?.role?.name || "").trim().toLowerCase());
const ROLE_GROUP_NAMES = {
  employee: ["employee", "worker", "موظف", "عامل"],
  customer: ["customer", "user", "مستخدم", "زبون"],
};

exports.getAllUsersCtrl = asyncHandler(async (req, res) => {
  const { page = 1, perPage = 10, minSalary, maxSalary, orderByAlpha, role, roleGroup } = req.query;
  const filter = { isDeleted: false };
  if (minSalary) filter.salary = { ...filter.salary, $gte: Number(minSalary) };
  if (maxSalary) filter.salary = { ...filter.salary, $lte: Number(maxSalary) };
  if (role) filter.role = role;
  if (!role && ROLE_GROUP_NAMES[roleGroup]) {
    const roleIds = await Role.find({ name: { $in: ROLE_GROUP_NAMES[roleGroup] } }).distinct("_id");
    filter.role = { $in: roleIds };
  }
  let sortOption = { createdAt: -1 };
  if (["asc", "1"].includes(orderByAlpha)) sortOption = { "fullName.firstName": 1, "fullName.lastName": 1 };
  if (["desc", "0"].includes(orderByAlpha)) sortOption = { "fullName.firstName": -1, "fullName.lastName": -1 };
  const users = await User.find(filter).populate("role").skip((Number(page) - 1) * Number(perPage)).limit(Number(perPage)).sort(sortOption);
  const documentCount = await User.countDocuments(filter);

  let responseUsers = users;
  if (roleGroup === "employee" && users.length > 0) {
    const employeeIds = users.map((user) => user._id);
    const orderCounts = await Order.aggregate([
      { $match: { employee: { $in: employeeIds } } },
      { $group: { _id: "$employee", count: { $sum: 1 } } },
    ]);
    const countByEmployee = new Map(orderCounts.map((item) => [String(item._id), item.count]));
    responseUsers = users.map((user) => ({
      ...user.toObject(),
      assignedOrdersCount: countByEmployee.get(String(user._id)) || 0,
    }));
  }

  res.status(200).json({ users: responseUsers, pagination: { page: Number(page), perPage: Number(perPage), count: users.length, documentCount } });
});

exports.getUserByIdCtrl = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate("role");
  if (!user || user.isDeleted) return res.status(404).json({ message: req.t("auth.userNotFound") });
  res.status(200).json(user);
});

exports.createUserCtrl = asyncHandler(async (req, res) => {
  const { error } = validateRegisterAdmin(req.body);
  if (error) return res.status(400).json({ message: localizeJoiError(req, error) });
  const { email, username, password, role } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ message: req.t("auth.emailExists") });
  if (await User.findOne({ username })) return res.status(400).json({ message: req.t("users.usernameExists") });
  if (!(await Role.findById(role))) return res.status(400).json({ message: req.t("users.invalidRole") });
  const user = await User.create({ ...req.body, password: await bcrypt.hash(password, 10) });
  await user.populate("role");
  res.status(201).json(user);
});

exports.updateUserCtrl = asyncHandler(async (req, res) => {
  const { error } = validateUpdateUser(req.body);
  if (error) return res.status(400).json({ message: localizeJoiError(req, error) });
  if (!isAdmin(req) && req.user.id !== req.params.id) return res.status(403).json({ message: req.t("users.updateForbidden") });
  if (!isAdmin(req)) { delete req.body.role; delete req.body.salary; delete req.body.isActive; delete req.body.isDeleted; }
  if (req.body.email) { const duplicateEmail = await User.findOne({ email: req.body.email, _id: { $ne: req.params.id } }); if (duplicateEmail) return res.status(400).json({ message: req.t("auth.emailExists") }); }
  if (req.body.username) { const duplicateUsername = await User.findOne({ username: req.body.username, _id: { $ne: req.params.id } }); if (duplicateUsername) return res.status(400).json({ message: req.t("users.usernameExists") }); }
  if (req.body.role && !(await Role.findById(req.body.role))) return res.status(400).json({ message: req.t("users.invalidRole") });
  if (req.body.password) req.body.password = await bcrypt.hash(req.body.password, 10);
  const user = await User.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }).populate("role");
  if (!user) return res.status(404).json({ message: req.t("auth.userNotFound") });
  res.status(200).json(user);
});

exports.deleteUserCtrl = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: req.t("auth.userNotFound") });
  user.isDeleted = true; user.isActive = false; await user.save();
  res.status(200).json({ message: req.t("users.deleted") });
});

exports.getAllBriefUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isDeleted: false }, { _id: 1, "fullName.firstName": 1, "fullName.lastName": 1, role: 1 }).sort({ "fullName.firstName": 1, "fullName.lastName": 1 }).populate("role");
  res.status(200).json({ users: users.map((u) => ({ _id: u._id, name: `${u.fullName.firstName} ${u.fullName.lastName}`, role: u.role })) });
});
