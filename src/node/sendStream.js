import { pipe } from 'it-pipe';
import { dialProtocol } from './node';
import { ACK, decode, encode, EOF } from '../buffer/codec';

const responseReader = (stream) =>
	async function (source) {
		for await (let rawChunk of source) {
			const { type } = decode(rawChunk.subarray());

			if (type === ACK) {
				// console.log('Sent successfully');
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

export const sendStreamWithoutAck = async (value, conn, peerMA) => {
	let stream = await dialProtocol(conn, peerMA);

	// Send
	await pipe(async function* () {
		yield value;
	}, stream);

	// No response handling
	await stream.close();
};

export const sendEOFStream = async (filename, conn, peerMA) => {
	await sendStream(encode(EOF, { filename }), conn, peerMA);
};

export const sendACKStream = async (stream) => {
	await pipe(async function* () {
		yield encode(ACK);
	}, stream);
};
