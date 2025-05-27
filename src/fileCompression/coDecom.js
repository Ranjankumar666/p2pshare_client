import { BlobReader, BlobWriter, ZipReader, ZipWriter } from '@zip.js/zip.js';
import { BATCH_SIZE, CHUNK_SIZE } from '../sender/constants';
import { CHUNK, encode } from '../buffer/codec';
import { getChunks } from '../p2pShareDB/db';

async function hashChunk(chunk) {
	const hashBuffer = await crypto.subtle.digest('SHA-256', chunk);
	return bufferToHex(hashBuffer);
}

function bufferToHex(buffer) {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 *
 * @param {{
 * [key:string] : File;
 * }} fileMap
 * @returns {Promise<Blob>}
 */
export const compress = async (fileMap) => {
	const zip = new ZipWriter(new BlobWriter('application/zip'));
	for (const [fileName, fileData] of Object.entries(fileMap)) {
		zip.add(fileName, new BlobReader(fileData));
	}

	const zippedBlob = await zip.close();
	return zippedBlob;
};

export const zipStream = async (fileMap) => {
	const fileName = Object.keys(fileMap)[0];
	const blob = await compress(fileMap);
	let offset = 0;

	const stream = new ReadableStream({
		pull: async (controller) => {
			if (offset > blob.size) {
				controller.close();
				return;
			}
			const transformedChunk = blob.slice(offset, offset + CHUNK_SIZE);
			offset += CHUNK_SIZE;
			const byteArray = await transformedChunk.arrayBuffer();
			controller.enqueue(byteArray);
		},
	});

	let index = 0;
	const transformed = stream.pipeThrough(
		new TransformStream({
			transform: async (chunk, controller) => {
				// const byteArray = new Uint8Array(chunk);

				const hash = await hashChunk(chunk);
				controller.enqueue(
					encode(CHUNK, {
						filename: fileName,
						index: index++,
						chunk: new Uint8Array(chunk),
						hash,
					})
				);
			},
		})
	);

	return transformed;
};

export const saveFile = async (peer, fileName) => {
	const chunkStream = getChunks(peer, fileName);
	const zip = new ZipReader(chunkStream);
	const entries = await zip.getEntries();

	for (const entry of entries) {
		console.log('File name downloaded: ', entry.filename);

		const handle = await window.showSaveFilePicker({
			suggestedName: fileName,
		});
		const saveStream = await handle.createWritable();
		try {
			// Stream chunks from IndexedDB to the file
			await entry.getData(saveStream);
		} catch (err) {
			console.error('File save failed:', err);
			await saveStream.abort(); // Rollback partially written file
		}
	}
};

export const batchStream = (stream, batch = BATCH_SIZE) => {
	let buffer = [];

	return stream.pipeThrough(new TransformStream({
		transform: (chunk, controller) => {
			buffer.push(chunk);
			if (buffer.length >= batch) {
				controller.enqueue(buffer);
				buffer = [];
			}
		},
		flush: (controller) => {
			if (buffer.length > 0) {
				controller.enqueue(buffer);
			}
		},
	}));
};
