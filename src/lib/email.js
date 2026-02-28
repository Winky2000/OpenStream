import nodemailer from 'nodemailer';
import { readState } from './store';

function createTransporterFromState() {
  const state = readState();
  const smtp = state.smtp || {};

  if (!smtp.host || !smtp.port) {
    throw new Error('SMTP is not configured (host/port).');
  }

  const from = String(smtp.from || '').trim();
  const user = String(smtp.user || '').trim();
  const pass = String(smtp.pass || '').trim();

  // Many SMTP servers require From to match the authenticated user.
  // If From isn't explicitly set, fall back to the SMTP user when it looks like an email.
  const effectiveFrom = from || (user.includes('@') ? user : '');
  if (!effectiveFrom) {
    throw new Error('SMTP is not configured (from).');
  }

  if (user && !pass) {
    throw new Error('SMTP is not configured (password required when user is set).');
  }

  const transporter = nodemailer.createTransport({
    host: String(smtp.host),
    port: Number(smtp.port),
    secure: Boolean(smtp.secure),
    auth: user ? { user, pass } : undefined,
  });

  return { transporter, smtp: { ...smtp, from: effectiveFrom, user, pass } };
}

export async function sendInviteEmail({ to, inviteUrl }) {
  const { transporter, smtp } = createTransporterFromState();

  await transporter.sendMail({
    from: smtp.from,
    to,
    subject: 'OpenStream: finish creating your account',
    text: `Finish creating your account by setting a password: ${inviteUrl}`,
  });
}

export async function sendTestEmail({ to }) {
  const { transporter, smtp } = createTransporterFromState();

  // Gives clearer errors for common misconfig (DNS, TLS, auth).
  await transporter.verify();

  await transporter.sendMail({
    from: smtp.from,
    to,
    subject: 'OpenStream: SMTP test',
    text: 'This is a test email from OpenStream. If you received this, SMTP is configured correctly.',
  });
}
