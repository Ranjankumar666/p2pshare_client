import { createLibp2p } from 'libp2p';
import { defaultConfig } from './libp2pConfig';
import { pipe } from 'it-pipe';

import {
	PROTOCOL,
	BOOTSTRAP_NODES,
	WEBRTC_CODE,
	REMOTE_RELAY_NODE,
} from './constants';
import { convertStreamToFile, handleFileDownload } from './utils';

import { encode } from '../buffer/codec';
import { multiaddr } from '@multiformats/multiaddr';
import FileAssemblyWorker from '../workers/fileCompression.worker';

const isWebRTC = (ma) => ma.protocols().includes(WEBRTC_CODE);

/**
 *
 *
 * @type {import('@libp2p/interface').StreamHandler}
 */
const handleProtocolStream = async ({ connection, stream }) => {
	const received = new Map();
	const failed = new Set();

	try {
		await convertStreamToFile(stream, received, failed);
		if (failed.size !== 0) {
			//
			await pipe(async function* () {
				yield encode(2, { indices: Array.from(failed) });
			}, stream);
		} else {
			// const blob = assembleZipChunks(received);

			const worker = new FileAssemblyWorker();
			const blob = await new Promise((res) => {
				worker.postMessage({
					type: 'assemble',
					data: received,
				});

				worker.onmessage = (ev) => res(ev.data);
			});
			await handleFileDownload(blob);

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

	node.handle([PROTOCOL], handleProtocolStream, {
		force: true,
		runOnLimitedConnection: true,
		maxInboundStreams: 100,
		maxOutboundStreams: 100,
	});

	await node.start();
	await node.dial(multiaddr(REMOTE_RELAY_NODE));
	await waitUntilRelayReservation(node);
	return node;
};

const waitUntilRelayReservation = (
	libp2p,
	timeoutMs = 10000,
	intervalMs = 500
) => {
	return new Promise((resolve, reject) => {
		const start = Date.now();

		const check = () => {
			const addrs = libp2p.getMultiaddrs();
			const hasRelay = addrs.some((addr) =>
				addr.toString().includes('/p2p-circuit')
			);

			if (hasRelay) {
				resolve();
			} else if (Date.now() - start >= timeoutMs) {
				reject(new Error('Timed out waiting for relay reservation'));
			} else {
				setTimeout(check, intervalMs);
			}
		};

		check();
	});
};

export { createNode, PROTOCOL, BOOTSTRAP_NODES, WEBRTC_CODE, isWebRTC };
