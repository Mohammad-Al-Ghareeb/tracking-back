const mongoose = require("mongoose");
const Joi = require("joi");
const jwt = require("jsonwebtoken");

//schema of user

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      firstName: {
        type: String,
        required: true,
      },
      lastName: {
        type: String,
        required: true,
      },
    },
    email: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 100,
    },
    username: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    // role: {
    //   enum: ["ADMIN", "MANAGER", "OPERATOR", "CUSTOMER"],
    //   type: String,
    // },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    salary: {
      type: Number,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

UserSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role, username: this.username },
    process.env.JWT_SECRET_KEY
  );
};

const User = mongoose.model("User", UserSchema);

const validateRegisterUser = (obj) => {
  const schema = Joi.object({
    fullName: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
    }).required(),

    email: Joi.string().trim().min(2).max(100).required(),
    username: Joi.string().trim().required(),
    password: Joi.string().trim().min(8).required(),

    role: Joi.string().hex().length(24).required(),
    salary: Joi.number(),
    isActive: Joi.boolean(),
  });

  return schema.validate(obj);
};

const validateRegisterAdmin = (obj) => {
  const schema = Joi.object({
    fullName: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
    }).required(),

    email: Joi.string().trim().min(2).max(100).required(),
    username: Joi.string().trim().required(),
    password: Joi.string().trim().min(8).required(),

    role: Joi.string().hex().length(24).required(), // dynamic
  });

  return schema.validate(obj);
};

const validateLoginUser = (obj) => {
  const schema = Joi.object({
    email: Joi.string().trim().min(2).max(100).required(),
    password: Joi.string().trim().min(8).required(),
  });

  return schema.validate(obj);
};

const validateUpdateUser = (obj) => {
  const schema = Joi.object({
    fullName: Joi.object({
      firstName: Joi.string(),
      lastName: Joi.string(),
    }),
    email: Joi.string().trim().min(2).max(100),
    username: Joi.string().trim(),
    password: Joi.string().trim().min(8),

    role: Joi.string().hex().length(24),
    salary: Joi.number(),
    isActive: Joi.boolean(),
  });

  return schema.validate(obj);
};

module.exports = {
  User,
  validateRegisterUser,
  validateLoginUser,
  validateUpdateUser,
  validateRegisterAdmin,
};
