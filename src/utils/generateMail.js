require("dotenv").config();
const nodemailer = require("nodemailer");
const { NODE_MAIL, NODE_PASS } = process.env;

const generateMail = async (data) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: NODE_MAIL,
        pass: NODE_PASS,
      },
    });

    const mailOptions = {
      from: `Xpensea`,
      to: data.to,
      subject: data.subject,
      text: `${data.text}\n
      Thank you for choosing Xpensea!\n
      Best regards,\n
      Xpensea\n
      info@xpensea.com\n
      xpensea.com`,
    };

    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          resolve({ status: "failure", error });
        } else {
          resolve({ status: "success", data: info.response });
        }
      });
    });
  } catch (error) {
    return { status: "failure", error };
  }
};

module.exports = generateMail;
