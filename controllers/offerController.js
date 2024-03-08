const product = require("../Models/product");
const category = require("../Models/category");
const offer = require("../Models/offer");

//offer page get
const offerGet = async (req, res) => {
  //pagination
  const pageNum = req.query.page;
  const perPage = 5;
  const currentDate = new Date();
  const totalDocumentsCount = await offer
    .find({ end_date: { $gt: currentDate } })
    .countDocuments();

  const offerDetails = await offer
    .find({ end_date: { $gt: currentDate } })
    .skip((pageNum - 1) * perPage)
    .limit(perPage);
  const totalPages = Math.ceil(totalDocumentsCount / perPage);
  const pageArray = [];
  for (let i = 1; i <= totalPages; i++) {
    pageArray.push(i);
  }
  const formatedDate = offerDetails.map((value) => {
    return {
      ...value,
      from: value.start_date.toLocaleDateString("en-GB"),
      to: value.end_date.toLocaleDateString("en-GB"),
    };
  });

  const productNames = await product.find({}, { name: 1, _id: 0 });
  const categoryNames = await category.find({}, { name: 1, _id: 0 });
  res.render("admin/offerManagement", {
    admin: true,
    offer: formatedDate,
    productNames,
    categoryNames,
    pgn: pageArray,
  });
};

//offer post
const offerPost = async (req, res) => {
  try {
    const formData = req.body;
    if (formData.validFrom >= formData.validTo) {
      req.session.message = {
        type: false,
        message: "expired date given",
      };
      res.send({ success: false });
      return;
    }
    let newOffer = await offer.findOne({ name: formData.name });
    if (!newOffer) {
      newOffer = await new offer({
        name: formData.name,
        discount_percentage: formData.discount,
        status: true,
        start_date: formData.validFrom,
        end_date: formData.validTo,
        offer_type: formData.offerType,
      });
    }
    newOffer.discount_percentage = formData.discount;
    if (formData.offerType == "category") {
      const CategoryId = await category.findOne({ name: formData.name });
      const categoryProducts = await product.find({ category: formData.name });
      categoryProducts.forEach((value) => {
        value.CategoryDiscountedPrice = Math.round(
          value.price - value.price * (formData.discount / 100),
          0
        );
        value.finalisedPrice = Math.round(
          value.price - value.price * (formData.discount / 100),
          0
        );
        value.save();
        return;
      });
      if (!CategoryId) {
        req.session.message = {
          type: false,
          message: "Category not found",
        };
        res.send({ success: false });
        return;
      }
      newOffer.category = CategoryId._id;
    } else {
      const ProductId = await product.findOne({ name: formData.name });
      if (!ProductId) {
        req.session.message = {
          type: false,
          message: "Product not found",
        };
        res.send({ success: false });
        return;
      }
      newOffer.product = ProductId._id;

      const discountedPrice = Math.round(
        ProductId.price - ProductId.price * (formData.discount / 100),
        0
      );
      ProductId.ProductDiscountedPrice = discountedPrice;
      if (!ProductId.CategoryDiscountedPrice) {
        ProductId.finalisedPrice = discountedPrice;
      }
      await ProductId.save();
    }

    await newOffer.save();
    req.session.message = {
      type: true,
      message: `${formData.offerType} offer added succesfully`,
    };
    res.json({ success: true });
  } catch (err) {
    console.log("error:", err);
    req.session.message = {
      type: false,
      message: "some error occured",
    };
    res.send({ success: false });
  }
};

//edit offer page get request
const editOfferGet = async (req, res) => {
  const id = req.params.id;
  const offerDetails = await offer.findOne({ _id: id });
  const from = offerDetails.start_date.toISOString().substr(0, 10);
  const to = offerDetails.end_date.toISOString().substr(0, 10);
  res.render("admin/editOffer", {
    offer: offerDetails,
    from,
    to,
    admin: true,
  });
};

//edit offer post
const editOffer = async (req, res) => {
  try {
    const formData = req.body;

    if (formData.validFrom >= formData.validTo) {
      req.session.message = {
        type: false,
        message: "expired date given",
      };
      res.send({ success: false });
      return;
    }
    await offer.findByIdAndUpdate(
      formData.id,
      {
        $set: {
          discount_percentage: formData.discount,
          end_date: formData.validTo,
        },
      },
      { new: true }
    );
    req.session.message = {
      type: true,
      message: "offer edited succesfully",
    };
    res.json({ success: true });
  } catch (err) {
    req.session.message = {
      type: false,
      message: "some error occured",
    };
    res.send({ success: false });
  }
};

//delete offer
const deleteOffer = async (req, res) => {
  try {
    const { id, offerType, name } = req.body;
    if (offerType == "product") {
      const offerProduct = await product.findOne({ name: name });
      if (!offerProduct.CategoryDiscountedPrice) {
        offerProduct.finalisedPrice = offerProduct.price;
      }
      await offerProduct.save();
      await product.updateOne(
        { name: name },
        { $unset: { ProductDiscountedPrice: 1 } }
      );
    } else {
      const offerCategoryProducts = await product.find({ category: name });
      offerCategoryProducts.forEach((value) => {
        if (!value.ProductDiscountedPrice) {
          value.finalisedPrice = value.price;
        } else {
          value.finalisedPrice = value.ProductDiscountedPrice;
        }
        value.save();
        return;
      });

      await product.updateMany(
        { category: name },
        { $unset: { CategoryDiscountedPrice: 1 } }
      );
    }
    await offer.deleteOne({ _id: id });
    req.session.message = {
      type: true,
      message: "offer deleted successfully",
    };
    res.send({ success: true });
  } catch (err) {
    console.log("error:", err);
    req.session.message = {
      type: false,
      message: "offer delete failed",
    };
    res.send({ success: false });
  }
};

module.exports = {
  offerGet,
  offerPost,
  editOfferGet,
  editOffer,
  deleteOffer,
};
