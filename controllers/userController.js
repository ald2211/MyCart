//userController

const User = require("../Models/user");
const Category = require("../Models/category");
const Product = require("../Models/product");
const bcrypt = require("bcrypt");
const asyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer");
const saltRound = require("../common/constands");
const validator = require("validator");
const notifications = require("../Models/notification");
const address = require("../Models/address");
const cart = require("../Models/cart");
const { ObjectId } = require("mongodb");
const order = require("../Models/order");
const { main } = require("../emailHelper");
const fs = require("fs");
const coupen = require("../Models/coupen");
const charges = require("../Models/charges");
const banner = require("../Models/banner");
const offer = require("../Models/offer");

//----------------------------------------------- user home starts-------------------------------------------------------

const userHome = async (req, res) => {
  const pageNum = req.query.page;
  const perPage = 8;
  const totalDocumentsCount = await Product.find({
    categoryStatus: true,
    softDelete: false,
  }).countDocuments();
  const productDetails = await Product.find({
    categoryStatus: true,
    softDelete: false,
  })
    .skip((pageNum - 1) * perPage)
    .limit(perPage);
  const totalPages = Math.ceil(totalDocumentsCount / perPage);
  const pageArray = [];
  for (let i = 1; i <= totalPages; i++) {
    pageArray.push(i);
  }
  const allCategories = await Category.find({ status: true });
  const flashMessageContent = req.query.flashMessageContent;
  const user_id = req.session.isAuth;
  const objectuser = new ObjectId(user_id);
  const itemCount = await cart.aggregate([
    {
      $match: {
        user_id: objectuser,
      },
    },
    {
      $unwind: "$products",
    },
    {
      $group: {
        _id: null,
        count: {
          $sum: "$products.quantity",
        },
      },
    },
    {
      $project: {
        _id: 0,
        itemCount: "$count",
      },
    },
  ]);
  if (itemCount && itemCount.length > 0) {
    req.session.count = itemCount;
  } else {
    req.session.count = 0;
  }

  productDetails.forEach((data) => {
    if (data.publishedDate) {
      const options = { day: "2-digit", month: "2-digit", year: "2-digit" };
      data.publishedDate = data.publishedDate.toLocaleDateString(
        undefined,
        options
      );
    }
  });
  //if user didnt continue the chekout after applying coupen code
  req.session.discountedAmount = null;
  await User.updateOne(
    { _id: user_id },
    { $pull: { appliedCoupons: req.session.coupenId } }
  );

  // show banner
  const Banner = await banner.find({});

  res.render("users/userHome", {
    product: productDetails,
    categories: allCategories,
    count: itemCount,
    message: flashMessageContent,
    userNav: true,
    userfooter: true,
    pgn: pageArray,
    Banner,
  });
};
//----------------------------------------------- user home ends-------------------------------------------------------

//----------------------------------------------- user search starts-------------------------------------------------------

const userSearch = async (req, res) => {
  const allCategories = await Category.find({ status: true });
  let searchedText = req.body.search || "";
  let sanitizingText = searchedText.replace(/[^\w\s]/gi, "");
  let searchedResult = await Product.find({
    name: { $regex: new RegExp(sanitizingText, "i") },
  });
  res.render("users/searchUser", {
    product: searchedResult,
    categories: allCategories,
    count: req.session.count,
    userNav: true,
    userfooter: true,
  });
};
//----------------------------------------------- user search ends-------------------------------------------------------

//----------------------------------------------- user signup page starts-------------------------------------------------------
const userSignup = (req, res) => {
  req.session.referalLinkCode = req.query.linkCode || null;

  res.render("users/signup");
};

