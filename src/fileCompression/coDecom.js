import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js';
import { CHUNK_SIZE } from '../sender/constants';
import { CHUNK, encode } from '../buffer/codec';

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
