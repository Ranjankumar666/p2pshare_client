import { createLibp2p } from 'libp2p';
import { defaultConfig } from './libp2pConfig';
import { pipe } from 'it-pipe';

import { PROTOCOL, WEBRTC_CODE, REMOTE_RELAY_NODE_MULTIADD } from './constants';
import { convertStreamToFile } from './utils';

import { encode, END, START } from '../buffer/codec';
import { store } from '../state/store';
import { setStartDownload } from '../state/stateReducer';

export const isWebRTC = (ma) => ma.protocols().includes(WEBRTC_CODE);
const received = new Map();
const failed = new Set();
/**
 *
 *
 * @type {import('@libp2p/interface').StreamHandler}
 */
const handleProtocolStream = async ({ connection, stream }) => {
	try {
		const [type, indexFailed] = await convertStreamToFile(
			stream,
			received,
			failed
		);
		if (indexFailed) {
			//
			await pipe(async function* () {
				yield encode(2, { indices: [indexFailed] });
			}, stream);
		} else {
			if (type === END) {
				store.dispatch(setStartDownload(false));
			} else if (type === START) {
				store.dispatch(setStartDownload(true));
			} else {
				await pipe(async function* () {
					yield encode(1);
				}, stream);
			}
		}
	} catch (error) {
		console.error('Error handling protocol stream:', error);
		// Retry logic or error handling can be added here
		await stream.close();
		await connection.close();
	}
};

export const createNode = async () => {
	const node = await createLibp2p(defaultConfig);

	node.handle([PROTOCOL], handleProtocolStream, {
		force: true,
		runOnLimitedConnection: true,
		maxInboundStreams: 10000,
		maxOutboundStreams: 10000,
	});

	await node.start();
	console.log(REMOTE_RELAY_NODE_MULTIADD);

	for (let multiAddr of REMOTE_RELAY_NODE_MULTIADD) {
		await node.dial(multiAddr, {
			onProgress: (evt) => {
				console.log(evt.type);
			},
		});
	}

	await waitUntilRelayReservation(node);

	console.log(node.getMultiaddrs());
	return node;
};

/**
 *
 *
 * @param {import('@libp2p/interface').Libp2p} node
 * @param {import('@multiformats/multiaddr').Multiaddr} peerMA
 * @returns {Promise<import('@libp2p/interface').Stream>}
 */
export const dialProtocol = async (node, peerMA) => {
	return await node.dialProtocol(peerMA, [PROTOCOL], {
		runOnLimitedConnection: true,
	});
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
