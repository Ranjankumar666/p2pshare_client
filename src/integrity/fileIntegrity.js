async function hashChunk(chunk) {
	const hashBuffer = await crypto.subtle.digest('SHA-256', chunk);
	return bufferToHex(hashBuffer);
}

function bufferToHex(buffer) {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export { hashChunk };
