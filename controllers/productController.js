//product management page

const Product = require("../Models/product");
const Category = require("../Models/category");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

//----------------------------------------------- product page starts-------------------------------------------------------

//get product home page
const productHome = async (req, res) => {
  const pageNum = req.query.page;
  const perPage = 4;
  const totalDocumentsCount = await Product.find({
    categoryStatus: true,
  }).countDocuments();
  const productData = await Product.find({ categoryStatus: true })
    .skip((pageNum - 1) * perPage)
    .limit(perPage);
  const totalPages = Math.ceil(totalDocumentsCount / perPage);
  const pageArray = [];
  for (let i = 1; i <= totalPages; i++) {
    pageArray.push(i);
  }
  const formattedData = productData.map((order) => {
    return {
      ...order,
      formattedDate: order.dateCreated.toISOString().split("T")[0],
    };
  });

  res.render("admin/productManagement", {
    data: formattedData,
    admin: true,
    pgn: pageArray,
  });
};

//add product Get and Post requests
const addProductGet = async (req, res) => {
  const Categories = await Category.find({});
  res.render("admin/addProduct", { catg: Categories });
};

const addProductPost = async (req, res) => {
  try {
    if (
      !req.body.name.trim() ||
      !req.body.publisher.trim() ||
      !req.body.author.trim()
    ) {
      req.session.message = {
        type: false,
        message: "white spaces found please remove it ",
      };
      res.redirect("/products/addProduct");
      return;
    }
    const outputPath = path.join(__dirname, "../public/croppedImages");

    // Create the directory if it doesn't exist
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    const arrayOfImages = [];
    for (let i = 0; i < req.files.length; i++) {
      let imageName = req.files[i].filename;
      // Perform image cropping here using sharp
      await sharp(req.files[i].path)
        .resize(300, 450) // Adjust the width and height as needed
        .toFile(path.join(outputPath, imageName));

      arrayOfImages.push(imageName);
    }

    const newProdcut = new Product({
      name: req.body.name,
      publisher: req.body.publisher,
      publishedDate: req.body.publishedDate,
      author: req.body.author,
      pages: req.body.pages,
      dateCreated: req.body.dateCreated,
      description: req.body.description,
      price: req.body.price,
      category: req.body.category,
      stock: req.body.stock,
      finalisedPrice: req.body.price,
      images: arrayOfImages,
    });
    await newProdcut.save();

    req.session.message = {
      type: true,
      message: "Product Added successfully",
    };
    res.redirect("/products");
  } catch (err) {
    res.status(400).send({ success: false, msg: err.message });
  }
};

//edit product
const updateProductGet = async (req, res) => {
  let id = req.params.id;
  req.session.updateProductId = id;
  const Categories = await Category.find({});
  let datatochange = await Product.findById(id);
  const previousCategoryIndex = Categories.findIndex(
    (category) => category.name === datatochange.category
  );
  if (previousCategoryIndex !== 0) {
    // Remove the previously selected category from its current position
    const removedCategory = Categories.splice(previousCategoryIndex, 1)[0];
    // Add the previously selected category to the zeroth index
    Categories.unshift(removedCategory);
  }

  req.session.images = datatochange.images;
  const formattedDate = datatochange.publishedDate.toISOString().substr(0, 10);
  const newDate = formatDate(formattedDate);
  function formatDate(date) {
    const options = { month: "numeric", day: "numeric", year: "numeric" };
    return new Date(date).toLocaleDateString(undefined, options);
  }
  res.render("admin/editProduct", {
    editdata: datatochange,
    catg: Categories,
    nd: newDate,
    fd: formattedDate,
  });
};

