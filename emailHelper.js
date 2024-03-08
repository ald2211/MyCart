const nodemailer = require("nodemailer");
const generateOtp = require("./generateOtp");
const order = require("./Models/order");

let otpData = {};
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: process.env.SMTP_MAIL,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

//email login handle function
async function main(req, rsndmail, msg, orderId) {
  try {
    if (orderId) {
      const orderDetails = await order
        .findOne({ _id: orderId })
        .populate("user");
      console.log("orderDetails:", orderDetails);
      let orderStatus = orderDetails.paymentStatus;
      let UserEmail = orderDetails.user.email;
      let UserName = orderDetails.user.name;
      let id = orderDetails.orderId;
      let orderMsg;
      switch (orderStatus) {
        case "cancelled":
          orderMsg = `hello ${UserName},we are sorry to inform you that ,due to some reason your order with orderNumber:${id} is cancelled.`;
          break;
        case "delivered":
          orderMsg = `hello ${UserName},your order with orderNumber:${id} is delivered successfully.`;
          break;
        case "Accepted":
          orderMsg = `hello ${UserName},your return request for the order with orderNumber:${id} is Accepted.`;
          break;
        case "rejected":
          orderMsg = `hello ${UserName},your return request for the order with orderNumber:${id} is cancelled.`;
          break;
        default:
          console.log("error");
          break;
      }
      await transporter.sendMail({
        from: process.env.SMTP_MAIL,
        to: UserEmail,
        subject: "Order Status Updation:",
        html: orderMsg,
      });
      return;
    }
    const OTP = generateOtp();
    const expirationTime = new Date().getTime() + 1 * 60 * 1000; // 1 minutes expiration time

    otpData[req.session.email] = {
      otp: OTP,
      expirationTime: expirationTime,
    };
    if (rsndmail) {
      await transporter.sendMail({
        from: process.env.SMTP_MAIL,
        to: rsndmail,
        subject: "Reset Password of your MyCart account",
        html: msg,
      });
      return;
    }
    await transporter.sendMail({
      from: process.env.SMTP_MAIL,
      to: req.session.email,
      subject: "OTP from MyCart online book store",
      text: `your OTP is :${OTP}`,
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

module.exports = { main, otpData };
