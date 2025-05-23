import { webRTC } from '@libp2p/webrtc';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { identify } from '@libp2p/identify';
import { webSockets } from '@libp2p/websockets';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { bootstrap } from '@libp2p/bootstrap';
import { autoNAT } from '@libp2p/autonat';
import { ping } from '@libp2p/ping';

import { BOOTSTRAP_NODES } from './constants';
import { dcutr } from '@libp2p/dcutr';

/** @type {import('libp2p').Libp2pInit} */
const defaultConfig = {
	addresses: {
		listen: ['/webrtc', '/p2p-circuit'],
		// announce: ['/webrtc-direct'],
	},
	transports: [
		circuitRelayTransport({
			stopTimeout: 60 * 1000, // Reduced from 120s
			reservationTtl: 2 * 60 * 1000, // 2 minutes
		}),
		webSockets(),
		webRTC({
			rtcConfiguration: {
				iceServers: [
					{ urls: 'stun:stun.l.google.com:19302' },
					{ urls: 'stun:stun1.l.google.com:19302' },
					{ urls: 'stun:stun2.l.google.com:19302' },
					{ urls: 'stun:stun3.l.google.com:19302' },
					{ urls: 'stun:stun4.l.google.com:19302' },
					{ urls: 'stun:stun.ekiga.net' },
					{ urls: 'stun:stun.ideasip.com' },
					{ urls: 'stun:stun.rixtelecom.se' },
					{ urls: 'stun:stun.schlund.de' },
					{ urls: 'stun:stun.stunprotocol.org:3478' },
					{ urls: 'stun:stun.voiparound.com' },
					{ urls: 'stun:stun.voipbuster.com' },
					{ urls: 'stun:stun.voipstunt.com' },
					{ urls: 'stun:stun.voxgratia.org' },
					{ urls: 'stun:23.21.150.121:3478' },
					{ urls: 'stun:iphone-stun.strato-iphone.de:3478' },
					{ urls: 'stun:numb.viagenie.ca:3478' },
					{ urls: 'stun:s1.taraba.net:3478' },
					{ urls: 'stun:s2.taraba.net:3478' },
					{ urls: 'stun:stun.12connect.com:3478' },
					{ urls: 'stun:stun.12voip.com:3478' },
					{ urls: 'stun:stun.1und1.de:3478' },
					{ urls: 'stun:stun.2talk.co.nz:3478' },
					{ urls: 'stun:stun.2talk.com:3478' },
					{ urls: 'stun:stun.3clogic.com:3478' },
					{ urls: 'stun:stun.3cx.com:3478' },
					{ urls: 'stun:stun.a-mm.tv:3478' },
					{ urls: 'stun:stun.aa.net.uk:3478' },
					{ urls: 'stun:stun.acrobits.cz:3478' },
					{ urls: 'stun:stun.actionvoip.com:3478' },
					{ urls: 'stun:stun.advfn.com:3478' },
					{ urls: 'stun:stun.aeta-audio.com:3478' },
					{ urls: 'stun:stun.aeta.com:3478' },
					{ urls: 'stun:stun.alltel.com.au:3478' },
					{ urls: 'stun:stun.altar.com.pl:3478' },
					{ urls: 'stun:stun.annatel.net:3478' },
					{ urls: 'stun:stun.antisip.com:3478' },
					{ urls: 'stun:stun.arbuz.ru:3478' },
					{
						url: 'turn:numb.viagenie.ca',
						credential: 'muazkh',
						username: 'webrtc@live.com',
					},
					{
						url: 'turn:turn.anyfirewall.com:443?transport=tcp',
						credential: 'webrtc',
						username: 'webrtc',
					},
					{
						url: 'turn:turn.bistri.com:80',
						credential: 'homeo',
						username: 'homeo',
					},
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
		dcutr: dcutr(),
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
