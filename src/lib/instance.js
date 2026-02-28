import crypto from 'node:crypto';

// Per-process identifier to help detect load balancing across multiple instances.
// Not a secret; used only for diagnostics.
export const instanceId = crypto.randomBytes(8).toString('hex');
