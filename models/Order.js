const mongoose = require("mongoose");
const Joi = require("joi");

const OrderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
      min: 0,
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },


    images: {
      type: [String], // أسماء ملفات الصور
      default: [],
    },

    sizes: {
      type: [String], // مثال: ["M", "L"]
      default: [],
    },

    colors: {
      type: [String], // مثال: ["red", "blue"]
      default: [],
    },

    deliveryLocation: {
      address: {
        type: String,
        required: true,
      },
      city: {
        type: String,
      },
      notes: {
        type: String,
      },
    },

    employeeSignature: {
      type: String, // صورة التوقيع
    },

    customerSignature: {
      type: String, // صورة التوقيع
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

    images: Joi.array().items(Joi.string()).optional(),

    sizes: Joi.array().items(Joi.string()).optional(),

    colors: Joi.array().items(Joi.string()).optional(),

    deliveryLocation: Joi.object({
      address: Joi.string().required(),
      city: Joi.string().optional(),
      notes: Joi.string().optional(),
    }).required(),

    employeeSignature: Joi.string().optional(),

    customerSignature: Joi.string().optional(),
  });

  return schema.validate(obj);
};


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

    images: Joi.array().items(Joi.string()),

    sizes: Joi.array().items(Joi.string()),

    colors: Joi.array().items(Joi.string()),

    deliveryLocation: Joi.object({
      address: Joi.string(),
      city: Joi.string(),
      notes: Joi.string(),
    }),

    employeeSignature: Joi.string(),

    customerSignature: Joi.string(),
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
