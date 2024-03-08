const User = require("../Models/user");
const referalStorage = require("../Models/referral");
const wallethistory = require("../Models/walletHs");

//get wallet page
const getWalletPage = async (req, res) => {
  const userWallet = await User.findOne({ _id: req.session.isAuth });
  res.render("users/wallet", {
    userNav: true,
    userfooter: true,
    count: req.session.count,
    userWallet,
  });
};

//referal code applied from wallet page
const referalFromWalletPage = async (req, res) => {
  try {
    const { referal } = req.body;
    const check = await User.findOne({ _id: req.session.isAuth });
    const Bonus = await referalStorage.findOne({});
    if (check.referalUsed) {
      req.session.message = {
        type: false,
        message: "invalid referral code",
      };
      res.send({ success: false });
      return;
    }
    await User.updateOne(
      { Referalcode: referal },
      { $inc: { Userwallet: Bonus.referredUserBonus } }
    );
    const referredUser = await User.findOne({ Referalcode: referal });
    const referredUserWallet = await new wallethistory({
      user: referredUser._id,
      date: new Date(),
      transactionType: "referal Bonus",
      amount: Bonus.referredUserBonus,
    });
    const currentUserWallet = await new wallethistory({
      user: check._id,
      date: new Date(),
      transactionType: "referal Bonus",
      amount: Bonus.newUserBonus,
    });
    await currentUserWallet.save();
    await referredUserWallet.save();

    check.referalUsed = true;
    check.Userwallet += Bonus.newUserBonus;
    await check.save();
    req.session.message = {
      type: true,
      message: "referral code cashback credited successfully",
    };
    res.send({ success: true });
  } catch (err) {
    req.session.message = {
      type: false,
      message: "sorry some error occured",
    };
    res.send({ success: false });
    return;
  }
};

//-------------------------------------------------------admin side----------------------------------------------------------
//referal control admin
const getMangageReferral = async (req, res) => {
  const flashMessage = req.query.flashMessageContent;
  let Referral = await referalStorage.findOne({});
  res.render("admin/payment", {
    admin: true,
    referral: Referral,
    flashMessage,
  });
};

//edit new user referal bonus
const editNewUserBonus = async (req, res) => {
  try {
    const { newUserBonus } = req.body;
    const Bonus = parseInt(newUserBonus);

    if (typeof Bonus !== "number") {
      throw new Error("Invalid input ");
    }
    let data = await referalStorage.findOne({});
    if (!data) {
      data = await new referalStorage({
        newUserBonus: Bonus,
      });
    } else {
      data.newUserBonus = Bonus;
    }
    await data.save();
    res.send({ success: true });
  } catch (error) {
    console.error("Error editing :", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//edit referred user bonus
const editReferredUserBonus = async (req, res) => {
  try {
    const { referredUserBonus } = req.body;
    const Bonus = parseInt(referredUserBonus);

    if (typeof Bonus !== "number") {
      throw new Error("Invalid input ");
    }
    let data = await referalStorage.findOne({});
    if (!data) {
      data = await new referalStorage({
        referredUserBonus: Bonus,
      });
    } else {
      data.referredUserBonus = Bonus;
    }
    await data.save();
    res.send({ success: true });
  } catch (error) {
    console.error("Error editing:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//wallet History
const walletHistory = async (req, res) => {
  const id = req.params.id;
  const Currentuser = await User.findOne({ _id: id });

  if (Currentuser.Bonus) {
    const newUserWallet = await new wallethistory({
      user: id,
      date: new Date(),
      transactionType: "referal Bonus",
      amount: Currentuser.Bonus,
    });
    await newUserWallet.save();
    await User.updateOne({ _id: id }, { $unset: { Bonus: 1 } });
  }

  const history = await wallethistory.find({ user: id });

  const formattedHistory = history.map((value) => ({
    ...value,
    formattedDate: value.date.toLocaleDateString("en-GB"),
  }));

  res.render("users/walletHistory", { history: formattedHistory });
};

module.exports = {
  getWalletPage,
  referalFromWalletPage,
  getMangageReferral,
  editNewUserBonus,
  editReferredUserBonus,
  walletHistory,
};
