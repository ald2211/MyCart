const charges = require("../Models/charges");

// manage delivery charge
const getCharges = async (req, res) => {
  const Charges = await charges.findOne({});
  const flashMessage = req.query.flashMessageContent;
  res.render("admin/manageDeliveryCharges", {
    admin: true,
    charges: Charges,
    flashMessage,
  });
};

//edit fixed delivery charge
const editFixedCharge = async (req, res) => {
  try {
    const { newFixedCharge } = req.body;
    const FixedCharge = parseInt(newFixedCharge);

    if (typeof FixedCharge !== "number") {
      throw new Error("Invalid input for newFixedCharge");
    }
    let data = await charges.findOne({});
    if (!data) {
      data = await new charges({
        fixedDeliveryCharge: FixedCharge,
      });
    } else {
      data.fixedDeliveryCharge = FixedCharge;
    }
    await data.save();
    res.send({ FixedCharge });
  } catch (error) {
    console.error("Error editing fixed charge:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//edit the price range for the delivery charge is applicable
const editPriceRange = async (req, res) => {
  try {
    const { newRange } = req.body;
    const range = parseInt(newRange);
    if (typeof range !== "number") {
      throw new Error("Invalid input for newRange");
    }
    let data = await charges.findOne({});
    if (!data) {
      data = await new charges({
        minimumAmount: range,
      });
    } else {
      data.minimumAmount = range;
    }
    await data.save();

    res.send({ range });
  } catch (error) {
    console.error("Error editing price range:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//payment policy
const paymentPolicy = (req, res) => {
  res.render("admin/paymentPolicy");
};

module.exports = {
  getCharges,
  editFixedCharge,
  editPriceRange,
  paymentPolicy,
};