//post signup
const userSignupPost = async (req, res) => {
  if (!req.body.name.trim() || !req.body.password.trim()) {
    req.session.message = {
      type: false,
      message: "white spaces found please remove it ",
    };
    res.redirect("/signUp");
    return;
  }
  if (validator.isEmail(req.body.email)) {
    const NewUser = new User({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      number: req.body.number,
    });
    const checkDuplicate = await User.findOne({ email: req.body.email });
    if (checkDuplicate) {
      req.session.message = {
        type: false,
        message: "email already registered",
      };
      return res.redirect("/signup");
    }
    const checkNumber = await User.findOne({ number: req.body.number });
    if (checkNumber) {
      req.session.message = {
        type: false,
        message: "number already registered",
      };
      return res.redirect("/signup");
    }
    //hash the password using bcrypt
    // const saltrounds = 10; //number of salt round for bcrypt
    const hashPassword = await bcrypt.hash(NewUser.password, saltRound);
    NewUser.password = hashPassword; //replacing the orginal password
    // Insert data into the 'details' collection
    req.session.newUser = NewUser;
    req.session.email = req.body.email;

    await main(req);
    res.redirect("/emails/otp");
  } else {
    req.session.message = {
      type: false,
      message: "invalid email",
    };
    res.redirect("/signup");
  }
};
//----------------------------------------------- user signup page ends-------------------------------------------------------
//----------------------------------------------- user login page starts-------------------------------------------------------
//get login page
const userLogin = (req, res) => {
  if (req.session.isAdmin) {
    res.redirect("/home");
    return;
  }
  res.render("users/login");
};

