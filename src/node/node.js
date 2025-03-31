import { createLibp2p } from 'libp2p';
import { defaultConfig } from './libp2pConfig';
import { pipe } from 'it-pipe';

import { PROTOCOL, BOOTSTRAP_NODES, WEBRTC_CODE } from './constants';
import {
	assembleZipChunks,
	convertStreamToFile,
	handleFileDownload,
} from './utils';

import { encode } from '../buffer/codec';

const isWebRTC = (ma) => ma.protocols().includes(WEBRTC_CODE);
const received = new Map();
const failed = new Set();

/**
 *
 *
 * @type {import('@libp2p/interface').StreamHandler}
 */
const handleProtocolStream = async ({ connection, stream }) => {
	try {
		await convertStreamToFile(stream, received, failed);
		if (failed.size !== 0) {
			//
			await pipe(async function* () {
				yield encode(2, { indices: Array.from(failed) });
			}, stream);
		} else {
			const blob = assembleZipChunks(received);
			handleFileDownload(blob);

			await pipe(async function* () {
				yield encode(1);
			}, stream);
		}
	} catch (error) {
		console.error('Error handling protocol stream:', error);
		// Retry logic or error handling can be added here
		await stream.close();
		await connection.close();
	}
};

const createNode = async () => {
	const node = await createLibp2p(defaultConfig);

	node.handle([PROTOCOL, '/webrtc', '/p2p-circuit'], handleProtocolStream, {
		force: true,
		runOnLimitedConnection: true,
		maxInboundStreams: 100,
		maxOutboundStreams: 100,
	});

	await node.start();
	return node;
};

export { createNode, PROTOCOL, BOOTSTRAP_NODES, WEBRTC_CODE, isWebRTC };
