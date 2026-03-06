const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");

const {
  User,
  validateRegisterUser,
  validateUpdateUser,
} = require("../models/User");
const { Role } = require("../models/Role");

/* -----------------------------------------------------------
   GET ALL USERS
   GET /api/users
   Access: ADMIN ONLY
------------------------------------------------------------ */
exports.getAllUsersCtrl = asyncHandler(async (req, res) => {
  const {
    page = 1,
    perPage = 10,
    minSalary,
    maxSalary,
    orderByAlpha = 0,
  } = req.query;

  // بناء فلتر الراتب (لو تم تزويده)
  const filter = { isDeleted: false };
  if (minSalary) filter.salary = { ...filter.salary, $gte: Number(minSalary) };
  if (maxSalary) filter.salary = { ...filter.salary, $lte: Number(maxSalary) };

  // تحديد ترتيب الأحرف
  let sortOption = { createdAt: -1 }; // الإفتراضي
  if (orderByAlpha == 1)
    sortOption = { "fullName.firstName": 1 }; // من A إلى Z
  else if (orderByAlpha == 0) sortOption = { "fullName.firstName": -1 }; // من Z إلى A

  const users = await User.find(filter)
    .populate("role")
    .skip((page - 1) * perPage)
    .limit(Number(perPage))
    .sort(sortOption);

  const documentCount = await User.countDocuments(filter);

  res.status(200).json({
    users,
    totalCount: users.length,
    documentCount,
  });
});

/* -----------------------------------------------------------
   GET USER BY ID
   GET /api/users/:id
   Access: ADMIN ONLY
------------------------------------------------------------ */
exports.getUserByIdCtrl = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate("role");

  if (!user || user.isDeleted)
    return res.status(404).json({ message: "User not found" });

  res.status(200).json(user);
});

/* -----------------------------------------------------------
   CREATE NEW USER
   POST /api/users
   Access: ADMIN ONLY
------------------------------------------------------------ */
exports.createUserCtrl = asyncHandler(async (req, res) => {
  const { error } = validateRegisterUser(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, username, password, role } = req.body;

  // check email exists
  const emailExists = await User.findOne({ email });
  if (emailExists)
    return res.status(400).json({ message: "Email already exists" });

  // check username exists
  const usernameExists = await User.findOne({ username });
  if (usernameExists)
    return res.status(400).json({ message: "Username already exists" });

  // check role exists
  const roleExists = await Role.findById(role);
  if (!roleExists) return res.status(400).json({ message: "Invalid role ID" });

  // hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    ...req.body,
    password: hashedPassword,
  });

  res.status(201).json({
    message: "User created successfully",
    user,
  });
});

/* -----------------------------------------------------------
   UPDATE USER
   PUT /api/users/:id
   Access: ADMIN ONLY
------------------------------------------------------------ */
exports.updateUserCtrl = asyncHandler(async (req, res) => {
  const { error } = validateUpdateUser(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  // Check role exists if role is updated
  if (req.body.role) {
    const roleExists = await Role.findById(req.body.role);
    if (!roleExists)
      return res.status(400).json({ message: "Invalid role ID" });
  }

  // If updating password → hash it
  if (req.body.password) {
    req.body.password = await bcrypt.hash(req.body.password, 10);
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true },
  ).populate("role");

  if (!user) return res.status(404).json({ message: "User not found" });

  res.status(200).json({
    message: "User updated successfully",
    user,
  });
});

/* -----------------------------------------------------------
   DELETE USER (SOFT DELETE)
   DELETE /api/users/:id
   Access: ADMIN ONLY
------------------------------------------------------------ */
exports.deleteUserCtrl = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) return res.status(404).json({ message: "User not found" });

  user.isDeleted = true;
  user.isActive = false;
  await user.save();

  res.status(200).json({ message: "User deleted successfully" });
});
