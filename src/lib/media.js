async function apiFetch({ baseUrl, apiKey, path, method, body }) {
  const url = `${String(baseUrl || '').replace(/\/+$/, '')}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Jellyfin and Emby both commonly accept X-Emby-Token.
      'X-Emby-Token': apiKey,
    },
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

  if (!res.ok) {
    const msg = json?.Message || json?.error || text || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  return json;
}

export async function provisionUser({ serverType, baseUrl, apiKey, username, password }) {
  if (!baseUrl || !apiKey) {
    throw new Error(`${serverType} is not configured (baseUrl/apiKey).`);
  }

  // Best-effort implementation (API shapes vary slightly between installs/versions).
  // 1) Create user
  const created = await apiFetch({
    baseUrl,
    apiKey,
    path: '/Users/New',
    method: 'POST',
    body: { Name: username },
  });

  const userId = created?.Id || created?.id;
  if (!userId) {
    throw new Error('Server did not return a user id.');
  }

  // 2) Set password
  await apiFetch({
    baseUrl,
    apiKey,
    path: `/Users/${encodeURIComponent(userId)}/Password`,
    method: 'POST',
    body: { CurrentPw: '', NewPw: password },
  });

  return { userId };
}