//update product
const updateProductPost = async (req, res) => {
  if (
    !req.body.name.trim() ||
    !req.body.publisher.trim() ||
    !req.body.author.trim()
  ) {
    req.session.message = {
      type: false,
      message: "white spaces found please remove it ",
    };
    res.redirect(`/products/editProduct/${req.session.updateProductId}`);
    return;
  }
  const id = req.params.id;
  const outputPath = path.join(__dirname, "../public/croppedImages");
  const currentProduct = await Product.findOne({ _id: id });
  let finalisedPrice;

  if (currentProduct.CategoryDiscountedPrice) {
    finalisedPrice = currentProduct.CategoryDiscountedPrice;
  } else if (
    currentProduct.CategoryDiscountedPrice == undefined &&
    currentProduct.ProductDiscountedPrice
  ) {
    finalisedPrice = currentProduct.ProductDiscountedPrice;
  } else {
    finalisedPrice = req.body.price;
  }

  let editProduct = {
    name: req.body.name,
    publisher: req.body.publisher,
    publishedDate: req.body.publishedDate,
    author: req.body.author,
    pages: req.body.pages,
    description: req.body.description,
    price: req.body.price,
    category: req.body.category,
    stock: req.body.stock,
    finalisedPrice: finalisedPrice,
  };

  if (req.files && req.files.length > 0) {
    const narrayOfImages = [];
    for (let i = 0; i < req.files.length; i++) {
      const timestamp = new Date().getTime(); // Get current timestamp
      let uniqueImageName = `image_${timestamp}_${req.files[i].filename}`;

      // Perform image cropping here using sharp
      await sharp(req.files[i].path)
        .resize(300, 450) // Adjust the width and height as needed
        .toFile(path.join(outputPath, uniqueImageName));

      narrayOfImages.push(uniqueImageName);
    }
    const mergedImagesSet = new Set([...narrayOfImages, ...req.session.images]);

    // Convert the Set back to an array if needed
    const uniqueImagesArray = Array.from(mergedImagesSet);

    editProduct.images = uniqueImagesArray;
  } else {
    console.log("some error in the image update");
  }

  await Product.findByIdAndUpdate(id, { $set: editProduct }, { new: true });
  req.session.message = {
    type: true,
    message: "Product updated successfully",
  };
  res.redirect("/products");
};

//search product
const searchProduct = async (req, res) => {
  const pageNum = req.query.page;
  const perPage = 4;

  let searchedText = req.body.search || "";
  let sanitizingText = searchedText.replace(/[^\w\s-]/gi, "");
  const totalDocumentsCount = await Product.find({
    name: { $regex: new RegExp(sanitizingText, "i") },
  }).countDocuments();
  let searchedResult = await Product.find({
    name: { $regex: new RegExp(sanitizingText, "i") },
  })
    .skip((pageNum - 1) * perPage)
    .limit(perPage);
  const totalPages = Math.ceil(totalDocumentsCount / perPage);
  const pageArray = [];
  for (let i = 1; i <= totalPages; i++) {
    pageArray.push(i);
  }
  res.render("admin/searchProducts", {
    data: searchedResult,
    admin: true,
    pgn: pageArray,
  });
};

