async function hashChunk(chunk) {
	const hashBuffer = await crypto.subtle.digest('SHA-256', chunk);
	return bufferToHex(hashBuffer);
}

// Helper function: Convert hex string to Uint8Array buffer
function hexToBuffer(hex) {
	if (hex.length % 2 !== 0) {
		throw new Error('Invalid hex string. Length must be even.');
	}

	const buffer = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		buffer[i / 2] = parseInt(hex.substr(i, 2), 16);
	}
	return buffer;
}

// Helper function: Convert Uint8Array buffer to hex string
function bufferToHex(buffer) {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export { hashChunk, hexToBuffer, bufferToHex };
