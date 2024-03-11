const { ObjectId } = require("mongodb");
const address = require("../Models/address");
const order = require("../Models/order");
const cart = require("../Models/cart");
const product = require("../Models/product");
const notifications = require("../Models/notification");
const { main } = require("../emailHelper");
const generateRandomOrderId = require("../randomIdGenerator");
const UserModal = require("../Models/user");
const Razorpay = require("razorpay");
const walletHistory = require("../Models/walletHs");

var instance = new Razorpay({
  key_id: process.env.RAZORPAY_ID_KEY,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
});

//order controller

//user order get
const userOrderGet = async (req, res) => {
  try {
    let pageNum = req.query.page;
    if (pageNum == undefined) {
      pageNum = 1;
    }
    const perPage = 3;
    user_id = req.session.isAuth;
    const totalDocumentsCount = await order
      .find({ user: user_id, paymentStatus: { $ne: "pending" } })
      .countDocuments();
    const all = await order
      .find({ user: user_id, paymentStatus: { $ne: "pending" } })
      .populate("products.product")
      .sort({ cancelledDate: -1, date: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage);
    let allCount = (pageNum - 1) * perPage;
    for (let i = 0; i < all.length; i++) {
      all[i].index = i + 1;
      all[i].index = allCount + 1;
      allCount++;
    }

    const ordersWithDateOnly = all.map((order) => {
      return {
        ...order,
        formattedDate: order.date.toLocaleDateString("en-GB"),
        cancelledDate: order.cancelledDate.toLocaleDateString("en-GB"),
      };
    });

    const totalPendingDocument = await order
      .find({ user: user_id, paymentStatus: { $eq: "pending" } })
      .countDocuments();
    const cartData = await order
      .find({ user: user_id, paymentStatus: { $eq: "pending" } })
      .populate("products.product")
      .sort({ date: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage);
    const ordersWithPendingDateOnly = cartData.map((order) => {
      return {
        ...order,
        formattedDate: order.date.toLocaleDateString("en-GB"),
      };
    });
    const flashMessage = req.query.flashMessageContent;
    const failMessage = req.query.failMessageContent;

    const totalPages = Math.ceil(totalDocumentsCount / perPage);
    const pendingPages = Math.ceil(totalPendingDocument / perPage);
    const pendingArray = [];
    const pageArray = [];

    for (let i = 1; i <= totalPages; i++) {
      pageArray.push(i);
    }
    for (let j = 1; j <= pendingPages; j++) {
      pendingArray.push(j);
    }
    console.log("totalpages:", pendingPages);
    res.render("users/userOrders", {
      carts: ordersWithPendingDateOnly,
      message: flashMessage,
      failMessage: failMessage,
      all: ordersWithDateOnly,
      userNav: true,
      count: req.session.count,
      tp: pageArray,
      tpa: pendingArray,
    });
  } catch (err) {
    console.log("error:", err);
    res.status(500).send(err);
  }
};

//order post
const orderDetailsPost = async (req, res) => {
  try {
    let { selectedPaymentMethod, selectedAddress, total, deliveryCharge } =
      req.body;
    const user_id = req.session.isAuth;
    const disc = req.session.discountedAmount;
    if (req.session.discountedAmount != null) {
      total = req.session.discountedAmount;
      total = parseInt(total, 10) + parseInt(deliveryCharge, 10);
    } else {
      total = total.replace(/[^\d]/g, "");
      total = parseInt(total, 10) + parseInt(deliveryCharge, 10);
      console.log("total:", total);
    }
    const addrs = await address.findOne({ addressName: selectedAddress });
    const orderedProduct = await cart
      .findOne({ user_id: user_id })
      .populate("user_id");
    const productsInCart = await orderedProduct.products.map((product) => ({
      product: product.product,
      quantity: product.quantity,
    }));
    let randomOrderId;
    let isOrderIdUnique = false;

    // Ensure the generated order ID is unique
    while (!isOrderIdUnique) {
      randomOrderId = generateRandomOrderId();
      const existingOrder = await order.findOne({ orderId: randomOrderId });

      if (!existingOrder) {
        isOrderIdUnique = true;
      }
    }
    const newOrder = await new order({
      products: productsInCart,
      user: user_id,
      orderId: randomOrderId,
      city: addrs.city,
      pincode: addrs.pincode,
      total: total,
      address: addrs.Address,
      date: Date.now(),
      paymentMethod: selectedPaymentMethod,
      fixedShipingCharge: deliveryCharge,
      coupenDiscount: req.session.discountedPercentage,
    });
    await newOrder.save();
    req.session.uniqueOrderId = randomOrderId;
    req.session.count = 0;
    await cart.updateOne({ user_id: user_id }, { $pull: { products: {} } });
    req.session.newOrder = newOrder;
    if (selectedPaymentMethod == "razorpay") {
      var options = {
        amount: total * 100,
        currency: "INR",
        receipt: newOrder._id,
      };

      instance.orders.create(options, function (error, raz_order) {
        if (error) {
          console.error("Error creating Razorpay order:", error);
        } else {
          console.log("Razorpay order created:", raz_order);

          res.json({ raz_order: raz_order, user: orderedProduct.user_id });
        }
      });
    } else {
      res.json({ cod_success: true });
    }
  } catch (err) {
    console.log("error:", err);
    res.status(500).send(err);
  }
};

//verifie payment
const verifyPayment = async (req, res) => {
  const user_id = req.session.isAuth;
  const { payment, razorOrder } = req.body;
  const crypto = require("crypto");
  var hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_KEY);
  hmac.update(razorOrder.id + "|" + payment.razorpay_payment_id);
  hmac = hmac.digest("hex");
  if (hmac == payment.razorpay_signature) {
    req.session.count = 0;
    req.session.coupenId = null;
    const uniqueOrderId = req.session.uniqueOrderId;
    const cheek = await order.updateOne(
      { orderId: uniqueOrderId },
      { $set: { orderPaymentStatus: "completed" } }
    );
    res.status(200).json({ status: true });
  } else {
    res.json({ status: false });
  }
};

// continue payment from order page
const continueFailedPayment = async (req, res) => {
  const { orderId } = req.body;
  const Order = await order.findOne({ orderId: orderId }).populate("user");
  req.session.failedPaymentOrderId = orderId;
  var options = {
    amount: Order.total * 100,
    currency: "INR",
    receipt: Order._id,
  };

  instance.orders.create(options, function (error, raz_order) {
    if (error) {
      console.error("Error creating Razorpay order:", error);
    } else {
      res.json({ raz_order: raz_order, user: Order.user });
    }
  });
};

// continued failedPayment verification
const FailedPaymentVerification = async (req, res) => {
  const user_id = req.session.isAuth;
  const { payment, razorOrder } = req.body;

  const crypto = require("crypto");
  var hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_KEY);
  hmac.update(razorOrder.id + "|" + payment.razorpay_payment_id);
  hmac = hmac.digest("hex");
  if (hmac == payment.razorpay_signature) {
    const uniqueOrderId = req.session.failedPaymentOrderId;
    const cheek = await order.updateOne(
      { orderId: uniqueOrderId },
      { $set: { orderPaymentStatus: "completed" } }
    );

    res.status(200).json({ status: true });
  } else {
    res.json({ status: false });
  }
};

