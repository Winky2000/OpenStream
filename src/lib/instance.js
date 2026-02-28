// Per-process identifier to help detect load balancing across multiple instances.
// Not a secret; used only for diagnostics.
function bytesToHex(bytes) {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

function makeId() {
	// Edge runtime (Web Crypto)
	try {
		const c = globalThis.crypto;
		if (c && typeof c.getRandomValues === 'function') {
			const bytes = new Uint8Array(8);
			c.getRandomValues(bytes);
			return bytesToHex(bytes);
		}
	} catch {
		// ignore
	}

	// Node.js runtime (lazy require so Edge bundles don't pull node:crypto)
	try {
		// eslint-disable-next-line global-require
		const nodeCrypto = require('node:crypto');
		return nodeCrypto.randomBytes(8).toString('hex');
	} catch {
		// ignore
	}

	// Last resort
	return `fallback_${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
}

export const instanceId = makeId();
