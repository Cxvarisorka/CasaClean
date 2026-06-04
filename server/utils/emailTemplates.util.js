// HTML email templates for CasaClean.
//
// Emails are NOT regular web pages: many clients (Outlook, Gmail) strip <style>
// blocks, ignore flexbox/grid and external CSS. The reliable approach is
// table-based layout with inline styles and a 600px max width — that's why this
// markup looks old-fashioned on purpose.
//
// Colours mirror the website design system (client/src/styles/globals.css):
//   brand teal  -> #1dae9f / #0e8b81 / #0f6f68
//   accent gold -> #f59e0b
//   ink (text)  -> #0e1424 / #636c88

// Shared palette so every template stays on-brand from one place.
const COLORS = {
    brand: "#0e8b81",
    brandDark: "#0f6f68",
    accent: "#f59e0b",
    ink: "#0e1424",
    muted: "#636c88",
    canvas: "#f6f7f9",
    surface: "#ffffff",
    border: "#eceef2"
};

/**
 * Generic branded shell shared by all emails: coloured header, white card body
 * and a muted footer. `bodyContent` is injected as the card's inner HTML.
 */
const baseLayout = ({ title, bodyContent }) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light only" />
    <title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:${COLORS.canvas}; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <!-- Full-width background wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.canvas}; padding:32px 12px;">
        <tr>
            <td align="center">
                <!-- 600px centred container -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:${COLORS.surface}; border-radius:16px; overflow:hidden; border:1px solid ${COLORS.border};">

                    <!-- Header / brand bar -->
                    <tr>
                        <td style="background:linear-gradient(135deg, ${COLORS.brand}, ${COLORS.brandDark}); padding:32px 40px; text-align:center;">
                            <span style="font-size:26px; font-weight:700; color:#ffffff; letter-spacing:0.5px;">
                                Casa<span style="color:${COLORS.accent};">Clean</span>
                            </span>
                            <div style="margin-top:6px; font-size:13px; color:#d4f8f2; letter-spacing:1px; text-transform:uppercase;">
                                Professional Cleaning Services
                            </div>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:40px;">
                            ${bodyContent}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding:24px 40px 32px; border-top:1px solid ${COLORS.border}; text-align:center;">
                            <p style="margin:0 0 4px; font-size:12px; color:${COLORS.muted};">
                                You received this email because an account was created with this address on CasaClean.
                            </p>
                            <p style="margin:0; font-size:12px; color:${COLORS.muted};">
                                &copy; ${new Date().getFullYear()} CasaClean. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

/**
 * Bulletproof CTA button (works in Outlook too). Plain anchor styled as a
 * pill — kept simple so it degrades gracefully.
 */
const button = (url, label) => `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto;">
        <tr>
            <td align="center" style="border-radius:10px; background-color:${COLORS.brand};">
                <a href="${url}"
                   style="display:inline-block; padding:14px 36px; font-size:16px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:10px;">
                    ${label}
                </a>
            </td>
        </tr>
    </table>`;

/**
 * Email-verification template.
 *
 * @param {Object} opts
 * @param {string} opts.fullname  - recipient's name (personalisation)
 * @param {string} opts.url       - one-time verification link
 * @param {number} opts.expiresInHours - link validity window, shown to the user
 * @returns {{ subject: string, html: string, text: string }}
 */
const verificationEmail = ({ fullname, url, expiresInHours }) => {
    const subject = "Verify your CasaClean email address";

    const bodyContent = `
        <h1 style="margin:0 0 12px; font-size:22px; color:${COLORS.ink};">
            Welcome, ${fullname}! 👋
        </h1>
        <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:${COLORS.muted};">
            Thanks for signing up with <strong style="color:${COLORS.ink};">CasaClean</strong>.
            Please confirm your email address to activate your account and start booking
            sparkling-clean homes.
        </p>

        ${button(url, "Verify Email Address")}

        <p style="margin:24px 0 8px; font-size:13px; color:${COLORS.muted};">
            This link is valid for <strong>${expiresInHours} hours</strong>. If the button
            above doesn't work, copy and paste this URL into your browser:
        </p>
        <p style="margin:0 0 20px; font-size:13px; word-break:break-all;">
            <a href="${url}" style="color:${COLORS.brand};">${url}</a>
        </p>

        <hr style="border:none; border-top:1px solid ${COLORS.border}; margin:24px 0;" />

        <p style="margin:0; font-size:13px; line-height:1.6; color:${COLORS.muted};">
            If you didn't create a CasaClean account, you can safely ignore this email —
            no account will be activated.
        </p>`;

    // Plain-text fallback for clients that don't render HTML.
    const text =
        `Welcome to CasaClean, ${fullname}!\n\n` +
        `Please verify your email address by opening the link below:\n${url}\n\n` +
        `This link is valid for ${expiresInHours} hours.\n\n` +
        `If you didn't create an account, you can ignore this email.`;

    return { subject, html: baseLayout({ title: subject, bodyContent }), text };
};

module.exports = { verificationEmail };
