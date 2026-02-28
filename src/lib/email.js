import nodemailer from 'nodemailer';
import { readState } from './store';

export async function sendInviteEmail({ to, inviteUrl }) {
  const state = readState();
  const smtp = state.smtp || {};

  if (!smtp.host || !smtp.port || !smtp.from) {
    throw new Error('SMTP is not configured (host/port/from).');
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port),
    secure: Boolean(smtp.secure),
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });

  await transporter.sendMail({
    from: smtp.from,
    to,
    subject: 'OpenStream: finish creating your account',
    text: `Finish creating your account by setting a password: ${inviteUrl}`,
  });
}
