function normalizeSeerrBaseUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';

  // People sometimes paste the API base rather than the app root.
  return trimmed.replace(/\/api\/v1$/i, '').replace(/\/api$/i, '').replace(/\/+$/, '');
}

async function fetchJsonWithDetails(url, { method, headers, body }) {
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { res, text, json };
}

function errorDetailFromResponse({ res, url, json, text }) {
  const detail =
    (typeof json?.message === 'string' && json.message.trim() ? json.message.trim() : '') ||
    (typeof json?.Message === 'string' && json.Message.trim() ? json.Message.trim() : '') ||
    (typeof json?.error === 'string' && json.error.trim() ? json.error.trim() : '') ||
    (typeof json?.Error === 'string' && json.Error.trim() ? json.Error.trim() : '') ||
    (text && String(text).trim() ? String(text).trim() : '') ||
    'Unknown error';

  return `Seerr request failed (${res.status} ${res.statusText}) at ${url}: ${detail}`;
}

export async function importJellyfinUserToSeerr({
  seerrUrl,
  apiKey,
  jellyfinUserId,
  email,
  username,
  password,
}) {
  const baseUrl = normalizeSeerrBaseUrl(seerrUrl);
  const key = String(apiKey || '').trim();
  const userId = String(jellyfinUserId || '').trim();
  const userEmail = String(email || '').trim();
  const userName = String(username || '').trim();
  const userPassword = String(password || '');

  if (!baseUrl) throw new Error('Missing Seerr URL.');
  if (!key) throw new Error('Missing Seerr API key.');
  if (!userId) throw new Error('Missing Jellyfin user id.');

  // 1) Preferred: import from Jellyfin (classic Jellyseerr behavior)
  const importUrl = `${baseUrl}/api/v1/user/import-from-jellyfin`;
  const importAttempt = await fetchJsonWithDetails(importUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': key,
    },
    body: { jellyfinUserIds: [userId] },
  });

  if (importAttempt.res.ok) return importAttempt.json;

  // 2) Fallback: some newer Seerr variants require creating the user with an email.
  // We also attempt to set a local password at creation time when supported.
  if (userEmail && userName) {
    const createUrl = `${baseUrl}/api/v1/user`;

    const baseBody = {
      email: userEmail,
      username: userName,
      jellyfinId: userId,
      // Lowest privileges by default.
      permissions: 0,
    };

    // Different Seerr variants use different password field names.
    // We try a few likely shapes and fall back to no-password creation if needed.
    const candidateBodies = [];
    if (userPassword) {
      candidateBodies.push({ ...baseBody, password: userPassword, passwordConfirm: userPassword });
      candidateBodies.push({ ...baseBody, password: userPassword, confirmPassword: userPassword });
      candidateBodies.push({ ...baseBody, password: userPassword });
    }
    candidateBodies.push(baseBody);

    const createErrors = [];
    for (const body of candidateBodies) {
      const attempt = await fetchJsonWithDetails(createUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': key,
        },
        body,
      });

      if (attempt.res.ok) {
        const isPasswordBody =
          Object.prototype.hasOwnProperty.call(body, 'password') ||
          Object.prototype.hasOwnProperty.call(body, 'passwordConfirm') ||
          Object.prototype.hasOwnProperty.call(body, 'confirmPassword');

        // If we had a password available but only succeeded when omitting it,
        // the user was created but can't log in locally yet.
        if (userPassword && !isPasswordBody) {
          throw new Error(
            'Seerr user was created, but this Seerr build did not accept a password in the create call. Set/reset the password in Seerr admin for this user.',
          );
        }

        return attempt.json;
      }

      createErrors.push(
        errorDetailFromResponse({
          res: attempt.res,
          url: createUrl,
          json: attempt.json,
          text: attempt.text,
        }),
      );
    }

    // If both import + all create variants failed, include both errors for easier debugging.
    const importErr = errorDetailFromResponse({
      res: importAttempt.res,
      url: importUrl,
      json: importAttempt.json,
      text: importAttempt.text,
    });
    const createErr = createErrors[0] || 'Fallback create failed for unknown reasons.';
    throw new Error(`${importErr} | Fallback create failed: ${createErr}`);
  }

  throw new Error(
    errorDetailFromResponse({
      res: importAttempt.res,
      url: importUrl,
      json: importAttempt.json,
      text: importAttempt.text,
    }),
  );
}