//cancel order
const cancelOrder = async (req, res) => {
  try {
    const order_id = req.params.id;
    const userId = req.session.isAuth;
    await order.updateOne(
      { _id: order_id },
      { $set: { paymentStatus: "cancelled", cancelledDate: new Date() } }
    );
    const currentStatus = await order.findOne({ _id: order_id });
    if (
      currentStatus.paymentStatus == "cancelled" &&
      currentStatus.paymentMethod == "razorpay"
    ) {
      await UserModal.updateOne(
        { _id: userId },
        { $inc: { Userwallet: currentStatus.total } }
      );
      const UserWallet = await new walletHistory({
        user: userId,
        date: new Date(),
        transactionType: "refund",
        amount: currentStatus.total,
      });
      await UserWallet.save();
    }
    res.status(200).send("success");
  } catch (err) {
    console.log("error:", err);
    res.status(500).send(err);
  }
};

//return order
const returnOrder = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    await order.updateOne(
      { _id: orderId },
      {
        $set: {
          returnStatus: true,
          paymentStatus: "returnRequest",
          returnReason: reason,
          cancelledDate: new Date(),
        },
      }
    );
    res.send("success");
  } catch (err) {
    console.log("error:", err);
    res.status(500).send(err);
  }
};

//--------------------------------------------------------admin side order management-------------------------------------------
const manageOrderGet = async (req, res) => {
  try {
    let pageNum = req.query.page;
    const perPage = 4;
    let skipValue;
    if (pageNum == undefined) {
      pageNum = 1;
      skipValue = pageNum;
    } else {
      skipValue = (pageNum - 1) * perPage;
    }
    console.log("pageNum:", pageNum);

    const limitValue = perPage; // Set your limit value

    //order history
    const totalHistoryDocumentCount = await order.countDocuments({
      paymentStatus: { $ne: "pending" },
    });

    const all = await order.aggregate([
      {
        $match: {
          paymentStatus: { $ne: "pending" },
        },
      },
      {
        $sort: {
          cancelledDate: -1,
          date: -1,
        },
      },
      {
        $skip: skipValue,
      },
      {
        $limit: limitValue,
      },
    ]);
    let allCount = (pageNum - 1) * perPage;
    for (let i = 0; i < all.length; i++) {
      all[i].index = allCount + 1;
      allCount++;
    }
    const allordersWithDateOnly = all.map((order) => {
      return {
        ...order,
        formattedDate: order.date.toLocaleDateString("en-GB"),
        cancelledDate: order.cancelledDate.toLocaleDateString("en-GB"),
      };
    });
    const totalDocumentsCount = await order
      .find({ paymentStatus: { $in: ["pending", "returnRequest"] } })
      .countDocuments();
    const Order = await order
      .find({ paymentStatus: { $in: ["pending", "returnRequest"] } })
      .sort({ date: -1 })
      .populate("user")
      .skip((pageNum - 1) * perPage)
      .limit(perPage);
    const totalPages = Math.ceil(totalDocumentsCount / perPage);
    const totalHistoryPages = Math.ceil(totalHistoryDocumentCount / perPage);
    const pageArray = [];
    const historyArray = [];
    for (let j = 1; j <= totalHistoryPages; j++) {
      historyArray.push(j);
    }
    for (let i = 1; i <= totalPages; i++) {
      pageArray.push(i);
    }
    let count = (pageNum - 1) * perPage;
    for (let i = 0; i < Order.length; i++) {
      Order[i].index = count + 1;
      count++;
    }
    const ordersWithDateOnly = Order.map((order) => {
      return {
        ...order,
        formattedDate: order.date.toLocaleDateString("en-GB"),
      };
    });
    res.render("admin/manageOrder", {
      order: ordersWithDateOnly,
      all: allordersWithDateOnly,
      admin: true,
      pgn: pageArray,
      hpgn: historyArray,
    });
  } catch (err) {
    console.log("err:", err);
    res.status(500).send(err);
  }
};

