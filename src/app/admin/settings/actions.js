'use server';

import { redirect } from 'next/navigation';
import { readState, updateStateLocked, addAuditEvent } from '@/lib/store';
import { getSession } from '@/lib/session';
import { randomToken } from '@/lib/crypto';
import { sendTestEmail } from '@/lib/email';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') throw new Error('Unauthorized.');
  return session;
}

async function apiFetch({ baseUrl, apiKey, path, method, body }) {
  const url = `${String(baseUrl || '').replace(/\/+$/, '')}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
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

async function fetchLibraries({ baseUrl, apiKey }) {
  const json = await apiFetch({
    baseUrl,
    apiKey,
    path: '/Library/VirtualFolders',
    method: 'GET',
  });

  const items = Array.isArray(json) ? json : Array.isArray(json?.Items) ? json.Items : [];
  return items
    .filter((x) => x && typeof x === 'object')
    .map((x) => ({
      id: String(x.ItemId || x.Id || x.id || ''),
      name: String(x.Name || x.name || ''),
    }))
    .filter((l) => l.id && l.name);
}

export async function savePublicBaseUrlAction(formData) {
  await requireAdmin();

  const url = String(formData.get('publicBaseUrl') || '')
    .trim()
    .replace(/\/+$/, '');

  await updateStateLocked((next) => {
    next.publicBaseUrl = url;
    addAuditEvent(next, {
      type: 'admin_public_base_url_saved',
      actor: 'admin',
      message: 'Public Base URL saved.',
      meta: { url },
    });
    return next;
  });

  redirect('/admin/settings/base-url');
}

export async function saveSmtpAction(formData) {
  await requireAdmin();

  const host = String(formData.get('smtpHost') || '');
  const port = Number(formData.get('smtpPort') || 587);
  const secure = String(formData.get('smtpSecure') || '') === 'on';
  const user = String(formData.get('smtpUser') || '');
  const passIn = String(formData.get('smtpPass') || '');
  const from = String(formData.get('smtpFrom') || '');

  await updateStateLocked((next) => {
    next.smtp = {
      host,
      port,
      secure,
      user,
      from,
      pass: String(passIn || '') ? passIn : String(next.smtp?.pass || ''),
    };

    addAuditEvent(next, {
      type: 'admin_smtp_saved',
      actor: 'admin',
      message: 'SMTP settings saved.',
      meta: { host, port, secure, user, from },
    });
    return next;
  });

  redirect('/admin/settings/smtp');
}

export async function testSmtpAction(formData) {
  await requireAdmin();

  const to = String(formData.get('smtpTestTo') || '').trim();
  if (!to || !to.includes('@')) throw new Error('Valid "Send test to" email is required.');

  try {
    await sendTestEmail({ to });
    redirect('/admin/settings/smtp?smtpTest=sent');
  } catch (err) {
    const msg = err && typeof err === 'object' && 'message' in err ? String(err.message || '') : String(err || '');
    const safe = encodeURIComponent(String(msg || 'SMTP test failed').slice(0, 240));
    console.warn('SMTP test failed:', msg);
    redirect(`/admin/settings/smtp?smtpTest=failed&smtpTestErr=${safe}`);
  }
}

export async function saveSeerrAction(formData) {
  await requireAdmin();

  const url = String(formData.get('seerrUrl') || '').trim().replace(/\/+$/, '');
  const apiKeyIn = String(formData.get('seerrApiKey') || '');
  const apiKey = String(apiKeyIn || '').trim() ? apiKeyIn : '';
  const setLocalPassword = String(formData.get('seerrSetLocalPassword') || '') === 'on';

  await updateStateLocked((next) => {
    next.seerr = {
      ...(next.seerr && typeof next.seerr === 'object' ? next.seerr : {}),
      url,
      apiKey: apiKey ? apiKey : String(next.seerr?.apiKey || ''),
      setLocalPassword,
    };

    addAuditEvent(next, {
      type: 'admin_seerr_saved',
      actor: 'admin',
      message: 'Requests (Seerr) settings saved.',
      meta: { url, setLocalPassword, apiKeyChanged: Boolean(apiKey) },
    });
    return next;
  });

  redirect('/admin/settings/requests');
}

export async function saveAboutAction(formData) {
  await requireAdmin();

  const text = String(formData.get('aboutText') || '');

  await updateStateLocked((next) => {
    next.about = {
      ...(next.about && typeof next.about === 'object' ? next.about : {}),
      text,
    };

    addAuditEvent(next, {
      type: 'admin_about_saved',
      actor: 'admin',
      message: 'About text saved.',
      meta: { length: text.length },
    });
    return next;
  });

  redirect('/admin/settings/about');
}

export async function upsertServerAction(formData) {
  await requireAdmin();

  const id = String(formData.get('id') || '').trim();
  const type = String(formData.get('type') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const baseUrl = String(formData.get('baseUrl') || '').trim().replace(/\/+$/, '');
  const connectionUrl = String(formData.get('connectionUrl') || '').trim().replace(/\/+$/, '');
  const apiKey = String(formData.get('apiKey') || '');
  const enabled = String(formData.get('enabled') || '') === 'on';

  if (type !== 'jellyfin' && type !== 'emby') throw new Error('Invalid type.');
  if (!name) throw new Error('Name is required.');
  if (!baseUrl) throw new Error('Base URL is required.');

  await updateStateLocked((next) => {
    next.servers = Array.isArray(next.servers) ? next.servers : [];

    if (id) {
      const existing = next.servers.find((s) => s.id === id);
      if (!existing) throw new Error('Server not found.');
      existing.type = type;
      existing.name = name;
      existing.baseUrl = baseUrl;
      existing.connectionUrl = connectionUrl;
      existing.enabled = enabled;
      if (String(apiKey || '').trim()) {
        existing.apiKey = apiKey;
      }
    } else {
      const newId = `srv_${randomToken(8)}`;
      next.servers.push({
        id: newId,
        type,
        name,
        baseUrl,
        connectionUrl,
        apiKey,
        enabled,
      });
    }

    addAuditEvent(next, {
      type: id ? 'admin_server_updated' : 'admin_server_added',
      actor: 'admin',
      message: id ? 'Server updated.' : 'Server added.',
      meta: { id: id || null, type, name, baseUrl, connectionUrl, enabled },
    });
    return next;
  });

  redirect('/admin/settings/servers');
}

export async function syncLibrariesAction(formData) {
  await requireAdmin();

  const id = String(formData.get('id') || '').trim();
  if (!id) throw new Error('Missing server id.');

  const next = readState();
  next.servers = Array.isArray(next.servers) ? next.servers : [];
  const server = next.servers.find((s) => s.id === id);
  if (!server) throw new Error('Server not found.');
  if (!server.baseUrl || !server.apiKey) throw new Error('Server baseUrl/apiKey is required to sync libraries.');

  const libraries = await fetchLibraries({ baseUrl: server.baseUrl, apiKey: server.apiKey });

  await updateStateLocked((s) => {
    s.servers = Array.isArray(s.servers) ? s.servers : [];
    const srv = s.servers.find((x) => x.id === id);
    if (!srv) throw new Error('Server not found.');

    srv.libraries = libraries;
    if (!Array.isArray(srv.offeredLibraryIds)) {
      srv.offeredLibraryIds = libraries.map((l) => l.id);
    }

    addAuditEvent(s, {
      type: 'admin_libraries_synced',
      actor: 'admin',
      message: 'Libraries synced from server.',
      meta: { serverId: id, count: libraries.length },
    });

    return s;
  });

  redirect('/admin/settings/libraries');
}

export async function saveOfferedLibrariesAction(formData) {
  await requireAdmin();

  const id = String(formData.get('id') || '').trim();
  if (!id) throw new Error('Missing server id.');

  const next = readState();
  next.servers = Array.isArray(next.servers) ? next.servers : [];
  const server = next.servers.find((s) => s.id === id);
  if (!server) throw new Error('Server not found.');

  const allowed = new Set(
    (Array.isArray(server.libraries) ? server.libraries : []).map((l) => String(l.id || '')).filter(Boolean)
  );
  const selected = formData
    .getAll('offeredLibraryId')
    .map((x) => String(x))
    .filter((x) => allowed.has(x));

  await updateStateLocked((s) => {
    s.servers = Array.isArray(s.servers) ? s.servers : [];
    const srv = s.servers.find((x) => x.id === id);
    if (!srv) throw new Error('Server not found.');
    srv.offeredLibraryIds = selected;

    addAuditEvent(s, {
      type: 'admin_offered_libraries_saved',
      actor: 'admin',
      message: 'Offered libraries saved.',
      meta: { serverId: id, count: selected.length },
    });
    return s;
  });

  redirect('/admin/settings/libraries');
}
