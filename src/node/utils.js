import { pipe } from 'it-pipe';
import { hashChunk } from '../integrity/fileIntegrity';
import { decode, END, EOF, START } from '../buffer/codec';
import { openDB, storeChunk } from '../p2pShareDB/db';
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
				await storeChunk(peerId, filename, index, chunk);
			}

			return;
		}
	});

	return [streamtype, indexFailed, file];
};

export const reception = async (type, stream, peerId, file) => {
	if (type === END) {
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

export { convertStreamToFile };
