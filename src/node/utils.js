import { pipe } from 'it-pipe';
import {
	bufferToHex,
	hashChunk,
	hexToBuffer,
} from '../integrity/fileIntegrity';

const encode = (index, hash, chunk) => {
	const indexBuffer = new Uint32Array([index]); // 4 bytes
	const hashBuffer = hexToBuffer(hash);

	if (hashBuffer.length !== 32) {
		throw new Error('Invalid hash length, expected 32 bytes.');
	}

	const totalLength =
		indexBuffer.byteLength + hashBuffer.byteLength + chunk.byteLength;
	const finalBuffer = new Uint8Array(totalLength);

	// Copy all parts into the final buffer
	finalBuffer.set(new Uint8Array(indexBuffer.buffer), 0);
	finalBuffer.set(hashBuffer, indexBuffer.byteLength);
	finalBuffer.set(chunk, indexBuffer.byteLength + hashBuffer.byteLength);

	return finalBuffer;
};

const decode = (buffer) => {
	// Extract index using DataView for accurate byte reading
	const index = new DataView(buffer.buffer, buffer.byteOffset, 4).getUint32(
		0,
		true
	);

	// Extract 32-byte hash
	const hashBuffer = buffer.slice(4, 36);
	const hash = bufferToHex(hashBuffer); // Convert to hex string

	// Extract remaining chunk
	const chunkBuffer = buffer.slice(36);

	return { index, hash, chunk: chunkBuffer };
};

const checkStreamHasChunk = async (stream) => {
	for (const rawChunk of stream.source) {
		if (!(rawChunk.bufs[0] instanceof Uint8Array)) {
			console.error('Received non-Uint8Array chunk:', rawChunk);
			return false;
		}
		const { chunk } = decode(rawChunk.bufs[0]);

		if (chunk.length === 0) {
			return false;
		}

		return true;
	}
};

const convertStreamToFile = async (stream) => {
	const received = new Map();
	// let receivedByteSize = 0;

	await pipe(stream, async function process(source) {
		for await (const rawChunk of source) {
			if (!(rawChunk.bufs[0] instanceof Uint8Array)) {
				console.error('Received non-Uint8Array chunk:', rawChunk);
				continue;
			}
			const { index, hash, chunk } = decode(rawChunk.bufs[0]);
			const computedHash = await hashChunk(chunk);
			if (hash !== computedHash) {
				// await pipe(encode(index, hash, chunk), stream.sink);
				return;
			}
			received.set(index, chunk);
			//acknowledge the chunk
		}
	});
	return assembleZipChunks(received);
};
const assembleZipChunks = (map) => {
	// 1️⃣ Sort chunks by index
	const sortedIndices = Array.from(map.keys()).sort((a, b) => a - b);

	// 2️⃣ Merge all chunks into a single Uint8Array
	let totalSize = sortedIndices.reduce(
		(acc, i) => acc + map.get(i).length,
		0
	);
	let mergedArray = new Uint8Array(totalSize);
	let offset = 0;

	for (let index of sortedIndices) {
		const chunk = map.get(index);
		mergedArray.set(chunk, offset);
		offset += chunk.length;
	}

	if (mergedArray.length === totalSize) {
		console.log('All files combined');
	}
	// 3️⃣ Create a ZIP Blob
	return new Blob([mergedArray], {
		type: 'application/zip',
	});
};

const handleFileDownload = (fileBlob) => {
	// const url = URL.createObjectURL(blob);
	const url = URL.createObjectURL(fileBlob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = `file-${Date.now()}.zip`;
	document.body.appendChild(anchor);
	anchor.click();

	requestAnimationFrame(() => {
		document.body.removeChild(anchor);
		URL.revokeObjectURL(url);
	});
};

export {
	encode,
	decode,
	convertStreamToFile,
	handleFileDownload,
	checkStreamHasChunk,
};
