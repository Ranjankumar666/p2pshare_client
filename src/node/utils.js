import { pipe } from 'it-pipe';
import { hashChunk } from '../integrity/fileIntegrity';
import { decode, END, EOF, START } from '../buffer/codec';
import FileAssemblyWorker from '../workers/fileCompression.worker';
import { clearDB, openDB, storeChunk } from '../p2pShareDB/db';
import { sendACKStream } from './sendStream';
import { setFileDownload, setStartDownload } from '../state/stateReducer';
import { store } from '../state/store';

// const encode = (index, hash, chunk) => {
// 	const indexBuffer = new Uint32Array([index]); // 4 bytes
// 	const hashBuffer = hexToBuffer(hash);

// 	if (hashBuffer.length !== 32) {
// 		throw new Error('Invalid hash length, expected 32 bytes.');
// 	}

// 	const totalLength =
// 		indexBuffer.byteLength + hashBuffer.byteLength + chunk.byteLength;
// 	const finalBuffer = new Uint8Array(totalLength);

// 	// Copy all parts into the final buffer
// 	finalBuffer.set(new Uint8Array(indexBuffer.buffer), 0);
// 	finalBuffer.set(hashBuffer, indexBuffer.byteLength);
// 	finalBuffer.set(chunk, indexBuffer.byteLength + hashBuffer.byteLength);

// 	return finalBuffer;
// };

// const decode = (buffer) => {
// 	// Extract index using DataView for accurate byte reading
// 	const index = new DataView(buffer.buffer, buffer.byteOffset, 4).getUint32(
// 		0,
// 		true
// 	);

// 	// Extract 32-byte hash
// 	const hashBuffer = buffer.slice(4, 36);
// 	const hash = bufferToHex(hashBuffer); // Convert to hex string

// 	// Extract remaining chunk
// 	const chunkBuffer = buffer.slice(36);

// 	return { index, hash, chunk: chunkBuffer };
// };

/**
 *
 *
 * @param {import('@libp2p/interface').Stream} stream
 * @param {Map} received
 * @param {Set} failed
 */
const convertStreamToFile = async (peerId, stream, received, failed) => {
	// let receivedByteSize = 0;
	let streamtype;
	let indexFailed;
	let file;

	await pipe(stream, async function process(source) {
		for await (const rawChunk of source) {
			if (!(rawChunk.bufs[0] instanceof Uint8Array)) {
				console.error('Received non-Uint8Array chunk:', rawChunk);
				continue;
			}

			const { type, index, hash, chunk, filename } = decode(
				rawChunk.bufs[0]
			);

			streamtype = type;
			file = filename;

			if (type === EOF) {
				// await assembleAndDownload(
				// 	peerId,
				// 	received,
				// 	encode,
				// 	stream,
				// 	filename
				// );
				console.log('Received: EOF packet for ', filename);
				return;
			}
			if (type === END) {
				console.log('Received: EOT packet ');
				return;
			} else if (type === START) {
				console.log('File Transfer initiated');
				return;
			}

			const computedHash = await hashChunk(chunk);
			if (hash !== computedHash) {
				// failed.add(index);
				indexFailed = index;
			} else {
				console.log('✅✅ Chunk Added');
				// if (!received.has(peerId)) {
				// 	received.set(peerId, new Map());
				// }

				// if (failed.has(index)) {
				// 	failed.delete(index);
				// }

				// if (!received.get(peerId).has(filename)) {
				// 	received.get(peerId).set(filename, new Map());
				// }
				// received.get(peerId).get(filename).set(index, chunk);

				await storeChunk(peerId, filename, index, chunk);
			}

			return;
		}
	});

	return [streamtype, indexFailed, file];
};

export const assembleAndDownload = async (
	peerId,
	received,
	stream,
	fileName = null
) => {
	const worker = new FileAssemblyWorker();
	let type = 'assemble';
	if (fileName !== null) {
		type = 'assembleFile';
	}
	const files = await new Promise((res) => {
		worker.postMessage({
			type,
			data: {
				bytes: received,
				peerId,
				fileName,
			},
		});

		worker.onmessage = (ev) => res(ev.data);
	});

	worker.terminate();

	// await Promise.all(blobs.map((blob) => handleFileDownload(blob)));
	// for (let blob of blobs) {
	// 	await handleFileDownload(blob);
	// }
	if (files)
		for (let file of files) {
			handleFileDownload(file);
		}

	await sendACKStream(stream);
};

const handleFileDownload = (filesDownload) => {
	console.log(filesDownload);
	filesDownload?.forEach((val, fileName) => {
		const blob = new Blob([val]);
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = fileName;
		document.body.appendChild(anchor);
		anchor.click();

		requestAnimationFrame(() => {
			document.body.removeChild(anchor);
			URL.revokeObjectURL(url);
		});
	});
};

const chunkify = async (fileData, fileSize, chunkSize = 10 * 1024) => {
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

	return { chunks, hashes };
};

export const reception = async (type, stream, peerId, file) => {
	if (type === END) {
		// await clearDB();
		store.dispatch(setStartDownload(false));
	} else if (type === EOF) {
		console.log('File received: ', {
			peerId,
			fileName: file,
		});
		await sendACKStream(stream);
		store.dispatch(
			setFileDownload({
				peerId,
				fileName: file,
			})
		);
	} else if (type === START) {
		await openDB();
		store.dispatch(setStartDownload(true));
	} else {
		await sendACKStream(stream);
	}
};

export {
	// encode,
	// decode,
	convertStreamToFile,
	handleFileDownload,
	chunkify,
};