//login post
const userLoginPost = async (req, res) => {
  try {
    const check = await User.findOne({ email: req.body.email });
    if (!check) {
      req.session.message = {
        type: false,
        message: "incorrect email",
      };
      req.session.isAuth = false;
      return res.redirect("/login");
    }
    const ispasswordMatch = await bcrypt.compare(
      req.body.password,
      check.password
    );
    if (!ispasswordMatch) {
      req.session.isAuth = false;
      req.session.message = {
        type: false,
        message: "incorrect password",
      };

      return res.redirect("/login");
    }

    if (!check.isAdmin) {
      if (!check.isBlocked) {
        req.session.isAuth = check._id;
        return res.redirect("/home");
      } else {
        req.session.isAuth = null;
        req.session.message = {
          type: false,
          message: "sorry due to some reason you are not allowed ",
        };
        return res.redirect("/login");
      }
    }
    req.session.message = {
      type: false,
      message: "invalid login",
    };
    res.redirect("/login");
  } catch (err) {
    res.status(500).send(err);
  }
};
//----------------------------------------------- user login page ends-------------------------------------------------------
//----------------------------------------------- user zoom product page starts-------------------------------------------------------
const zoomProduct = async (req, res) => {
  let zoomId = req.params.id;
  let user_id = req.session.isAuth;
  const data = await Product.findById(zoomId);

  const day = String(data.publishedDate.getDate()).padStart(2, "0");
  const month = String(data.publishedDate.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const year = String(data.publishedDate.getFullYear()).slice(-2);
  let test = `${day}/${month}/${year}`;
  req.session.discountedAmount = null;
  await User.updateOne(
    { _id: user_id },
    { $pull: { appliedCoupons: req.session.coupenId } }
  );
  res.render("users/productZoom", {
    datas: data,
    date: test,
    userNav: true,
    count: req.session.count,
  });
};
//----------------------------------------------- user zoom product page ends-------------------------------------------------------
//----------------------------------------------- user profile page starts-------------------------------------------------------
const userProfile = async (req, res) => {
  const id = req.session.isAuth;
  const Address = await address
    .find({ user_id: id })
    .populate("user_id")
    .limit(3);
  const Order = await order
    .find({ user: id, paymentStatus: "pending" })
    .limit(3)
    .sort({ date: -1 });
  const user = await User.findById(id);
  var ordersWithDateOnly;
  if (Order) {
    ordersWithDateOnly = Order.map((order) => {
      return {
        ...order,
        formattedDate: order.date.toISOString().split("T")[0],
      };
    });
  } else {
    ordersWithDateOnly = false;
  }
  const Notifications = await notifications.find({ user_id: id });
  const count = req.session.count;

  res.render("users/userProfile", {
    user,
    Notifications,
    Address,
    count,
    Order: ordersWithDateOnly,
    userNav: true,
  });
};

//get edit user profile page
const editUserProfile = async (req, res) => {
  const id = req.params.id;
  const user = await User.findById(id);

  res.render("users/editUserProfile", { user });
};

//edit user profile post
const editUserProfilePost = async (req, res) => {
  const id = req.params.id;
  const userUpdate = {
    name: req.body.name,
  };
  if (req.file) {
    userUpdate.profileImage = req.file.filename;
  }
  await User.findByIdAndUpdate(id, { $set: userUpdate }, { new: true });
  req.session.message = {
    type: true,
    message: "user profile updated successfully",
  };
  res.redirect("/profile");
};

//reset password get
const resetPasswordGet = (req, res) => {
  const user = req.session.isAuth;
  res.render("users/resetPasswordLin", { user });
};

//reset password post
const resetPasswordPost = async (req, res) => {
  const id = req.params.id;
  const { oldPassword, newPassword, confirmPassword } = req.body;
  let ogUser = await User.findOne({ _id: id }, { password: 1 });
  const ispasswordMatch = await bcrypt.compare(oldPassword, ogUser.password);
  if (!ispasswordMatch) {
    req.session.message = {
      type: false,
      message: "your current password is incorrect",
    };
    res.redirect("/reset");
    return;
  }
  if (newPassword !== confirmPassword) {
    req.session.message = {
      type: false,
      message: "confirm password is wrong",
    };
    res.redirect("/reset");
    return;
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  ogUser.password = hashedPassword;
  await ogUser.save();
  req.session.message = {
    type: true,
    message: "password updated successfully",
  };
  const Notification = await new notifications({
    user_id: ogUser._id,
    message: "hi,your password updated successfully",
    createdAt: Date.now(),
  });
  Notification.save();
  res.redirect("/profile");
};

//address page get
const addressGet = async (req, res) => {
  id = req.session.isAuth;
  req.session.addressPage = true;
  const pageNum = req.query.page;
  const perPage = 2;
  const totalDocumentsCount = await address
    .find({ user_id: id })
    .countDocuments();
  const Address = await address
    .find({ user_id: id })
    .skip((pageNum - 1) * perPage)
    .limit(perPage);
  const totalPages = Math.ceil(totalDocumentsCount / perPage);
  const pageArray = [];
  for (let i = 1; i <= totalPages; i++) {
    pageArray.push(i);
  }
  res.render("users/userAddress", { Address, userNav: true, pgn: pageArray ,count:req.session.count});
};

//add new address page get
const addAddress = async (req, res) => {
  const id = req.session.isAuth;

  req.session.discountedAmount = null;
  await User.updateOne(
    { _id: id },
    { $pull: { appliedCoupons: req.session.coupenId } }
  );
  res.render("users/addAddress");
};

//submit new address
const submitAddress = async (req, res) => {
  const id = req.session.isAuth;
  const user = await User.findById(id);
  const newAddress = new address({
    user_id: user._id,
    addressName: req.body.Addressname,
    name: req.body.name,
    number: req.body.number,
    Address: req.body.address,
    city: req.body.city,
    pincode: req.body.pincode,
    state: req.body.state,
    country: req.body.country,
  });
  await newAddress
    .save()
    .then(() => {
      req.session.message = {
        type: true,
        message: "address added success fully",
      };
      if (req.session.addressPage) {
        res.redirect("/address");
      } else {
        res.redirect("/buy");
      }
    })
    .catch((error) => {
      console.log(error);
      req.session.message = {
        type: false,
        message: `Error adding address:${error.message}`,
      };
    });
};

//edit address page get
const editAddressGet = async (req, res) => {
  try {
    const user_id = req.session.auth;
    req.session.discountedAmount = null;
    await User.updateOne(
      { _id: user_id },
      { $pull: { appliedCoupons: req.session.coupenId } }
    );
    const id = req.params.id;
    const data = await address.findById(id);
    res.render("users/editAddress", { data });
  } catch (error) {
    res.status(500).send(error);
  }
};

//edit address page post
const editAddressPost = async (req, res) => {
  try {
    const id = req.params.id;
    const editedAddress = await address.findByIdAndUpdate(
      id,
      {
        addressName: req.body.Addressname,
        name: req.body.name,
        number: req.body.number,
        Address: req.body.address,
        city: req.body.city,
        pincode: req.body.pincode,
        state: req.body.state,
        country: req.body.country,
      },
      { new: true }
    );
    editedAddress.save();
    req.session.message = {
      type: true,
      message: "Address updated successfully",
    };

    if (req.session.addressPage) {
      res.redirect("/address");
    } else {
      res.redirect("/buy");
    }
  } catch (error) {
    res.status(500).send(error);
  }
};

//delete address
const deleteAddress = async (req, res) => {
  try {
    const id = req.params.id;
    const deleteAddress = await address.findByIdAndDelete(id);
    if (!deleteAddress) {
      return res.send("some error occurs");
    }
    req.session.message = {
      type: true,
      message: "Address deleted successfully",
    };
    res.redirect("/address");
  } catch (error) {
    res.status(500).send(error);
  }
};

//----------------------------------------------- user Profile page ends-------------------------------------------------------
//----------------------------------------------- user Cart page starts-------------------------------------------------------
const userCartGet = async (req, res) => {
  try {
    const user_id = req.session.isAuth;
    const objectuser = new ObjectId(user_id);
    const cartData = await cart
      .find({ user_id: user_id })
      .populate("products.product");

    const itemCount = await cart.aggregate([
      {
        $match: {
          user_id: objectuser,
        },
      },
      {
        $unwind: "$products",
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: "$products.quantity",
          },
        },
      },
      {
        $project: {
          _id: 0,
          itemCount: "$count",
        },
      },
    ]);
    if (itemCount && itemCount.length > 0) {
      req.session.count = itemCount;
    } else {
      req.session.count = 0;
    }
    const Total = await cart.aggregate([
      {
        $match: {
          user_id: objectuser,
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
          total: {
            $multiply: ["$products.quantity", "$productInfo.finalisedPrice"],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$total",
          },
        },
      },
    ]);
    if (Total && Total.length > 0) {
      req.session.total = Total[0].total;
    } else {
      req.session.total = 0;
    }
    req.session.discountedAmount = null;
    await User.updateOne(
      { _id: user_id },
      { $pull: { appliedCoupons: req.session.coupenId } }
    );
    res.render("users/userCart", {
      carts: cartData,
      total: Total,
      count: itemCount,
      userNav: true,
    });
  } catch (error) {
    // Handle errors gracefully
    console.error("Error in userCartGet:", error);
    res.status(500).send("Internal Server Error");
  }
};
const addToCart = async (req, res) => {
  const user_id = req.session.isAuth;
  const product_id = req.params.id;
  const defaultQuantity = 1;
  const stock = await Product.findOne({ _id: product_id });
  req.session.mainStock = stock.stock;
  let userCart = await cart.findOne({ user_id: user_id });

  if (!userCart) {
    userCart = new cart({
      user_id: user_id,
      products: [],
    });
  }
  const existingProduct = userCart.products.find((item) =>
    item.product.equals(product_id)
  );

  if (existingProduct) {
    // If the product is in the cart, update the quantity
    existingProduct.quantity += defaultQuantity;
    const resl = (stock.stock -= 1);
    if (resl == 0) {
      stock.stockStatus = "out of Stock";
    }
  } else {
    // If the product is not in the cart, add it
    userCart.products.push({ product: product_id, quantity: defaultQuantity });
    const sr = (stock.stock -= 1);
    if (sr == 0) {
      stock.stockStatus = "out of Stock";
    }
  }
  await Promise.all([userCart.save(), stock.save()])
    .then(() => {
      res.redirect("/home");
    })
    .catch((err) => {
      res.status(500).send("some error occurs", err);
    });
};

