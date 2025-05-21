import { webRTC } from '@libp2p/webrtc';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { identify } from '@libp2p/identify';
import { webSockets } from '@libp2p/websockets';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { bootstrap } from '@libp2p/bootstrap';
import { autoNAT } from '@libp2p/autonat';
import * as filters from '@libp2p/websockets/filters';

import { BOOTSTRAP_NODES } from './constants';
import { ping } from '@libp2p/ping';

/** @type {import('libp2p').Libp2pInit} */
const defaultConfig = {
	addresses: {
		listen: ['/webrtc', '/p2p-circuit'],
	},
	transports: [
		circuitRelayTransport({
			stopTimeout: 120 * 1000,
		}),
		// tcp(),
		webSockets({
			filter: filters.all,
		}),
		webRTC({
			rtcConfiguration: {
				iceServers: [
					{ urls: 'stun:stun.l.google.com:19302' },
					{ urls: 'stun:stun1.l.google.com:19302' },
				],
			},
			dataChannel: {
				maxMessageSize: 256 * 1024,
				maxBufferedAmount: 32 * 1024 * 1024,
				closeTimeout: 30 * 1000,
				openTimeout: 30 * 1000,
				bufferedAmountLowEventTimeout: 60 * 1000,
			},
			inboundConnectionTimeout: 240 * 1000,
		}),
	],
	connectionEncrypters: [noise()],
	streamMuxers: [
		yamux({
			maxInboundStreams: 2048,
			maxOutboundStreams: 2048,
			maxMessageSize: 1024 * 1024 * 1024 * 16,
			// maxStreamWindowSize
		}),
	],
	services: {
		ping: ping(),
		identify: identify(),
		autoNAT: autoNAT(),
	},
	peerDiscovery: [
		bootstrap({
			list: BOOTSTRAP_NODES,
		}),
	],
	connectionGater: {
		denyDialMultiaddr: () => false, // Relax security for testing
		denyInboundConnection: () => false,
		denyDialPeer: () => false,
		denyOutboundConnection: () => false,
		denyInboundEncryptedConnection: () => false,
		denyOutboundUpgradedConnection: () => false,
		denyInboundUpgradedConnection: () => false,
	},
	connectionManager: {
		maxConnections: 10000000,
		dialTimeout: 120 * 1000,
		maxPeerAddrsToDial: 10000000,
		maxIncomingPendingConnections: 1000000,
		maxParallelDials: 10000000,
		inboundStreamProtocolNegotiationTimeout: 30 * 1000,
		inboundConnectionThreshold: 10000,
		outboundStreamProtocolNegotiationTimeout: 30 * 1000,
	},
};

export { defaultConfig };
