/* eslint-env worker */
/* eslint no-restricted-globals: ["off"] */
/* global Go */
/* global zipFileWASM */
/* global unzipFileWASM */
/// <reference lib="webworker" />

importScripts('/wasm_exec.js');

const go = new Go();
const BATCH_SIZE = 40;
const CHUNK_SIZE = 12 * 1024;

let goReady = WebAssembly.instantiateStreaming(
	fetch('/main.wasm'),
	go.importObject
).then((result) => {
	go.run(result.instance);
});

async function hashChunk(chunk) {
	const hashBuffer = await crypto.subtle.digest('SHA-256', chunk);
	return bufferToHex(hashBuffer);
}

function bufferToHex(buffer) {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

const chunkify = async (fileData, fileSize, chunkSize = CHUNK_SIZE) => {
	const chunks = [];
	const hashes = [];

	let offset = 0;
	while (offset < fileSize) {
		const slice = fileData.slice(offset, offset + chunkSize);
		const hash = await hashChunk(slice);
		chunks.push(slice);
		hashes.push(hash);

		offset += chunkSize;
	}

	console.log('Chunks length: ', chunks.length);
	return { chunks, hashes };
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

const batchify = (chunks, hashes, batchSize = BATCH_SIZE) => {
	let curr = 0;
	let BATCHES = [];
	while (curr < chunks.length) {
		const currIndex = curr;
		BATCHES.push(
			chunks
				.slice(curr, curr + BATCH_SIZE)
				.map((chunk, index) => [
					currIndex + index,
					hashes[currIndex + index],
					chunk,
				])
		);
		curr += BATCH_SIZE;
	}

	return BATCHES;
};

/* eslint-env worker */
self.onmessage = async function (event) {
	await goReady;
	const { type, data } = event.data;

	if (type === 'zip') {
		const compressed = zipFileWASM(data);
		const { chunks, hashes } = await chunkify(
			compressed,
			compressed.byteLength
		);

		const batches = batchify(chunks, hashes);
		self.postMessage({ batches, fileSize: compressed.byteLength });
	} else if (type === 'assemble') {
		const blobs = [];
		const { bytes, peerId } = data;

		bytes.get(peerId).forEach((byteArrayMap) => {
			const blob = assembleZipChunks(byteArrayMap);
			blobs.push(blob);
		});

		const files = [];
		for (let blob of blobs) {
			const file = unzipFileWASM(
				new Uint8Array(await blob.arrayBuffer())
			);

			files.push(file);
		}

		self.postMessage(files);
	}
};
