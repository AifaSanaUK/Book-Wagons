const nodemailer = require("nodemailer");
require("dotenv").config();

const sendOTP = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for Verification",
            text: `Your OTP code is: ${otp}. It will expire in 30 seconds.`,
            html: `<h2>Your OTP Code: <strong>${otp}</strong></h2>
                   <p>This code will expire in 30 seconds. Do not share it with anyone.</p>`,
        };

        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${email}: ${otp}`);
    } catch (error) {
        console.error("Error sending OTP:", error);
        throw new Error("Failed to send OTP");
    }
};

module.exports = sendOTP;
