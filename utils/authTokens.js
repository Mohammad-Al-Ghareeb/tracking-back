const jwt = require("jsonwebtoken");

const DEFAULT_ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;
const DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS = 30 * 24 * 60 * 60;

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const ACCESS_TOKEN_EXPIRES_IN_SECONDS = positiveInteger(
  process.env.JWT_ACCESS_EXPIRES_IN_SECONDS,
  DEFAULT_ACCESS_TOKEN_EXPIRES_IN_SECONDS
);
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = positiveInteger(
  process.env.JWT_REFRESH_EXPIRES_IN_SECONDS,
  DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS
);

function getAccessTokenSecret() {
  if (!process.env.JWT_SECRET_KEY) {
    throw new Error("JWT_SECRET_KEY is required");
  }
  return process.env.JWT_SECRET_KEY;
}

function getRefreshTokenSecret() {
  return process.env.JWT_REFRESH_SECRET_KEY || `${getAccessTokenSecret()}:refresh`;
}

function getUserId(user) {
  return String(user?._id || user?.id || "");
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: getUserId(user),
      username: user?.username,
      type: "access",
    },
    getAccessTokenSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: getUserId(user),
      type: "refresh",
    },
    getRefreshTokenSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS }
  );
}

function generateTokenPair(user) {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
    accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
  };
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, getAccessTokenSecret());
  // Transitional compatibility: access tokens issued before refresh-token support
  // did not include a type claim. New refresh tokens are never accepted here.
  if (payload?.type && payload.type !== "access") {
    throw new jwt.JsonWebTokenError("Invalid access token type");
  }
  return payload;
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, getRefreshTokenSecret());
  if (payload?.type !== "refresh") {
    throw new jwt.JsonWebTokenError("Invalid refresh token type");
  }
  return payload;
}

module.exports = {
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  REFRESH_TOKEN_EXPIRES_IN_SECONDS,
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
};
