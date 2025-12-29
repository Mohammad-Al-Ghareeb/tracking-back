const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // أو "Customer" لو عندك schema خاصة للعميل
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "PENDING",
      required: true,
    },

    expectedFinishDate: {
      type: Date,
      required: true,
    },

    cost: {
      type: Number,
      required: true,
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", OrderSchema);

const validateCreateOrder = (obj) => {
  const schema = Joi.object({
    customer: Joi.string().hex().length(24).required(),

    description: Joi.string().trim().min(3).max(500).required(),

    status: Joi.string()
      .valid("PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED")
      .default("PENDING"),

    expectedFinishDate: Joi.date().required(),

    cost: Joi.number().min(0).required(),

    employee: Joi.string().hex().length(24).required(),
  });

  return schema.validate(obj);
};

// Update Order Validation
const validateUpdateOrder = (obj) => {
  const schema = Joi.object({
    customer: Joi.string().hex().length(24),

    description: Joi.string().trim().min(3).max(500),

    status: Joi.string().valid(
      "PENDING",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED"
    ),

    expectedFinishDate: Joi.date(),

    cost: Joi.number().min(0),

    employee: Joi.string().hex().length(24),
  });

  return schema.validate(obj);
};

// Validate ID
const validateOrderId = (obj) => {
  const schema = Joi.object({
    id: Joi.string().hex().length(24).required(),
  });

  return schema.validate(obj);
};

module.exports = {
  Order,
  validateCreateOrder,
  validateUpdateOrder,
  validateOrderId,
};
