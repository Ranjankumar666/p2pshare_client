import { toByteArray, fromByteArray } from 'base64-js';
import { pipe } from 'it-pipe';
import { hashChunk } from '../integrity/fileIntegrity';

const encode = (index, hash, chunk) => {
	const json = JSON.stringify({
		index,
		hash,
		chunk: fromByteArray(chunk),
	});

	return new TextEncoder().encode(json);
};

const decode = (receivedData) => {
	const jsonString = new TextDecoder().decode(receivedData); // Convert Uint8Array to JSON string

	try {
		const { index, hash, chunk } = JSON.parse(jsonString);
		const sanitized = {
			index,
			hash,
			chunk: toByteArray(chunk), // Convert Base64 back to Uint8Array
		};

		return sanitized;
	} catch (error) {
		console.error(
			'JSON Parse Error:',
			error,
			'\nReceived Data:',
			jsonString
		);
		throw error; // Re-throw error for better debugging
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
			if (hash === (await hashChunk(chunk))) {
				received.set(index, chunk);
			}
		}
	});

	console.log(received);
	return assembleZipChunks(received);
};
const assembleZipChunks = (map) => {
	// 1️⃣ Sort chunks by index
	const sortedIndices = Array.from(map.keys()).sort((a, b) => a - b);
	console.log(sortedIndices);

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

export { encode, decode, convertStreamToFile, handleFileDownload };
