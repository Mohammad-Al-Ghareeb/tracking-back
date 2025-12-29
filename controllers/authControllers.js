const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const { User } = require("../models/User");
const { Role } = require("../models/Role");

const { validateRegisterUser, validateLoginUser } = require("../models/User");

// Generate Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, username: user.username },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "30d" }
  );
};

/* -----------------------------------------------------------
   @Register User
   POST /api/auth/register
------------------------------------------------------------ */
exports.registerUser = asyncHandler(async (req, res) => {
  const { error } = validateRegisterUser(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, username, password, role } = req.body;

  // 1. Check email exists
  const emailExists = await User.findOne({ email });
  if (emailExists)
    return res.status(400).json({ message: "Email already exists" });

  // 2. Check username exists
  const usernameExists = await User.findOne({ username });
  if (usernameExists)
    return res.status(400).json({ message: "Username already exists" });

  // 3. Check role exists
  const roleExists = await Role.findById(role);
  if (!roleExists) return res.status(400).json({ message: "Invalid role ID" });

  // 4. Hash Password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 5. Create User
  const user = await User.create({
    ...req.body,
    password: hashedPassword,
  });

  res.status(201).json({
    message: "User registered successfully",
    user,
    token: generateToken(user),
  });
});

/* -----------------------------------------------------------
   @Login User
   POST /api/auth/login
------------------------------------------------------------ */
exports.loginUser = asyncHandler(async (req, res) => {
  const { error } = validateLoginUser(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, password } = req.body;

  // 1. Check user exists
  const user = await User.findOne({ email }).populate("role");
  if (!user)
    return res.status(400).json({ message: "Invalid email or password" });

  // 2. Check password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword)
    return res.status(400).json({ message: "Invalid email or password" });

  // 3. Response
  res.status(200).json({
    message: "Login successful",
    user,
    token: generateToken(user),
  });
});

/* -----------------------------------------------------------
   @Get Me
   GET /api/auth/me
------------------------------------------------------------ */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate("role");
  res.status(200).json(user);
});
