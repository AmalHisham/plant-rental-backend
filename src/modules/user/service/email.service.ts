import nodemailer from 'nodemailer';

export const sendAdminWelcomeEmail = async (
  to: string,
  name: string,
  password: string,
  role: string
): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Welcome to Plant Rental Platform</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f7f4;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f4;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <tr>
                <td style="background-color:#2d6a4f;padding:32px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:1px;">&#127807; Plant Rental</h1>
                  <p style="margin:6px 0 0;color:#b7e4c7;font-size:13px;">Admin Portal</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px 40px 32px;">
                  <h2 style="margin:0 0 16px;color:#1b4332;font-size:20px;">Welcome, ${name}!</h2>
                  <p style="margin:0 0 12px;color:#444;font-size:15px;line-height:1.6;">
                    Your admin account has been created on the Plant Rental Platform.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f4;border-radius:6px;padding:20px;margin:20px 0;">
                    <tr>
                      <td style="padding:8px 0;">
                        <span style="color:#666;font-size:14px;">Role:</span>
                        <strong style="color:#1b4332;font-size:14px;margin-left:8px;">${role}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;">
                        <span style="color:#666;font-size:14px;">Email:</span>
                        <strong style="color:#1b4332;font-size:14px;margin-left:8px;">${to}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;">
                        <span style="color:#666;font-size:14px;">Temporary Password:</span>
                        <strong style="color:#1b4332;font-size:14px;margin-left:8px;font-family:monospace;">${password}</strong>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0;color:#888;font-size:13px;line-height:1.6;">
                    Please log in and change your password immediately.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f4f7f4;padding:20px 40px;text-align:center;border-top:1px solid #e0e0e0;">
                  <p style="margin:0;color:#aaa;font-size:12px;">
                    &copy; ${new Date().getFullYear()} Plant Rental Platform. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: 'Welcome to Plant Rental Platform - Your Admin Credentials',
      html,
    });
  } catch (err) {
    console.error('Nodemailer error:', err);
    throw err;
  }
};

export const sendPasswordResetEmail = async (
  to: string,
  resetToken: string
): Promise<void> => {
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reset Your Password</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f7f4;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f4;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

              <!-- Header -->
              <tr>
                <td style="background-color:#2d6a4f;padding:32px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:1px;">&#127807; Plant Rental</h1>
                  <p style="margin:6px 0 0;color:#b7e4c7;font-size:13px;">Bring nature home</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px 40px 32px;">
                  <h2 style="margin:0 0 16px;color:#1b4332;font-size:20px;">Reset Your Password</h2>
                  <p style="margin:0 0 12px;color:#444;font-size:15px;line-height:1.6;">
                    We received a request to reset the password for your Plant Rental account.
                    Click the button below to choose a new password.
                  </p>
                  <p style="margin:0 0 28px;color:#444;font-size:15px;line-height:1.6;">
                    This link will expire in <strong>1 hour</strong>. If you did not request a password reset,
                    you can safely ignore this email.
                  </p>

                  <!-- CTA Button -->
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-radius:6px;background-color:#2d6a4f;">
                        <a href="${resetLink}"
                           style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;border-radius:6px;">
                          Reset Password
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Fallback link -->
                  <p style="margin:24px 0 0;color:#888;font-size:13px;line-height:1.6;">
                    If the button doesn't work, copy and paste this link into your browser:<br/>
                    <a href="${resetLink}" style="color:#2d6a4f;word-break:break-all;">${resetLink}</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color:#f4f7f4;padding:20px 40px;text-align:center;border-top:1px solid #e0e0e0;">
                  <p style="margin:0;color:#aaa;font-size:12px;">
                    &copy; ${new Date().getFullYear()} Plant Rental Platform. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  console.log(`Sending email to: ${to}`);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: 'Reset your Plant Rental password',
      html,
    });
  } catch (err) {
    console.error('Nodemailer error:', err);
    throw err;
  }
};
