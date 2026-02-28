import { importJellyfinUserToSeerr } from './seerr';

describe('Seerr integration fallback', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('uses import-from-jellyfin when it succeeds', async () => {
    global.fetch.mockImplementation(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({ ok: true }),
    }));

    const out = await importJellyfinUserToSeerr({
      seerrUrl: 'https://requests.example.com',
      apiKey: 'abc',
      jellyfinUserId: '123',
      email: 'a@example.com',
      username: 'alice',
      password: 'Secret123!'
    });

    expect(out).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe('https://requests.example.com/api/v1/user/import-from-jellyfin');
  });

  test('falls back to POST /user with password when import fails', async () => {
    global.fetch.mockImplementation(async (url, opts) => {
      if (String(url).includes('/import-from-jellyfin')) {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => JSON.stringify({ message: '' }),
        };
      }

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({ id: 1 }),
      };
    });

    const out = await importJellyfinUserToSeerr({
      seerrUrl: 'https://requests.example.com/',
      apiKey: 'abc',
      jellyfinUserId: '123',
      email: 'a@example.com',
      username: 'alice',
      password: 'Secret123!'
    });

    expect(out).toEqual({ id: 1 });

    const createCall = global.fetch.mock.calls.find((c) => String(c[0]).endsWith('/api/v1/user'));
    expect(createCall).toBeTruthy();
    const payload = JSON.parse(createCall[1].body);
    expect(payload.email).toBe('a@example.com');
    expect(payload.username).toBe('alice');
    expect(payload.jellyfinId).toBe('123');
    expect(payload.password).toBe('Secret123!');
  });

  test('falls back to POST /user without password when password is blank', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/import-from-jellyfin')) {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => JSON.stringify({ message: '' }),
        };
      }

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({ id: 2 }),
      };
    });

    const out = await importJellyfinUserToSeerr({
      seerrUrl: 'https://requests.example.com',
      apiKey: 'abc',
      jellyfinUserId: '123',
      email: 'a@example.com',
      username: 'alice',
      password: ''
    });

    expect(out).toEqual({ id: 2 });

    const createCall = global.fetch.mock.calls.find((c) => String(c[0]).endsWith('/api/v1/user'));
    const payload = JSON.parse(createCall[1].body);
    expect(payload.password).toBeUndefined();
    expect(payload.passwordConfirm).toBeUndefined();
    expect(payload.confirmPassword).toBeUndefined();
  });

  test('surfaces a warning if Seerr only accepts create without password', async () => {
    global.fetch.mockImplementation(async (url, opts) => {
      if (String(url).includes('/import-from-jellyfin')) {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => JSON.stringify({ message: '' }),
        };
      }

      const body = opts?.body ? JSON.parse(String(opts.body)) : {};
      if (body.password) {
        return {
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: async () => JSON.stringify({ message: 'password not allowed' }),
        };
      }

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({ id: 3 }),
      };
    });

    await expect(
      importJellyfinUserToSeerr({
        seerrUrl: 'https://requests.example.com',
        apiKey: 'abc',
        jellyfinUserId: '123',
        email: 'a@example.com',
        username: 'alice',
        password: 'Secret123!'
      })
    ).rejects.toThrow('Seerr user was created, but this Seerr build did not accept a password');
  });
});
