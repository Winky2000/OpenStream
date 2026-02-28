import nodemailer from 'nodemailer';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

jest.mock('./store', () => ({
  __esModule: true,
  readState: jest.fn(() => ({
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      user: 'user',
      pass: 'pass',
      from: 'OpenStream <no-reply@example.com>',
    },
  })),
}));

describe('email', () => {
  beforeEach(() => {
    nodemailer.createTransport.mockReset();
  });

  test('sendTestEmail sends using saved SMTP settings', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    const verify = jest.fn().mockResolvedValue(true);
    nodemailer.createTransport.mockReturnValue({ sendMail, verify });

    const { sendTestEmail } = await import('./email');

    await sendTestEmail({ to: 'dest@example.com' });

    expect(verify).toHaveBeenCalled();

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'user', pass: 'pass' },
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'OpenStream <no-reply@example.com>',
        to: 'dest@example.com',
        subject: 'OpenStream: SMTP test',
      }),
    );
  });
});
