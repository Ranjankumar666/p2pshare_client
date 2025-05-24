import { createLibp2p } from 'libp2p';
import { defaultConfig } from './libp2pConfig';
import { pipe } from 'it-pipe';

import {
	PROTOCOL,
	WEBRTC_CODE,
	REMOTE_RELAY_NODE_MULTIADD,
	SIGNAL_TIMEOUT,
} from './constants';
import { convertStreamToFile } from './utils';

import { encode, END, EOF, START } from '../buffer/codec';
import { store } from '../state/store';
import { setStartDownload } from '../state/stateReducer';
import { debugWebRTCConnections, setupConnectionDebugging } from './debug';

export const isWebRTC = (ma) => ma.protocols().includes(WEBRTC_CODE);
const received = new Map();
const failed = new Set();

/**
 *
 *
 * @type {import('@libp2p/interface').StreamHandler}
 */
const handleProtocolStream = async ({ connection, stream }) => {
	const peerId = connection.remotePeer.toString();
	try {
		const [type, indexFailed, file] = await convertStreamToFile(
			peerId,
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
			} else if (type === EOF) {
				for (let index in received.get(peerId).get(file)) {
					received.get(peerId).get(file).set(index, null);
				}

				received.get(peerId).set(file, null);
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
		store.dispatch(setStartDownload(false));
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
		maxInboundStreams: 5096,
		maxOutboundStreams: 5096,
	});

	await node.start();
	console.log(REMOTE_RELAY_NODE_MULTIADD);

	await node.dial(REMOTE_RELAY_NODE_MULTIADD, {
		signal: AbortSignal.timeout(SIGNAL_TIMEOUT),
		force: true,
	});

	await waitUntilRelayReservation(node);

	if (process.env.REACT_APP_DEBUG === 'true') {
		setupConnectionDebugging(node);
		setupConnectionDebugging(node);
		debugWebRTCConnections(node);
	}

	console.log(node.getMultiaddrs());
	return node;
};

/**
 *
 *
 * @param {import('@libp2p/interface').Connection} conn
 * @param {import('@multiformats/multiaddr').Multiaddr} peerMA
 * @returns {Promise<import('@libp2p/interface').Stream>}
 */
export const dialProtocol = async (conn, peerMA) => {
	return await conn.newStream([PROTOCOL], {
		runOnLimitedConnection: true,
		maxOutboundStreams: 10000,
		negotiateFully: true,
		signal: AbortSignal.timeout(SIGNAL_TIMEOUT),
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
