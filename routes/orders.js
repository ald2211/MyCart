const express = require("express");
const router = express.Router();
const Order = require("../Models/order");
const {
  orderDetailsPost,
  userOrderGet,
  cancelOrder,
  manageOrderGet,
  updateStatus,
  returnOrder,
  pieChart,
  barChart,
  getReport,
  verifyPayment,
  continueFailedPayment,
  FailedPaymentVerification,
  viewOrderDetails,
} = require("../controllers/orderController");
const { isAuth } = require("../middleware/auth");
const { isAdminAuth } = require("../middleware/adminAuth");

//user order get
router.get("/", isAuth, userOrderGet);

//order data
router.post("/checkOut", orderDetailsPost);

//payment verification
router.post("/verifyPayment", verifyPayment);

//continue failed Payment
router.post("/continueFailedPayment", continueFailedPayment);

//continue failed payment verification
router.post("/continuePaymentVerification", FailedPaymentVerification);

//cancel order
router.delete("/cancel/:id", cancelOrder);

//return order
router.patch("/return", returnOrder);

//admin side order management
router.get("/manageOrder", isAdminAuth, manageOrderGet);
router.patch("/updateOrderStatus", updateStatus);

//pie chart
router.get("/categorySale", pieChart);

//bar chart
router.get("/barChart", barChart);

//report
router.get("/report", getReport);

//view order details
router.get("/orderdetails/:id", viewOrderDetails);

module.exports = router;
