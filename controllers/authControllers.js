const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const { User, validateRegisterUser, validateLoginUser } = require("../models/User");
const { Role } = require("../models/Role");
const { localizeJoiError } = require("../utils/localization");
const { generateTokenPair, verifyRefreshToken } = require("../utils/authTokens");

function buildAuthTokenPayload(user) {
  const tokens = generateTokenPair(user);
  return {
    ...tokens,
    // Backward-compatible alias for older frontend code while it migrates to accessToken.
    token: tokens.accessToken,
  };
}

function disableAuthResponseCaching(res) {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
}
const CUSTOMER_ROLE_NAMES = ["user", "customer", "مستخدم", "زبون"];

async function generateUniqueUsername(email) {
  const base = String(email).trim().toLowerCase().split("@")[0].replace(/[^a-z0-9._-]/g, "") || "customer";
  let candidate = base;
  let suffix = 1;
  while (await User.exists({ username: candidate })) { candidate = `${base}-${suffix}`; suffix += 1; }
  return candidate;
}

exports.registerUser = asyncHandler(async (req, res) => {
  const { error } = validateRegisterUser(req.body);
  if (error) return res.status(400).json({ message: localizeJoiError(req, error) });
  const normalizedEmail = req.body.email.trim().toLowerCase();
  const { password } = req.body;
  if (await User.findOne({ email: normalizedEmail })) return res.status(400).json({ message: req.t("auth.emailExists") });
  const roleExists = await Role.findOne({ name: { $in: CUSTOMER_ROLE_NAMES } });
  if (!roleExists) return res.status(400).json({ message: req.t("auth.customerRoleMissing") });
  const username = await generateUniqueUsername(normalizedEmail);
  const user = await User.create({ fullName: req.body.fullName, email: normalizedEmail, username, role: roleExists._id, password: await bcrypt.hash(password, 10) });
  await user.populate("role");
  disableAuthResponseCaching(res);
  res.status(201).json({ message: req.t("auth.registerSuccess"), user, ...buildAuthTokenPayload(user) });
});

exports.loginUser = asyncHandler(async (req, res) => {
  const { error } = validateLoginUser(req.body);
  if (error) return res.status(400).json({ message: localizeJoiError(req, error) });
  const user = await User.findOne({ email: req.body.email }).select("+password").populate("role");
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(400).json({ message: req.t("auth.invalidCredentials") });
  if (user.isDeleted || !user.isActive) return res.status(403).json({ message: req.t("auth.inactive") });
  const safeUser = await User.findById(user._id).populate("role");
  disableAuthResponseCaching(res);
  res.status(200).json({ message: req.t("auth.loginSuccess"), user: safeUser, ...buildAuthTokenPayload(user) });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.body?.refreshToken;
  if (typeof refreshToken !== "string" || !refreshToken.trim()) {
    return res.status(400).json({ message: req.t("auth.refreshRequired") });
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken.trim());
  } catch {
    return res.status(401).json({ message: req.t("auth.refreshInvalid") });
  }

  const user = await User.findById(payload.id).populate("role");
  if (!user || user.isDeleted || !user.isActive) {
    return res.status(401).json({ message: req.t("auth.unavailable") });
  }

  disableAuthResponseCaching(res);
  res.status(200).json({
    message: req.t("auth.refreshSuccess"),
    user,
    ...buildAuthTokenPayload(user),
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate("role");
  if (!user) return res.status(404).json({ message: req.t("auth.userNotFound") });
  res.status(200).json(user);
});
