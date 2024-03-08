const User = require("../Models/user");
const product = require("../Models/product");
const category = require("../Models/category");
const order = require("../Models/order");
const coupen = require("../Models/coupen");

//----------------------------------------------- coupen management ends-------------------------------------------------------

//get coupen
const getCoupen = async (req, res) => {
  const currentDate = new Date();
  const pageNum = req.query.page;
  const perPage = 4;
  req.session.limit = perPage;
  req.session.skip = pageNum;
  const totalDocumentsCount = await coupen
    .find({ validTo: { $gt: currentDate } })
    .countDocuments();
  const coupens = await coupen
    .find({ validTo: { $gt: currentDate } })
    .skip((pageNum - 1) * perPage)
    .limit(perPage);
  const formattedDate = coupens.map((data) => {
    return {
      ...data,
      from: data.validFrom
        .toISOString()
        .split("T")[0]
        .split("-")
        .reverse()
        .join("/"),
      to: data.validTo
        .toISOString()
        .split("T")[0]
        .split("-")
        .reverse()
        .join("/"),
    };
  });
  const totalPages = Math.ceil(totalDocumentsCount / perPage);
  const pageArray = [];
  for (let i = 1; i <= totalPages; i++) {
    pageArray.push(i);
  }
  console.log("coupen:", formattedDate);
  res.render("admin/manageCoupen", {
    admin: true,
    pgn: pageArray,
    coupen: formattedDate,
  });
};

//add coupen
const addCoupen = async (req, res) => {
  try {
    const { couponCode, discount, validFrom, validTo, range } = req.body;
    if (validFrom >= validTo) {
      req.session.message = {
        type: false,
        message: "expired date given",
      };
      res.send({ success: false });
      return;
    }
    if (!couponCode.trim()) {
      req.session.message = {
        type: false,
        message: "white spaces found please remove it ",
      };
      res.send({ success: false });
      return;
    }
    const newCoupen = await new coupen({
      code: couponCode,
      discount: discount,
      range: range,
      validFrom: validFrom,
      validTo: validTo,
    });

    await newCoupen.save();
    req.session.message = {
      type: true,
      message: "coupen added succesfully",
    };
    res.json({ success: true });
  } catch (err) {
    req.session.message = {
      type: false,
      message: "coupen already exist",
    };
    res.send({ success: false });
  }
};

//delete coupen
const deleteCoupen = async (req, res) => {
  const id = req.body.id;
  await coupen.deleteOne({ _id: id });
  req.session.message = {
    type: true,
    message: "coupen deleted success fully",
  };
  res.send({ success: true });
};
const editCoupenGet = async (req, res) => {
  const id = req.params.id;
  const coupenDetails = await coupen.find({ _id: id });
  const from = coupenDetails[0].validFrom.toISOString().substr(0, 10);
  const to = coupenDetails[0].validTo.toISOString().substr(0, 10);
  res.render("admin/editCoupen", {
    coupen: coupenDetails,
    from,
    to,
    admin: true,
  });
};

//edit coupen
const editCoupenPost = async (req, res) => {
  try {
    const { discount, range, validFrom, validTo, id } = req.body;

    if (validFrom >= validTo) {
      req.session.message = {
        type: false,
        message: "expired date given",
      };
      res.send({ success: false });
      return;
    }
    const modifiedCoupen = {
      discount: discount,
      range: range,
      validFrom: validFrom,
      validTo: validTo,
    };
    await coupen.findByIdAndUpdate(id, { $set: modifiedCoupen }, { new: true });
    req.session.message = {
      type: true,
      message: "coupen edited succesfully",
    };
    res.json({ success: true });
  } catch (err) {
    req.session.message = {
      type: false,
      message: "coupen already exist",
    };
    res.send({ success: false });
  }
};

//----------------------------------------------- coupen management ends-------------------------------------------------------
module.exports = {
  getCoupen,
  addCoupen,
  deleteCoupen,
  editCoupenGet,
  editCoupenPost,
};
