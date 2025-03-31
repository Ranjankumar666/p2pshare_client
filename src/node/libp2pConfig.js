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

const defaultConfig = {
	addresses: {
		listen: ['/webrtc', '/p2p-circuit'],
	},
	transports: [
		circuitRelayTransport({
			hop: { enabled: true, active: true },
			advertise: true,
			enabled: true,
			discoveryRelays: 1,
			reservationTTL: 60_000,
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
			},
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
	},
	connectionManager: {
		maxConnections: 50,
		maxParallelDials: 10,
	},
};

export { defaultConfig };
