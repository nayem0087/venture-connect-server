const nodemailer = require('nodemailer');

// Uses a Gmail account + App Password (NOT your regular Gmail password).
// Generate one at: https://myaccount.google.com/apppasswords
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendEmail({ to, subject, html }) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("Email not sent — EMAIL_USER/EMAIL_PASS not configured.");
        return;
    }

    try {
        await transporter.sendMail({
            from: `"VentureConnect" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        });
    } catch (error) {
        // Never let an email failure break the main request (application submit, status update, etc.)
        console.error("Failed to send email:", error.message);
    }
}

module.exports = { sendEmail };