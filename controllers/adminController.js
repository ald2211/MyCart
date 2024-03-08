//Admin controller page

const bcrypt = require("bcrypt");
const User = require("../Models/user");
const product = require("../Models/product");
const category = require("../Models/category");
const order = require("../Models/order");
const coupen = require("../Models/coupen");

//----------------------------------------------- Admin Home starts-------------------------------------------------------

const adminHome = async (req, res, next) => {
  //total categories
  const totalCategories = await category.aggregate([
    {
      $group: {
        _id: null,
        listed: {
          $sum: {
            $cond: { if: { $eq: ["$status", true] }, then: 1, else: 0 },
          },
        },
        unlisted: {
          $sum: {
            $cond: { if: { $eq: ["$status", false] }, then: 1, else: 0 },
          },
        },
      },
    },
    {
      $project: {
        _id: 0, // Exclude _id field
        listed: 1,
        unlisted: 1,
      },
    },
  ]);

  //total products
  const totalProducts = await product.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
      },
    },
  ]);

  //total users
  const totalUsers = await User.aggregate([
    {
      $group: {
        _id: null,
        activeUsers: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$isBlocked", false] },
                  { $ne: ["$isAdmin", true] },
                ],
              },
              1,
              0,
            ],
          },
        },
        blockedUsers: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$isBlocked", true] },
                  { $ne: ["$isAdmin", true] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  //total orders
  const totalOrders = await order.aggregate([
    {
      $group: {
        _id: null,
        pendingOrders: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0],
          },
        },
        completedOrders: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$paymentStatus", "pending"] },
                  { $ne: ["$paymentStatus", "cancelled"] },
                ],
              },
              1,
              0,
            ],
          },
        },
        cancelledOrders: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "cancelled"] }, 1, 0],
          },
        },
        income: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ["$paymentStatus", "delivered"] },
                  { $eq: ["$paymentStatus", "pending"] },
                  { $eq: ["$paymentStatus", "Accepted"] },
                  { $eq: ["$paymentStatus", "rejected"] },
                ],
              },
              "$total",
              0,
            ],
          },
        },
      },
    },
  ]);

  //top three best selling Products
  const bestSellingProduct = await order.aggregate([
    {
      $match: {
        paymentStatus: { $ne: "cancelled" },
      },
    },
    // Unwind the products array to get each product as a separate document
    { $unwind: "$products" },

    // Group by product and sum the quantity
    {
      $group: {
        _id: "$products.product",
        totalQuantity: { $sum: "$products.quantity" },
      },
    },

    // Sort by total quantity in descending order
    { $sort: { totalQuantity: -1 } },

    // Limit to the top 3 products
    { $limit: 3 },

    // Lookup to get the product details
    {
      $lookup: {
        from: "products", // Replace with your actual product collection name
        localField: "_id",
        foreignField: "_id",
        as: "productDetails",
      },
    },

    // Unwind the productDetails array
    { $unwind: "$productDetails" },

    // Project to reshape the output
    {
      $project: {
        _id: 0,
        productName: "$productDetails.name",
        productImage: "$productDetails.images", // Replace with the actual field name for image
        productPrice: "$productDetails.price", // Replace with the actual field name for price
        totalQuantity: 1,
      },
    },
  ]);

  //top three best selling categories
  const bestSellingCategories = await order.aggregate([
    {
      $match: {
        paymentStatus: { $ne: "cancelled" },
      },
    },
    // Unwind the products array to get each product as a separate document
    { $unwind: "$products" },

    // Lookup to get the product details including category
    {
      $lookup: {
        from: "products", 
        localField: "products.product",
        foreignField: "_id",
        as: "productDetails",
      },
    },

    // Unwind the productDetails array
    { $unwind: "$productDetails" },

    // Group by category and sum the quantity
    {
      $group: {
        _id: "$productDetails.category",
        totalQuantity: { $sum: "$products.quantity" },
      },
    },

    // Sort by total quantity in descending order
    { $sort: { totalQuantity: -1 } },

    // Limit to the top 3 categories
    { $limit: 3 },
  ]);

  res.render("admin/adminHome", {
    category: totalCategories,
    products: totalProducts,
    users: totalUsers,
    bp: bestSellingProduct,
    bc: bestSellingCategories,
    orders: totalOrders,
    admin: true,
  });
};

//----------------------------------------------- Admin Home ends-------------------------------------------------------

//----------------------------------------------- Admin Login starts-------------------------------------------------------
const adminLogin = (req, res) => {
  res.render("admin/AdminLogin");
};

