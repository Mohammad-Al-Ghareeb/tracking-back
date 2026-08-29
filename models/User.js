const mongoose = require("mongoose");
const Joi = require("joi");
const { generateAccessToken } = require("../utils/authTokens");

const PHONE_PATTERN = /^\+?\d{7,15}$/;

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
    },
    email: { type: String, required: true, trim: true, minLength: 2, maxLength: 100 },
    phoneNumber: { type: String, trim: true, default: null },
    username: { type: String, required: true },
    password: { type: String, required: true, select: false },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    salary: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

UserSchema.methods.generateAuthToken = function () { return generateAccessToken(this); };
const User = mongoose.model("User", UserSchema);

const validateRegisterUser = (obj) => Joi.object({
  fullName: Joi.object({ firstName: Joi.string().trim().required(), lastName: Joi.string().trim().required() }).required(),
  email: Joi.string().trim().email().min(2).max(100).required(),
  phoneNumber: Joi.string().trim().pattern(PHONE_PATTERN).required(),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.string().min(8).valid(Joi.ref("password")).required().messages({ "any.only": "Password confirmation does not match password" }),
}).validate(obj);

const validateRegisterAdmin = (obj) => Joi.object({
  fullName: Joi.object({ firstName: Joi.string().required(), lastName: Joi.string().required() }).required(),
  email: Joi.string().trim().email().min(2).max(100).required(),
  phoneNumber: Joi.string().trim().pattern(PHONE_PATTERN).required(),
  username: Joi.string().trim().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().hex().length(24).required(),
  salary: Joi.number().min(0),
  isActive: Joi.boolean(),
}).validate(obj);

const validateLoginUser = (obj) => Joi.object({
  email: Joi.string().trim().min(2).max(100).required(),
  password: Joi.string().min(8).required(),
}).validate(obj);

const validateUpdateUser = (obj) => Joi.object({
  fullName: Joi.object({ firstName: Joi.string().trim(), lastName: Joi.string().trim() }),
  email: Joi.string().trim().email().min(2).max(100),
  phoneNumber: Joi.string().trim().pattern(PHONE_PATTERN).allow(null, ""),
  username: Joi.string().trim(),
  password: Joi.string().min(8),
  role: Joi.string().hex().length(24),
  salary: Joi.number().min(0),
  isActive: Joi.boolean(),
}).min(1).validate(obj);

module.exports = { User, PHONE_PATTERN, validateRegisterUser, validateLoginUser, validateUpdateUser, validateRegisterAdmin };
