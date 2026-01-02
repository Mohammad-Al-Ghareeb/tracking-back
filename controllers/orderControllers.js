// const asyncHandler = require("express-async-handler");
// const {
//   Order,
//   validateCreateOrder,
//   validateOrderId,
//   validateUpdateOrder,
// } = require("../models/Order");

// /**-----------------------------------------------
//  * @desc    Create New Order
//  * @route   POST /api/orders
//  * @access  private
//  ------------------------------------------------*/
// // module.exports.createOrderCtrl = asyncHandler(async (req, res) => {
// //   const { error } = validateCreateOrder(req.body);
// //   if (error) return res.status(400).json({ message: error.details[0].message });

// //   const order = await Order.create({
// //     customer: req.body.customer,
// //     description: req.body.description,
// //     status: req.body.status,
// //     expectedFinishDate: req.body.expectedFinishDate,
// //     cost: req.body.cost,
// //     employee: req.body.employee,
// //   });

// //   res.status(201).json({ message: "Order created successfully", order });
// // });
// module.exports.createOrderCtrl = asyncHandler(async (req, res) => {
//   console.log(req.body);
  
  
//   // 🔹 parse fields if they come as string
//   if (req.body.sizes) req.body.sizes = JSON.parse(req.body.sizes);
//   if (req.body.colors) req.body.colors = JSON.parse(req.body.colors);
//   if (req.body.deliveryLocation)
//     req.body.deliveryLocation = JSON.parse(req.body.deliveryLocation);
//   console.log(req.body);

//   const { error } = validateCreateOrder(req.body);
//   if (error)
//     return res.status(400).json({ message: error.details[0].message });

//   const images = req.files?.images
//     ? req.files.images.map((file) => file.filename)
//     : [];

//   const employeeSignature = req.files?.employeeSignature
//     ? req.files.employeeSignature[0].filename
//     : null;

//   const customerSignature = req.files?.customerSignature
//     ? req.files.customerSignature[0].filename
//     : null;

//   const order = await Order.create({
//     ...req.body,
//     images,
//     employeeSignature,
//     customerSignature,
//   });

//   res.status(201).json({
//     message: "Order created successfully",
//     order,
//   });
// });



const asyncHandler = require("express-async-handler");
const { Order, validateCreateOrder, validateUpdateOrder, validateOrderId } = require("../models/Order");

const normalizeArray = (value) => {
   if (!value) return [];

  // إذا كانت Array مثل ['red,blue']
  if (Array.isArray(value)) {
    if (value.length === 1 && typeof value[0] === "string") {
      return value[0].split(",").map(v => v.trim()).filter(Boolean);
    }
    return value;
  }

  // إذا كانت String مباشرة
  if (typeof value === "string") {
    return value.split(",").map(v => v.trim()).filter(Boolean);
  }

  return [];
};
/**
 * @desc    Create new order
 * @route   POST /api/orders
 * @access  Private
 */
const createOrderCtrl = asyncHandler(async (req, res) => {

req.body.sizes = normalizeArray(req.body.sizes);
req.body.colors = normalizeArray(req.body.colors);
req.body.images = normalizeArray(req.body.images);

if (req.body.deliveryLocation && typeof req.body.deliveryLocation === "string") {
    req.body.deliveryLocation = JSON.parse(req.body.deliveryLocation);
}


console.log(req.body);


  // Validate body
  const { error } = validateCreateOrder(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  // Handle uploaded files
  const images =
    req.files?.images?.map((file) => file.filename) || [];

  const employeeSignature =
    req.files?.employeeSignature?.[0]?.filename || null;

  const customerSignature =
    req.files?.customerSignature?.[0]?.filename || null;

  const order = await Order.create({
    ...req.body,
    images,
    employeeSignature,
    customerSignature,
  });

  res.status(201).json(order);
});

/**-----------------------------------------------
 * @desc    Get All Orders
 * @route   GET /api/orders
 * @access  private
 ------------------------------------------------*/
const getAllOrdersCtrl = asyncHandler(async (req, res) => {
  const { page = 1, perPage = 10 } = req.query;

  const orders = await Order.find()
    .populate("customer employee")
    .skip((page - 1) * perPage)
    .limit(perPage)
    .sort({ createdAt: -1 });

  const count = await Order.countDocuments();

  res.status(200).json({
    orders,
    count,
    page: Number(page),
    perPage: Number(perPage),
  });
});

/**-----------------------------------------------
 * @desc    Get Order By ID
 * @route   GET /api/orders/:id
 * @access  private
 ------------------------------------------------*/
const getOrderByIdCtrl = asyncHandler(async (req, res) => {
  const { error } = validateOrderId({ id: req.params.id });
  if (error) return res.status(400).json({ message: "Invalid order ID" });

  const order = await Order.findById(req.params.id).populate(
    "customer employee"
  );

  if (!order) return res.status(404).json({ message: "Order not found" });

  res.status(200).json(order);
});

/**-----------------------------------------------
 * @desc    Update Order
 * @route   PUT /api/orders/:id
 * @access  private
 ------------------------------------------------*/
const updateOrderCtrl = asyncHandler(async (req, res) => {
  const { error } = validateUpdateOrder(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const updatedOrder = await Order.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        customer: req.body.customer,
        description: req.body.description,
        status: req.body.status,
        expectedFinishDate: req.body.expectedFinishDate,
        cost: req.body.cost,
        employee: req.body.employee,
      },
    },
    { new: true }
  ).populate("customer employee");

  if (!updatedOrder)
    return res.status(404).json({ message: "Order not found" });

  res.status(200).json(updatedOrder);
});

/**-----------------------------------------------
 * @desc    Delete Order
 * @route   DELETE /api/orders/:id
 * @access  private (admin only)
 ------------------------------------------------*/
const deleteOrderCtrl = asyncHandler(async (req, res) => {
  const { error } = validateOrderId({ id: req.params.id });
  if (error) return res.status(400).json({ message: "Invalid order ID" });

  const order = await Order.findByIdAndDelete(req.params.id);

  if (!order) return res.status(404).json({ message: "Order not found" });

  res
    .status(200)
    .json({ message: "Order deleted successfully", deletedOrder: order });
});

module.exports = {
  createOrderCtrl,
  getAllOrdersCtrl,
  getOrderByIdCtrl,
  updateOrderCtrl,
  deleteOrderCtrl,
};
