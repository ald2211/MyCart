const banner = require("../Models/banner");

//banner page render
const getBanner = async (req, res) => {
  const pageNum = req.query.page;
  const perPage = 3;
  const totalDocumentsCount = await banner.find({}).countDocuments();
  let Banner = await banner
    .find({})
    .skip((pageNum - 1) * perPage)
    .limit(perPage);
  const totalPages = Math.ceil(totalDocumentsCount / perPage);
  const pageArray = [];
  for (let i = 1; i <= totalPages; i++) {
    pageArray.push(i);
  }
  res.render("admin/manageBanner", { admin: true, Banner, pgn: pageArray });
};

//post banner page
const postBanner = async (req, res) => {
  try {
    let Banner = await new banner({
      bannerImg: req.file.filename,
    });
    await Banner.save();
    req.session.message = {
      type: true,
      message: "banner added successfully",
    };
    res.redirect("/admin/banner");
  } catch (err) {
    req.session.message = {
      type: false,
      message: "banner already exist",
    };
    res.redirect("/admin/banner");
    console.log("error:", err);
  }
};

//delete banner
const deleteBanner = async (req, res) => {
  try {
    const { imageId } = req.body;
    await banner.deleteOne({ _id: imageId });
    req.session.message = {
      message: "banner deleted successfully ",
      type: true,
    };
    res.send({ success: true });
  } catch (err) {
    req.session.message = {
      message: "action failed ",
      type: false,
    };
    console.log("error:", err);
    res.send({ success: false });
  }
};

module.exports = {
  getBanner,
  postBanner,
  deleteBanner,
}