import { webRTC } from '@libp2p/webrtc';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { identify } from '@libp2p/identify';
import { webSockets } from '@libp2p/websockets';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { bootstrap } from '@libp2p/bootstrap';
import { autoNAT } from '@libp2p/autonat';
import * as filters from '@libp2p/websockets/filters';
import { ping } from '@libp2p/ping';

import { BOOTSTRAP_NODES } from './constants';

/** @type {import('libp2p').Libp2pInit} */
const defaultConfig = {
	addresses: {
		listen: ['/webrtc', '/p2p-circuit'],
	},
	transports: [
		circuitRelayTransport({
			stopTimeout: 60 * 1000, // Reduced from 120s
			reservationTtl: 2 * 60 * 1000, // 2 minutes
		}),
		webSockets({
			filter: filters.all,
		}),
		webRTC({
			rtcConfiguration: {
				iceServers: [
					{ urls: 'stun:stun.l.google.com:19302' },
					{ urls: 'stun:stun1.l.google.com:19302' },
					{ urls: 'stun:stun2.l.google.com:19302' }, // Add more STUN servers
				],
				iceCandidatePoolSize: 10,
			},
			dataChannel: {
				maxMessageSize: 256 * 1024, // 256KB
				maxBufferedAmount: 16 * 1024 * 1024, // 16MB
				closeTimeout: 30 * 1000, // 30s
				openTimeout: 30 * 1000, // 30s
				bufferedAmountLowEventTimeout: 30 * 1000,
			},
			inboundConnectionTimeout: 60 * 1000, // 60s
		}),
	],
	connectionEncrypters: [noise()],
	streamMuxers: [
		yamux({
			maxInboundStreams: 1000,
			maxOutboundStreams: 1000,
			maxMessageSize: 256 * 1024 * 1024, // 256MB
			enableKeepAlive: true,
			keepAliveInterval: 30000, // 30s keepalive
		}),
	],
	services: {
		ping: ping({
			protocolPrefix: 'ipfs',
			maxInboundStreams: 10,
			maxOutboundStreams: 10,
			timeout: 10000,
		}),
		identify: identify({
			protocolPrefix: 'ipfs',
			timeout: 30000,
			maxInboundStreams: 10,
			maxOutboundStreams: 10,
		}),
		autoNAT: autoNAT({
			protocolPrefix: 'ipfs',
			timeout: 30000,
		}),
	},
	peerDiscovery: [
		bootstrap({
			list: BOOTSTRAP_NODES,
			timeout: 30000,
			tagName: 'bootstrap',
			tagValue: 50,
			tagTTL: 120000,
		}),
	],
	connectionGater: {
		denyDialMultiaddr: () => false,
		denyInboundConnection: () => false,
		denyDialPeer: () => false,
		denyOutboundConnection: () => false,
		denyInboundEncryptedConnection: () => false,
		denyOutboundUpgradedConnection: () => false,
		denyInboundUpgradedConnection: () => false,
	},
	connectionManager: {
		maxConnections: 100,
		minConnections: 5,
		dialTimeout: 30 * 1000,
		maxPeerAddrsToDial: 25,
		maxIncomingPendingConnections: 50,
		maxParallelDials: 10,
		inboundStreamProtocolNegotiationTimeout: 30 * 1000,
		outboundStreamProtocolNegotiationTimeout: 30 * 1000,
		inboundConnectionThreshold: 5,
		autoDialInterval: 10000,
		autoDialMaxQueueLength: 100,
	},
};

export { defaultConfig };
