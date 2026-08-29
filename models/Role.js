const mongoose = require("mongoose");
const Joi = require("joi");
const { ROLE_GROUPS, inferRoleGroup } = require("../utils/roleAccess");

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    group: {
      type: String,
      enum: ROLE_GROUPS,
      default: function () { return inferRoleGroup(this.name) || "EMPLOYEE"; },
      required: true,
    },
  },
  { timestamps: true }
);

const Role = mongoose.model("Role", RoleSchema);

const validateCreateRole = (obj) => Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  description: Joi.string().trim().max(200).allow("", null),
  group: Joi.string().valid(...ROLE_GROUPS).required(),
}).validate(obj);

const validateUpdateRole = (obj) => Joi.object({
  name: Joi.string().trim().min(2).max(50),
  description: Joi.string().trim().max(200).allow("", null),
  group: Joi.string().valid(...ROLE_GROUPS),
}).min(1).validate(obj);

module.exports = { Role, ROLE_GROUPS, validateCreateRole, validateUpdateRole };