//update order status
const updateStatus = async (req, res) => {
  try {
    const { orderId, newStatus, Userdetails } = req.body;

    if (newStatus === "accept") {
      await order.updateOne(
        { _id: orderId },
        {
          $set: {
            paymentStatus: "Accepted",
            returnStatus: true,
            cancelledDate: new Date(),
          },
        }
      );
    } else if (newStatus === "cancel") {
      await order.updateOne(
        { _id: orderId },
        { $set: { paymentStatus: "rejected", cancelledDate: new Date() } }
      );
    } else {
      await order.updateOne(
        { _id: orderId },
        { $set: { paymentStatus: newStatus, cancelledDate: new Date() } }
      );
    }
    //refunding

    const currentStatus = await order.findOne({ _id: orderId });

    if (
      (currentStatus.paymentStatus == "cancelled" &&
        currentStatus.paymentMethod == "razorpay") ||
      currentStatus.paymentStatus == "Accepted"
    ) {
      await UserModal.updateOne(
        { _id: Userdetails },
        { $inc: { Userwallet: currentStatus.total } }
      );
      const UserWallet = await new walletHistory({
        user: Userdetails,
        date: new Date(),
        transactionType: "refund",
        amount: currentStatus.total,
      });
      await UserWallet.save();
    }

    await main(null, null, null, orderId);

    res.status(200).send("success");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

//pie chart
const pieChart = async (req, res) => {
  const categoryWiseSale = await order.aggregate([
    {
      $match: {
        paymentStatus: { $ne: "cancelled" },
      },
    },
    {
      $unwind: "$products",
    },
    {
      $lookup: {
        from: "products", // the foreign collection name
        localField: "products.product", //the foreign collection id in our local collection
        foreignField: "_id", //foreign collection id
        as: "productInfo", //new field added
      },
    },
    {
      $unwind: "$productInfo",
    },
    {
      $group: {
        _id: "$productInfo.category",
        purchaseCount: { $sum: "$products.quantity" },
      },
    },
  ]);

  res.json({ categoryWiseSale });
};

//barChart
const barChart = async (req, res) => {
  const { timeFrame } = req.query;

  try {
    let aggregationPipeline = [];

    // Match based on payment status
    aggregationPipeline.push({
      $match: {
        $or: [{ paymentStatus: "pending" }, { paymentStatus: "delivered" }],
      },
    });

    // Group by different time frames
    switch (timeFrame) {
      case "daily":
        aggregationPipeline.push({
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            totalOrders: { $sum: 1 },
          },
        });
        break;

      case "weekly":
        aggregationPipeline.push({
          $group: {
            _id: { $dateToString: { format: "%Y-%U", date: "$date" } },
            totalOrders: { $sum: 1 },
          },
        });
        break;

      case "monthly":
        aggregationPipeline.push({
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
            totalOrders: { $sum: 1 },
          },
        });
        break;

      case "yearly":
        aggregationPipeline.push({
          $group: {
            _id: { $dateToString: { format: "%Y", date: "$date" } },
            totalOrders: { $sum: 1 },
          },
        });
        break;

      default:
        res.status(400).json({ error: "Invalid time frame" });
        return;
    }

    // Project and sort
    aggregationPipeline.push(
      {
        $project: {
          _id: 0,
          timeFrame: "$_id",
          totalOrders: 1,
        },
      },
      {
        $sort: { timeFrame: 1 },
      }
    );

    const result = await order.aggregate(aggregationPipeline);

    const salesData = {
      labels: result.map((entry) => entry.timeFrame),
      datasets: [
        {
          label: `${
            timeFrame.charAt(0).toUpperCase() + timeFrame.slice(1)
          } Sales`,
          backgroundColor: "rgba(75,192,192,0.2)",
          borderColor: "rgba(75,192,192,1)",
          borderWidth: 1,
          data: result.map((entry) => entry.totalOrders),
        },
      ],
    };

    res.json(salesData);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//get  sales report
const getReport = async (req, res) => {
  const { startDate, endDate } = req.query;
  const startDate_Time = new Date(`${startDate}T00:00:00Z`);
  const endDate_Time = new Date(`${endDate}T23:59:59Z`);
  const result = await order.aggregate([
    {
      $match: {
        date: {
          $gte: startDate_Time,
          $lte: endDate_Time,
        },
      },
    },
    {
      $unwind: "$products",
    },
    {
      $lookup: {
        from: "products",
        localField: "products.product",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    {
      $unwind: "$productInfo",
    },
    {
      $project: {
        productName: "$productInfo.name",
        productDescription: "$productInfo.description",
        productPrice: "$productInfo.price",
        finalPrice: "$productInfo.finalisedPrice",
        productQuantity: "$products.quantity",
        totalAmount: {
          $multiply: ["$productInfo.finalisedPrice", "$products.quantity"],
        },
      },
    },
    {
      $group: {
        _id: "$productName",
        description: {
          $first: "$productDescription",
        },
        price: {
          $first: "$productPrice",
        },
        finalAmount: { $first: "$finalPrice" },
        totalQuantity: {
          $sum: "$productQuantity",
        },
        totalAmount: {
          $sum: "$totalAmount",
        },
      },
    },
  ]);
  req.session.report = result;

  res.json(result);
};

//view Order details
const viewOrderDetails = async (req, res) => {
  const OrderId = req.params.id;

  const OrderDetails = await order
    .findOne({ orderId: OrderId })
    .populate("user", "name email number gmail")
    .populate(
      "products.product",
      "name price CategoryDiscountedPrice ProductDiscountedPrice images"
    );
  OrderDetails.products.forEach((productInfo) => {
    if (
      productInfo.product.CategoryDiscountedPrice > 0 ||
      productInfo.product.CategoryDiscountedPrice !== undefined
    ) {
      productInfo.product.finalDiscount =
        productInfo.product.CategoryDiscountedPrice;
    } else if (
      productInfo.product.CategoryDiscountedPrice === undefined &&
      productInfo.product.ProductDiscountedPrice !== undefined
    ) {
      productInfo.product.finalDiscount =
        productInfo.product.ProductDiscountedPrice;
    } else {
      productInfo.product.finalDiscount = 0;
    }
  });

  const result = {
    orderId: OrderDetails.orderId,
    username: OrderDetails.user.name,
    products: OrderDetails.products.map((productInfo) => ({
      name: productInfo.product.name,
      price: productInfo.product.price,
      quantity: productInfo.quantity,
      image: productInfo.product.images[0],
      Discount: productInfo.product.finalDiscount || 0,
    })),
    email: OrderDetails.user.email,
    gmail:OrderDetails.user.gmail,
    number: OrderDetails.user.number,
    pincode: OrderDetails.pincode,
    address: OrderDetails.address,
    city: OrderDetails.city,
    paymentStatus: OrderDetails.paymentStatus,
    orderPaymentStatus: OrderDetails.orderPaymentStatus,
    fixedShippingCharge: OrderDetails.fixedShipingCharge,
    total: OrderDetails.total,
    coupenDiscount: OrderDetails.coupenDiscount,
  };

  res.render("admin/viewOrderDetails", { order: result });
};

module.exports = {
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
};
