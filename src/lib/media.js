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
    const msg =
      json?.Message ||
      json?.message ||
      json?.error ||
      json?.Error ||
      json?.Details ||
      text ||
      `${res.status} ${res.statusText}`;
    throw new Error(`${method} ${path} failed (${res.status}): ${String(msg).trim() || res.statusText}`);
  }

  return json;
}

async function findExistingUserId({ baseUrl, apiKey, username }) {
  const name = String(username || '').trim().toLowerCase();
  if (!name) return '';

  const json = await apiFetch({ baseUrl, apiKey, path: '/Users', method: 'GET' });
  const list = Array.isArray(json) ? json : Array.isArray(json?.Items) ? json.Items : [];
  const found = list
    .filter((u) => u && typeof u === 'object')
    .find((u) => String(u.Name || u.name || '').trim().toLowerCase() === name);

  return String(found?.Id || found?.id || '');
}

export async function provisionUser({ serverType, baseUrl, apiKey, username, password, libraryIds = null }) {
  if (!baseUrl || !apiKey) {
    throw new Error(`${serverType} is not configured (baseUrl/apiKey).`);
  }

  const uname = String(username || '').trim();
  if (!uname) throw new Error('Username is required.');

  // Best-effort implementation (API shapes vary slightly between installs/versions).
  // 1) Create (or reuse) user
  let userId = '';

  try {
    userId = await findExistingUserId({ baseUrl, apiKey, username: uname });
  } catch {
    userId = '';
  }

  if (!userId) {
    try {
      const created = await apiFetch({
        baseUrl,
        apiKey,
        path: '/Users/New',
        method: 'POST',
        body: { Name: uname },
      });
      userId = String(created?.Id || created?.id || '');
    } catch (e) {
      // If creation fails (often "already exists"), try one last time to find it.
      try {
        userId = await findExistingUserId({ baseUrl, apiKey, username: uname });
      } catch {
        userId = '';
      }
      if (!userId) throw new Error(`Create user failed: ${String(e?.message || e)}`);
    }
  }

  if (!userId) throw new Error('Server did not return a user id.');

  // 2) Set password
  try {
    await apiFetch({
      baseUrl,
      apiKey,
      path: `/Users/${encodeURIComponent(userId)}/Password`,
      method: 'POST',
      body: { CurrentPw: '', NewPw: password },
    });
  } catch (e) {
    throw new Error(`Set password failed: ${String(e?.message || e)}`);
  }

  // 3) Apply library permissions (best-effort)
  if (Array.isArray(libraryIds)) {
    const enabledFolders = libraryIds.map((x) => String(x)).filter(Boolean);

    let existingPolicy = {};
    try {
      const user = await apiFetch({
        baseUrl,
        apiKey,
        path: `/Users/${encodeURIComponent(userId)}`,
        method: 'GET',
      });
      existingPolicy = user?.Policy || user?.policy || {};
    } catch {
      existingPolicy = {};
    }

    const nextPolicy = {
      ...existingPolicy,
      EnableAllFolders: false,
      EnabledFolders: enabledFolders,
    };

    try {
      await apiFetch({
        baseUrl,
        apiKey,
        path: `/Users/${encodeURIComponent(userId)}/Policy`,
        method: 'POST',
        body: nextPolicy,
      });
    } catch (e) {
      throw new Error(`Apply library permissions failed: ${String(e?.message || e)}`);
    }
  }

  return { userId };
}
