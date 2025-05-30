import protobuf from 'protobufjs';
import packetJson from './packet.json';

const root = protobuf.Root.fromJSON(packetJson);
const Packet = root.lookupType('Packet');

export const CHUNK = 0;
export const ACK = 1;
export const RETRY = 2;
export const END = 3;
export const START = 4;

/**
 * @param {number} index
 * @param {string} hash
 * @param {Uint8Array<any>} chunk
 * @param {string} filename
 * @return {Uint8Array}
 */
const encodeChunkPacket = (index, hash, chunk, filename) => {
	return Packet.encode(
		Packet.create({
			type: CHUNK,
			chunkPacket: {
				index,
				hash,
				chunk,
				filename,
			},
		})
	).finish();
};

/**
 *
 *
 * @return {Uint8Array}
 */
const encodeAckPacket = () => {
	return Packet.encode(
		Packet.create({
			type: ACK,
			ackPacket: {},
		})
	).finish();
};

/**
 *
 * @param {Array<number>} indices
 * @return {*}
 */
const encodeRetryPacket = (indices) => {
	return Packet.encode(
		Packet.create({
			type: RETRY,
			retryPacket: {
				indices,
			},
		})
	).finish();
};

/**
 *
 *
 * @return {Uint8Array}
 */
const encodeEndOfTransferPacket = () => {
	return Packet.encode(
		Packet.create({
			type: END,
			endOfTransferPacket: {},
		})
	).finish();
};

/**
 *
 *
 * @return {Uint8Array}
 */
const encodeStartOfTransferPacket = () => {
	return Packet.encode(
		Packet.create({
			type: START,
			startOfTransferPacket: {},
		})
	).finish();
};

/**
 *
 *
 * @param {number} type
 * @param {{
 *  index?: number;
 *  hash?: string;
 *  chunk?: Uint8Array<any>;
 *  indices? : Array<number>;
 *  filename?: string;
 * }} [data={}]
 * @return {*}
 */
const encode = (type, data = {}) => {
	switch (type) {
		case CHUNK:
			return encodeChunkPacket(
				data.index,
				data.hash,
				data.chunk,
				data.filename
			);
		case ACK:
			return encodeAckPacket();
		case RETRY:
			return encodeRetryPacket(data.indices);
		case END:
			return encodeEndOfTransferPacket();
		case START:
			return encodeStartOfTransferPacket();
		default:
			throw new Error(`Unknown packet type: ${type}`);
	}
};

const decode = (chunkPacket) => {
	const decoded = Packet.decode(chunkPacket);

	switch (decoded.type) {
		case CHUNK: // Chunk Packet
			return {
				type: decoded.type,
				index: decoded.chunkPacket.index,
				hash: decoded.chunkPacket.hash,
				chunk: decoded.chunkPacket.chunk,
				filename: decoded.chunkPacket.filename,
			};
		case ACK: // Ack Packet
			return {
				type: decoded.type,
			};
		case RETRY: // Retry Packet
			return {
				type: decoded.type,
				indices: decoded.retryPacket.indices,
			};
		case END:
			return {
				type: decoded.type,
			};
		case START:
			return {
				type: decoded.type,
			};
		default:
			throw new Error(`Unknown packet type: ${decoded.type}`);
	}
};

export { encode, decode };
