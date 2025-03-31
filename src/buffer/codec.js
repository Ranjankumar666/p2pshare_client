import protobuf from 'protobufjs';
import packetJson from './packet.json';

const root = protobuf.Root.fromJSON(packetJson);
const Packet = root.lookupType('Packet');

/**
 * @param {number} index
 * @param {stinf} hash
 * @param {Uint8Array<any>} chunk
 * @return {Uint8Array}
 */
const encodeChunkPacket = (index, hash, chunk) => {
	return Packet.encode(
		Packet.create({
			type: 0,
			chunkPacket: {
				index,
				hash,
				chunk,
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
			type: 1,
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
			type: 2,
			retryPacket: {
				indices,
			},
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
 * }} [data={}]
 * @return {*}
 */
const encode = (type, data = {}) => {
	switch (type) {
		case 0:
			return encodeChunkPacket(data.index, data.hash, data.chunk);
		case 1:
			return encodeAckPacket();
		case 2:
			return encodeRetryPacket(data.indices);
		default:
			throw new Error(`Unknown packet type: ${type}`);
	}
};

const decode = (chunkPacket) => {
	const decoded = Packet.decode(chunkPacket);

	switch (decoded.type) {
		case 0: // Chunk Packet
			return {
				type: decoded.type,
				index: decoded.chunkPacket.index,
				hash: decoded.chunkPacket.hash,
				chunk: decoded.chunkPacket.chunk,
			};
		case 1: // Ack Packet
			return {
				type: decoded.type,
			};
		case 2: // Retry Packet
			return {
				type: decoded.type,
				indices: decoded.retryPacket.indices,
			};
		default:
			throw new Error(`Unknown packet type: ${decoded.type}`);
	}
};

export { encode, decode };
