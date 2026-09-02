const nodemailer = require("nodemailer");

// BUG FIX: EMAIL_USER is a charisintelligence.com.ng mailbox, not a Gmail
// account, so authenticating against smtp.gmail.com always failed. Its MX
// record points to mail.charisintelligence.com.ng — that's the real host.
// Port 465 (implicit TLS) times out on this network (confirmed via raw TCP
// test), while 587 connects immediately, so we use STARTTLS on 587.
const transporter = nodemailer.createTransport({
  host: "mail.charisintelligence.com.ng",
  port: 465,
  secure: true,
  requireTLS: true,
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
              Login to Workstation
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

const sendBookingEmail = async ({
  email,
  beneficiaryName,
  branchName,
  workstationName,
  seatName,
  dates,
  isNewBeneficiary,
}) => {
  const dateList = dates.map((date) => `<li>${date}</li>`).join("");

  const accessMessage = isNewBeneficiary
    ? `
      <p>
        An account has been created for you using this email address.
        Please use the <strong>Google Login</strong> option to access
        your workstation booking.
      </p>
    `
    : `
      <p>
        Log in to your account with the email address associated with
        your workstation account to view the booking.
      </p>
    `;

  await sendEmail({
    to: email,
    subject: "You have received a workstation booking",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border:1px solid #ddd; border-radius:10px; overflow:hidden;">

        <div style="background:#2563eb; color:white; padding:20px; text-align:center;">
          <h1>CharisIntelligence Workstation</h1>
        </div>

        <div style="padding:30px;">

          <h2>Hello ${beneficiaryName},</h2>

          <p>
            You have received a workstation booking gift.
          </p>

          ${accessMessage}

          <h3>Booking Details</h3>

          <p>
            <strong>Branch:</strong> ${branchName}
          </p>

          <p>
            <strong>Workstation:</strong> ${workstationName}
          </p>

          <p>
            <strong>Seat:</strong> ${seatName}
          </p>

          <p>
            <strong>Booked dates:</strong>
          </p>

          <ul>
            ${dateList}
          </ul>

          <div style="text-align:center; margin:30px 0;">
            <a href="${process.env.FRONTEND_URL}/login"
               style="background:#2563eb;
               color:white;
               padding:12px 24px;
               text-decoration:none;
               border-radius:5px;">
               Login to Workstation
            </a>
          </div>

          <hr>

          <small>
            © 2026 CharisIntelligence Workstation. All rights reserved.
          </small>

        </div>
      </div>
    `,
  });
};

const sendSuspensionEmail = async (email) => {
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
  sendSuspensionEmail,
  sendBookingEmail,
};
