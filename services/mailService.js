const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("❌ Mail server connection failed:", error.message);
  } else {
    console.log("✅ Mail server is ready.");
  }
});


const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"CharisIntelligence Workstation" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}`);
    throw error;
  }
};

const sendWelcomeEmail = async (email) => {
  await sendEmail({
    to: email,
    subject: "📚 Welcome to CharisIntelligence Workstation!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border:1px solid #ddd; border-radius:10px; overflow:hidden;">
        
        <div style="background:#2563eb; color:white; padding:20px; text-align:center;">
          <h1>📚 CharisIntelligence Workstation</h1>
        </div>

        <div style="padding:30px;">
          <h2>Welcome!</h2>

          <p>Thank you for joining <strong>CharisIntelligence Workstation</strong>.</p>
          
          <p>Your account has been created successfully.</p>


          <div style="text-align:center; margin:30px 0;">
            <a href="${process.env.FRONTEND_URL}/login"
               style="background:#2563eb;
               color:white;
               padding:12px 24px;
               text-decoration:none;
               border-radius:5px;">
               Start Reading
            </a>
          </div>

          <p>If you didn't create this account, you can safely ignore this email.</p>

          <hr>

          <small>
          © 2026 CharisIntelligence Workstation. All rights reserved.
          </small>

        </div>

      </div>
    `,
  });
};

const sendRestrictionEmail = async (email) => {
  await sendEmail({
    to: email,
    subject: "Account Suspension Notice",
    html: `
      <h2>Account Suspended</h2>

      <p>Your account has been temporarily suspended. Please contact support for more information.</p>

      <p>If you believe this is a mistake, contact support.</p>
    `,
  });
};


module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendRestrictionEmail,
};
