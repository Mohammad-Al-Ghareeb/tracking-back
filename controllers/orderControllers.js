const asyncHandler = require("express-async-handler");
const {
  Order,
  validateCreateOrder,
  validateOrderId,
  validateUpdateOrder,
} = require("../models/Order");

/**-----------------------------------------------
 * @desc    Create New Order
 * @route   POST /api/orders
 * @access  private
 ------------------------------------------------*/
module.exports.createOrderCtrl = asyncHandler(async (req, res) => {
  const { error } = validateCreateOrder(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const order = await Order.create({
    customer: req.body.customer,
    description: req.body.description,
    status: req.body.status,
    expectedFinishDate: req.body.expectedFinishDate,
    cost: req.body.cost,
    employee: req.body.employee,
  });

  res.status(201).json({ message: "Order created successfully", order });
});

/**-----------------------------------------------
 * @desc    Get All Orders
 * @route   GET /api/orders
 * @access  private
 ------------------------------------------------*/
module.exports.getAllOrdersCtrl = asyncHandler(async (req, res) => {
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
module.exports.getOrderByIdCtrl = asyncHandler(async (req, res) => {
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
module.exports.updateOrderCtrl = asyncHandler(async (req, res) => {
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
module.exports.deleteOrderCtrl = asyncHandler(async (req, res) => {
  const { error } = validateOrderId({ id: req.params.id });
  if (error) return res.status(400).json({ message: "Invalid order ID" });

  const order = await Order.findByIdAndDelete(req.params.id);

  if (!order) return res.status(404).json({ message: "Order not found" });

  res
    .status(200)
    .json({ message: "Order deleted successfully", deletedOrder: order });
});
