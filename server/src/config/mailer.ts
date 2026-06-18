import nodemailer from "nodemailer";
import logger from "../utils/logger";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

let transporter: nodemailer.Transporter;

if (smtpHost && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
} else {
  logger.info("SMTP configuration not fully defined. Falling back to local console mail logs.");
}

export const sendEmail = async (
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> => {
  try {
    if (transporter) {
      await transporter.sendMail({
        from: `"TeamFlow" <no-reply@teamflow.com>`,
        to,
        subject,
        html: htmlContent,
      });
      logger.info(`Email sent successfully to ${to} (Subject: ${subject})`);
    } else {
      logger.info(`[MOCK EMAIL LOG]
To: ${to}
Subject: ${subject}
Content: ${htmlContent.replace(/<[^>]*>/g, " ")}`);
    }
  } catch (error) {
    logger.error("Failed to send email: ", error);
  }
};