//remove items from cart
const removeFromCart = async (req, res) => {
  try {
    const product_id = req.params.id;
    const id = req.session.isAuth;
    await Product.updateOne(
      { _id: product_id },
      { $set: { stock: req.session.mainStock } }
    );
    await cart.updateOne(
      { user_id: id },
      { $pull: { products: { product: product_id } } }
    );
    res.redirect("/cart");
  } catch (err) {
    res.status(500).send(err);
  }
};

//update quantity of product from the cart
const updateQuantity = async (req, res) => {
  const product_id = req.params.id;
  const newQuantity = req.body.quantity;
  const ogId = req.body.ogId;
  const user_id = req.session.isAuth;

  try {
    const productIdObject = new ObjectId(product_id);
    const objectuser = new ObjectId(user_id);

    if (newQuantity < 1) {
      await cart.updateOne(
        { "products._id": productIdObject },
        { $inc: { "products.$.quantity": -1 } }
      );
      await Product.updateOne(
        { _id: ogId },
        {
          $inc: { stock: 1 },
        }
      );
    } else {
      await cart.updateOne(
        { "products._id": productIdObject },
        { $inc: { "products.$.quantity": 1 } }
      );
      await Product.updateOne(
        { _id: ogId },
        {
          $inc: { stock: -1 },
        }
      );
    }

    const Total = await cart.aggregate([
      {
        $match: {
          user_id: objectuser,
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
          total: {
            $multiply: ["$products.quantity", "$productInfo.finalisedPrice"],
          },
          quantity: "$products.quantity",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$total",
          },
          itemCount: {
            $sum: "$quantity",
          },
        },
      },
    ]);
    req.session.count = Total[0].itemCount;
    req.session.total = Total[0].total;
    res.json(Total);
  } catch (error) {
    console.error("Error updating quantity:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//----------------------------------------------- user Cart page ends-------------------------------------------------------
//----------------------------------------------- user buy product page starts-------------------------------------------------------
const buyProdcut = async (req, res) => {
  try {
    const Charge = await charges.findOne({});
    let deliveryCharge;
    const user_id = req.session.isAuth;
    const totalPrice = req.session.total;
    if (totalPrice > Charge.minimumAmount) {
      deliveryCharge = 0;
    } else {
      deliveryCharge = Charge.fixedDeliveryCharge;
    }

    const discountedPrice = req.session.discountedAmount;
    req.session.addressPage = false;
    const userAddress = await address
      .find({ user_id: user_id })
      .populate("user_id");
    const userProducts = await cart
      .find({ user_id: user_id })
      .populate("products.product");
    res.render("users/BuyProduct", {
      address: userAddress,
      items: userProducts,
      total: totalPrice,
      discount: discountedPrice,
      user: userAddress.user_id,
      deliveryCharge,
    });
  } catch (err) {
    res.status(500).send(err);
  }
};

//apply coupen
const applyCoupen = async (req, res) => {
  const { coupenCode, total } = req.body;
  const userId = req.session.isAuth;

  try {
    // Checking if the user has already applied the coupon
    const user = await User.findById(userId).populate("appliedCoupons");
    console.log("user:", user);
    const alreadyApplied = user.appliedCoupons.some(
      (appliedCoupon) => appliedCoupon.code === coupenCode
    );

    if (alreadyApplied) {
      req.session.message = {
        type: false,
        message: "coupen is already availed",
      };
      res.status(400).send({ success: false });
      return;
    }

    // Check the validity of the coupon
    const couponCheck = await coupen.findOne({
      code: coupenCode,
      validFrom: { $lte: new Date() },
      validTo: { $gte: new Date() },
    });

    if (!couponCheck) {
      req.session.message = {
        type: false,
        message: "coupen is not applicable",
      };
      return res.status(400).send({ success: false });
    }

    // Applying discount logic here
    if (total < couponCheck.range) {
      req.session.message = {
        type: false,
        message: "coupen is not applicable",
      };
      return res.status(400).send({ success: false });
    }
    const discount = (couponCheck.discount / 100) * total;
    req.session.discountedPercentage = couponCheck.discount;
    const discountedAmount = total - discount;
    const roundedDiscountedAmount = Math.ceil(discountedAmount);

    req.session.coupenId = couponCheck._id;
    req.session.discountedAmount = roundedDiscountedAmount;

    // Update the user's appliedCoupons field
    user.appliedCoupons.push(couponCheck);
    await user.save();
    req.session.message = {
      type: true,
      message: "Coupon applied successfully",
    };
    res.status(200).send({ success: true });
  } catch (error) {
    console.error(error);
    req.session.message = {
      type: false,
      message: "Invalid Coupen code",
    };
    res.status(400).send({ success: false });
  }
};
//----------------------------------------------- user buy product page ends-------------------------------------------------------
//----------------------------------------------- user logout page starts-------------------------------------------------------
const userLogout = (req, res) => {
  req.session.isAuth = null;
  req.session.verified = false;
  res.redirect("/login");
};
//----------------------------------------------- user logout page ends-------------------------------------------------------
//-----------------------------------------------user invoice start----------------------------------------------------------------
const getInvoice = async (req, res) => {
  const order_Id = req.params.id;

  const orderDetails = await order.aggregate([
    {
      $match: {
        orderId: order_Id,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userData",
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
        as: "productData",
      },
    },
    {
      $project: {
        userName: "$userData.name",
        number: "$userData.number",
        address: "$address",
        pincode: "$pincode",
        city: "$city",
        date: "$date",
        productName: { $arrayElemAt: ["$productData.name", 0] }, // Use $arrayElemAt to get the first element of the array
        quantity: "$products.quantity",
        price: { $arrayElemAt: ["$productData.price", 0] }, // Use $arrayElemAt to get the first element of the array
        finalisedPrice: { $arrayElemAt: ["$productData.finalisedPrice", 0] }, // Use $arrayElemAt to get the first element of the array
        totalPerProduct: {
          $multiply: [
            "$products.quantity",
            { $arrayElemAt: ["$productData.finalisedPrice", 0] },
          ],
        },
        grandTotal: "$total",
        charge: "$fixedShipingCharge",
        coupen: "$coupenDiscount",
      },
    },
    {
      $group: {
        _id: "$_id",
        userName: { $first: "$userName" },
        number: { $first: "$number" },
        pincode: { $first: "$pincode" },
        city: { $first: "$city" },
        date: { $first: "$date" },
        address: { $first: "$address" },
        products: {
          $push: {
            productName: "$productName",
            quantity: "$quantity",
            price: "$price",
            finalisedPrice: "$finalisedPrice",
            totalPerProduct: "$totalPerProduct",
          },
        },
        grandTotal: { $first: "$grandTotal" },
        deliveryCharge: { $first: "$charge" },
        coupen: { $first: "$coupen" },
      },
    },
  ]);
  orderDetails[0].date = orderDetails[0].date.toLocaleDateString("en-GB");

  res.render("users/showInvoice", { order: orderDetails });
};
//-----------------------------------------------user invoice ends-----------------------------------------------------------------
//-----------------------------------------------category filtering starts -----------------------------------------------------------
const getCategoryFilter = async (req, res) => {
  const categoryName = req.session.categoryName;
  const pageNum = req.query.page;
  const perPage = 2;
  const totalDocumentsCount = await Product.find({
    category: categoryName,
    categoryStatus: true,
    softDelete: false,
  }).countDocuments();
  const productDetails = await Product.find({
    categoryStatus: true,
    softDelete: false,
    category: categoryName,
  })
    .skip((pageNum - 1) * perPage)
    .limit(perPage);
  const totalPages = Math.ceil(totalDocumentsCount / perPage);
  const pageArray = [];
  for (let i = 1; i <= totalPages; i++) {
    pageArray.push(i);
  }
  const OfferDetails = await offer.findOne({ name: categoryName });
  res.render("users/categoryFilteredPage", {
    product: productDetails,
    userNav: true,
    pgn: pageArray,
    count: req.session.count,
    offer: OfferDetails,
  });
};

//category wise filtering post
const postCategoryFilter = async (req, res) => {
  req.session.categoryName = req.body.category;
  res.send({ success: true });
};
//-----------------------------------------------category filtering ends -----------------------------------------------------------

//----------------------------------------------public allowed page-----------------------------------------------------------------
const public = async (req, res) => {
  const pageNum = req.query.page;
  const perPage = 8;
  const totalDocumentsCount = await Product.find({
    categoryStatus: true,
    softDelete: false,
  }).countDocuments();
  const productDetails = await Product.find({
    categoryStatus: true,
    softDelete: false,
  })
    .skip((pageNum - 1) * perPage)
    .limit(perPage);
  const totalPages = Math.ceil(totalDocumentsCount / perPage);
  const pageArray = [];
  for (let i = 1; i <= totalPages; i++) {
    pageArray.push(i);
  }
  const allCategories = await Category.find({ status: true });
  res.render("users/public", {
    product: productDetails,
    categories: allCategories,
    userNav: true,
    userfooter: true,
    pgn: pageArray,
    public: true,
  });
};
//----------------------------------------------public allowed page ends------------------------------------------------------------

//----------------------------------------------- invalid route request starts-------------------------------------------------------

const invalidRequest = (req, res) => {
  res.status(404).write("<h1>sorry no result...</h1>");
};

//----------------------------------------------- invalid route request ends-------------------------------------------------------

module.exports = {
  userLogin,
  userLoginPost,
  userHome,
  userSignup,
  userSignupPost,
  invalidRequest,
  userLogout,
  zoomProduct,
  userSearch,
  userProfile,
  editUserProfile,
  editUserProfilePost,
  resetPasswordGet,
  resetPasswordPost,
  addressGet,
  addAddress,
  submitAddress,
  deleteAddress,
  editAddressGet,
  editAddressPost,
  userCartGet,
  addToCart,
  removeFromCart,
  updateQuantity,
  buyProdcut,
  getInvoice,
  applyCoupen,
  getCategoryFilter,
  postCategoryFilter,
  public,
};
