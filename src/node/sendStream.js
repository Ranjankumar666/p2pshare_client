import { pipe } from 'it-pipe';
import { dialProtocol } from './node';
import { ACK, decode, encode, EOF } from '../buffer/codec';

const responseReader = (stream) =>
	async function (source) {
		for await (let rawChunk of source) {
			const { type } = decode(rawChunk.bufs[0]);

			if (type === ACK) {
				console.log('Sent successfully');
				await stream.close();
			}
		}
	};

export const sendStream = async (value, conn, peerMA) => {
	let stream = await dialProtocol(conn, peerMA);

	// Send
	await pipe(async function* () {
		yield value;
	}, stream);

	// Ack
	await pipe(stream, responseReader(stream));
};

export const sendEOFStream = async (filename, conn, peerMA) => {
	let stream = await dialProtocol(conn, peerMA);
	// Send
	await pipe(async function* () {
		yield encode(EOF, { filename });
	}, stream);

	await pipe(stream, responseReader(stream));
};

export const sendACKStream = async (stream) => {
	await pipe(async function* () {
		yield encode(ACK);
	}, stream);
};
