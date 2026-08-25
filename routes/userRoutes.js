const express = require("express");
const router = express.Router();

const {
  getAllUsersCtrl,
  getUserByIdCtrl,
  createUserCtrl,
  updateUserCtrl,
  deleteUserCtrl,
  getAllBriefUsers,
} = require("../controllers/userControllers");
const {
  verifyTokenAndAdmin,
  verifyTokenAndAuthorization,
} = require("../middlewares/verifyToken");

router
  .route("/")
  .get(verifyTokenAndAdmin, getAllUsersCtrl)
  .post(verifyTokenAndAdmin, createUserCtrl);

router.get("/brief", verifyTokenAndAdmin, getAllBriefUsers);

router
  .route("/:id")
  .get(verifyTokenAndAuthorization, getUserByIdCtrl)
  .put(verifyTokenAndAuthorization, updateUserCtrl)
  .delete(verifyTokenAndAdmin, deleteUserCtrl);

module.exports = router;