const adminLoginPost = async (req, res) => {
  try {
    const check = await User.findOne({ email: req.body.email });
    if (!check) {
      req.session.message = {
        type: false,
        message: "incorrect email",
      };
      return res.redirect("/admin/adminLogin");
    }
    const ispasswordMatch = await bcrypt.compare(
      req.body.password,
      check.password
    );
    if (!ispasswordMatch) {
      req.session.message = {
        type: false,
        message: "incorrect password",
      };
      return res.redirect("/admin/adminLogin");
    }
    if (check.isAdmin) {
      req.session.admin = check.isAdmin;
      res.redirect("/admin");
    } else {
      req.session.message = {
        type: false,
        message: "your are not a admin",
      };
      res.redirect("/admin/adminLogin");
    }
  } catch (err) {
    res.status(500).send(err);
  }
};
//----------------------------------------------- Admin Login Ends-------------------------------------------------------

//----------------------------------------------- User management starts-------------------------------------------------------

const userManagement = async (req, res) => {
  const pageNum = req.query.page;
  const perPage = 5;
  const totalDocumentsCount = await User.find({
    isAdmin: false,
  }).countDocuments();
  const user_data = await User.find({ isAdmin: false })
    .skip((pageNum - 1) * perPage)
    .limit(perPage);
  const totalPages = Math.ceil(totalDocumentsCount / perPage);
  const pageArray = [];
  for (let i = 1; i <= totalPages; i++) {
    pageArray.push(i);
  }
  res.render("admin/usermanagement", {
    data: user_data,
    admin: true,
    pgn: pageArray,
  });
};

const blockUser = async (req, res) => {
  try {
    let id = req.params.id;
    const BlockUser = await User.findById(id);
    BlockUser.isBlocked = true;
    await BlockUser.save();
    req.session.blocked = true;
    res.redirect("/admin/manageUser");
  } catch (err) {
    res.status(500).send(err);
  }
};
const unblockUser = async (req, res) => {
  try {
    let id = req.params.id;
    const unBlockUser = await User.findById(id);
    req.session.blocked = false;
    unBlockUser.isBlocked = false;
    await unBlockUser.save();
    res.redirect("/admin/manageUser");
  } catch (err) {
    res.status(500).send(err);
  }
};
const showSearchResults = async (req, res) => {
  try {
    // Retrieve the search query from the URL parameters
    const searchedText = req.query.search || "";
    const pageNum = req.query.page;
    const perPage = 5;
    const totalDocumentsCount = await User.find({
      name: { $regex: new RegExp(searchedText, "i") },
      isAdmin: false,
    }).countDocuments();
    const searchedResult = await User.find({
      name: { $regex: new RegExp(searchedText, "i") },
      isAdmin: false,
    })

      .skip((pageNum - 1) * perPage)
      .limit(perPage);
    const totalPages = Math.ceil(totalDocumentsCount / perPage);
    const pageArray = [];
    for (let i = 1; i <= totalPages; i++) {
      pageArray.push(i);
    }

    res.render("admin/searchUser", {
      result: searchedResult,
      searchedText,
      admin: true,
      pgn: pageArray,
    });
  } catch (error) {
    console.log(error);
    req.session.message = {
      type: false,
      message: `Error displaying search results: ${error.message}`,
    };

    // Redirect to the search page in case of an error
    res.redirect("/admin/searchUserResults");
  }
};
const searchUser = async (req, res) => {
  try {
    let searchedText = req.body.searchuser || "";
    let sanitizingText = searchedText.replace(/[^\w\s]/gi, "");
    res.redirect(
      `/admin/searchUserResults?search=${encodeURIComponent(sanitizingText)}`
    );
  } catch (error) {
    console.log(error);
    req.session.message = {
      type: false,
      message: `Error searching user: ${error.message}`,
    };

    // Redirect to the search page in case of an error
    res.redirect("/admin/searchUserResults");
  }
};

//----------------------------------------------- User management ends-------------------------------------------------------

//----------------------------------------------- Admin logout starts-------------------------------------------------------

const adminLogout = (req, res) => {
  req.session.admin = null;
  res.redirect("/admin/adminLogin");
};

//----------------------------------------------- Admin logout ends-------------------------------------------------------

module.exports = {
  adminHome,
  adminLogin,
  adminLoginPost,
  adminLogout,
  userManagement,
  blockUser,
  unblockUser,
  searchUser,
  showSearchResults,
};