//soft delete product
const deleteProduct = async (req, res) => {
  try {
    const pid = req.params.Id;
    console.log(pid);
    const deletedProduct = await Product.findByIdAndUpdate(
      pid,
      { $set: { softDelete: true } },
      { new: true }
    );

    if (!deletedProduct) {
      throw new Error("Product deletion failed");
    }

    req.session.message = {
      type: "success",
      message: "Product unlisted successfully",
    };

    res.redirect("/products");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

//unblock product
const unBlockProduct = async (req, res) => {
  try {
    const pid = req.params.Id;
    console.log(pid);
    const deletedProduct = await Product.findByIdAndUpdate(
      pid,
      { $set: { softDelete: false } },
      { new: true }
    );

    if (!deletedProduct) {
      throw new Error("Product deletion failed");
    }

    req.session.message = {
      type: "success",
      message: "Product listed successfully",
    };

    res.redirect("/products");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

//manage stocks
const stockGet = async (req, res) => {
  let Active = 0;
  let outofStock = 0;
  try {
    const pageNum = req.query.page;
    const perPage = 5;
    const totalDocumentsCount = await Product.find({}).countDocuments();

    const product = await Product.find({})
      .skip((pageNum - 1) * perPage)
      .limit(perPage);
    const stockStatus = await Product.find({});
    const totalPages = Math.ceil(totalDocumentsCount / perPage);
    const pageArray = [];
    for (let i = 1; i <= totalPages; i++) {
      pageArray.push(i);
    }
    for (const item of stockStatus) {
      if (item.stock === 0) {
        item.stockStatus = "outofStock";
        outofStock += 1;
      } else {
        item.stockStatus = "Active";
        Active += 1;
      }

      await item.save(); // Save each modified product back to the database
    }
    const flashMessage = req.query.flashMessageContent;
    res.render("admin/manageStocks", {
      product,
      flashMessage,
      Active,
      outofStock,
      admin: true,
      pgn: pageArray,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
};

//stock post
const stockPost = async (req, res) => {
  try {
    const { name, number } = req.body;
    const updateStock = await Product.findOne({ name: name });

    if (!updateStock) {
      req.session.message = {
        type: false,
        message: "Invalid Product Name",
      };
      res.redirect("/products/stock");
      return;
    }
    await Product.updateOne(
      { name: name },
      { $inc: { stock: number }, $set: { stockStatus: "active" } }
    );
    req.session.message = {
      type: true,
      message: "stock updated success fully",
    };
    res.redirect("/products/stock");
  } catch (error) {
    res.status(500).send(error);
  }
};

//clear stock
const stockClear = async (req, res) => {
  try {
    const id = req.params.id;
    await Product.updateOne(
      { _id: id },
      { $set: { stock: 0, stockStatus: "out of stock" } }
    );

    res.status(200).send("success");
  } catch (error) {
    res.status(500).send(error);
  }
};

//edit stock get page
const editStockGet = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await Product.findOne({ _id: id });
    res.render("admin/editStock", { data });
  } catch (error) {
    res.status(500).send(error);
  }
};

//edit stock put
const editStockPut = async (req, res) => {
  try {
    const id = req.params.id;
    const { quantity } = req.body;
    await Product.updateOne(
      { _id: id },
      { $set: { stock: quantity, stockStatus: "Active" } }
    );
    res.status(200).send("success");
  } catch (error) {
    res.status(500).send(error);
  }
};

//product image delete
const deleteImage = async (req, res) => {
  try {
    const { url } = req.body;

    await Product.updateOne({ images: url }, { $pull: { images: url } });
    res.status(200).send("success");
  } catch (err) {
    console.log("error:", err);
  }
};

//image crop
const cropImageGet = async (req, res) => {
  const id = req.params.id;
  res.render("admin/cropImage", { imagePath: id });
};
const cropImagePost = async (req, res) => {
  try {
    const { croppedImage, imageId } = req.body;

    // Get the file extension from the URL
    const fileExtension = path.extname(croppedImage);

    // Generate a unique filename (you may want to use imageId or another identifier)
    const filename = `cropped_image_${imageId}${fileExtension}`;

    // Set the output path
    const outputPath = path.join(
      __dirname,
      "../public/croppedImages",
      filename
    );

    // Download the image and save it
    const response = await axios.get(croppedImage, {
      responseType: "arraybuffer",
    });
    fs.writeFileSync(outputPath, Buffer.from(response.data));

    await Product.updateOne(
      { images: imageId },
      { $push: { images: filename } }
    );
    await Product.updateOne(
      { images: imageId },
      { $pull: { images: imageId } }
    );

    res.send({ success: true });
  } catch (err) {
    console.log("error:", err);
  }
};

//----------------------------------------------- product page ends-------------------------------------------------------

module.exports = {
  deleteProduct,
  updateProductGet,
  updateProductPost,
  addProductGet,
  addProductPost,
  productHome,
  searchProduct,
  stockGet,
  stockPost,
  stockClear,
  editStockGet,
  editStockPut,
  deleteImage,
  unBlockProduct,
  cropImageGet,
  cropImagePost,
};
