const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Role = mongoose.model("Role", RoleSchema);

const validateCreateRole = (obj) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    description: Joi.string().trim().max(200).allow("", null),
  });

  return schema.validate(obj);
};

// Update role validation
const validateUpdateRole = (obj) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(50),
    description: Joi.string().trim().max(200).allow("", null),
  });

  return schema.validate(obj);
};

module.exports = {
  Role,
  validateCreateRole,
  validateUpdateRole,
};
