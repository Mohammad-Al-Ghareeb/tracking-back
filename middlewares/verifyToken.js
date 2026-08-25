const jwt = require("jsonwebtoken");
const { User } = require("../models/User");

const ADMIN_ROLE_NAMES = new Set(["admin", "superadmin", "أدمن"]);

const getBearerToken = (req) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice(7).trim();
};

const authenticate = async (req) => {
  const token = getBearerToken(req);
  if (!token) {
    const error = new Error("no token provided, access denied");
    error.statusCode = 401;
    throw error;
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch {
    const error = new Error("invalid token, access denied");
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(payload.id).populate("role");
  if (!user || user.isDeleted || !user.isActive) {
    const error = new Error("account is inactive or unavailable");
    error.statusCode = 401;
    throw error;
  }

  req.user = {
    id: user._id.toString(),
    username: user.username,
    role: user.role,
  };
};

const sendAuthError = (res, error) =>
  res.status(error.statusCode || 401).json({ message: error.message });

function verifyToken(req, res, next) {
  authenticate(req).then(next).catch((error) => sendAuthError(res, error));
}

function verifyTokenAndAdmin(req, res, next) {
  authenticate(req)
    .then(() => {
      const roleName = String(req.user.role?.name || "").trim().toLowerCase();
      if (!ADMIN_ROLE_NAMES.has(roleName)) {
        return res.status(403).json({ message: "not allowed, only admin" });
      }
      next();
    })
    .catch((error) => sendAuthError(res, error));
}

function verifyTokenAndOnlyUser(req, res, next) {
  authenticate(req)
    .then(() => {
      if (req.user.id !== req.params.id) {
        return res.status(403).json({ message: "not allowed, only user himself" });
      }
      next();
    })
    .catch((error) => sendAuthError(res, error));
}

function verifyTokenAndAuthorization(req, res, next) {
  authenticate(req)
    .then(() => {
      const roleName = String(req.user.role?.name || "").trim().toLowerCase();
      const isAdmin = ADMIN_ROLE_NAMES.has(roleName);
      if (req.user.id !== req.params.id && !isAdmin) {
        return res.status(403).json({ message: "not allowed, only user himself or admin" });
      }
      next();
    })
    .catch((error) => sendAuthError(res, error));
}

module.exports = {
  verifyToken,
  verifyTokenAndAdmin,
  verifyTokenAndOnlyUser,
  verifyTokenAndAuthorization,
};
