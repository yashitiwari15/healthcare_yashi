const nodemailer = require('nodemailer');
require('dotenv').config({ path: './config.env' });

const transporter = nodemailer.createTransporter({
  service: process.env.EMAIL_SERVICE, // e.g., 'gmail'
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendEmail = async (options) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html
  };

  await transporter.sendMail(mailOptions);
};

const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  const html = `
    <p>Hello ${user.firstName},</p>
    <p>Thank you for registering with our Healthcare Management System. Please verify your email by clicking on the link below:</p>
    <p><a href="${verificationUrl}">Verify Email</a></p>
    <p>If you did not register for this service, please ignore this email.</p>
    <p>Regards,</p>
    <p>The Healthcare Team</p>
  `;
  await sendEmail({
    to: user.email,
    subject: 'Verify Your Email Address',
    html
  });
};

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const html = `
    <p>Hello ${user.firstName},</p>
    <p>You have requested a password reset. Please click on the link below to reset your password:</p>
    <p><a href="${resetUrl}">Reset Password</a></p>
    <p>This link is valid for 1 hour. If you did not request a password reset, please ignore this email.</p>
    <p>Regards,</p>
    <p>The Healthcare Team</p>
  `;
  await sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    html
  });
};

const sendAppointmentConfirmationEmail = async (appointment, patient, doctor) => {
  const html = `
    <p>Hello ${patient.firstName},</p>
    <p>Your appointment with Dr. ${doctor.lastName} has been successfully scheduled.</p>
    <p><strong>Date:</strong> ${new Date(appointment.appointmentDate).toLocaleString()}</p>
    <p><strong>Reason:</strong> ${appointment.reason}</p>
    <p>We look forward to seeing you.</p>
    <p>Regards,</p>
    <p>The Healthcare Team</p>
  `;
  await sendEmail({
    to: patient.email,
    subject: 'Appointment Confirmation',
    html
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAppointmentConfirmationEmail
};
