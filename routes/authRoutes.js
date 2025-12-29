const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMe,
} = require("../controllers/authControllers");
const { verifyToken } = require("../middlewares/verifyToken");

// AUTH ROUTES
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", verifyToken, getMe);

module.exports = router;
