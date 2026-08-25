const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const { User, validateRegisterUser, validateLoginUser } = require("../models/User");
const { Role } = require("../models/Role");

const generateToken = (user) =>
  jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET_KEY, { expiresIn: "30d" });

exports.registerUser = asyncHandler(async (req, res) => {
  const { error } = validateRegisterUser(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, username, password, role } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ message: "Email already exists" });
  if (await User.findOne({ username })) return res.status(400).json({ message: "Username already exists" });

  const roleExists = await Role.findById(role);
  if (!roleExists) return res.status(400).json({ message: "Invalid role ID" });
  const publicRoleName = String(roleExists.name || "").trim().toLowerCase();
  if (!["user", "customer", "مستخدم", "زبون"].includes(publicRoleName)) {
    return res.status(403).json({ message: "Public registration is only available for customers" });
  }

  const user = await User.create({ ...req.body, password: await bcrypt.hash(password, 10) });
  await user.populate("role");
  res.status(201).json({ message: "User registered successfully", user, token: generateToken(user) });
});

exports.loginUser = asyncHandler(async (req, res) => {
  const { error } = validateLoginUser(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const user = await User.findOne({ email: req.body.email }).select("+password").populate("role");
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return res.status(400).json({ message: "Invalid email or password" });
  }
  if (user.isDeleted || !user.isActive) return res.status(403).json({ message: "Account is inactive" });

  const safeUser = await User.findById(user._id).populate("role");
  res.status(200).json({ message: "Login successful", user: safeUser, token: generateToken(user) });
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate("role");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(200).json(user);
});
