const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 587, 
    auth: {
        user: "ce3d105cf3fe85",
        pass: "e1eb1b1d885f41"
    }
});

const sendMail = async (options) => {
    try {
        await transporter.sendMail({
            from: '"CASACLEAN" <noreply@casaclean.com>',
            to: options.email,
            subject: options.subject,
            html: options.html
        });
    } catch (error) {
        throw error; 
    }
};

module.exports = sendMail;
