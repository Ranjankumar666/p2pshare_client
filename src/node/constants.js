import { protocols, multiaddr } from '@multiformats/multiaddr';

export const PROTOCOL = '/lftp/1.0';
export const WEBRTC_CODE = protocols('webrtc').code;
export const REMOTE_RELAY_NODE =
	process.env.REACT_APP_RELAY_NODE_ADDRESS.split(',');
export const REMOTE_RELAY_NODE_MULTIADD = REMOTE_RELAY_NODE.map((add) =>
	multiaddr(add)
);
export const BOOTSTRAP_NODES = REMOTE_RELAY_NODE;
// export const MULTIADDR_SUFFIX = `${REMOTE_RELAY_NODE[0]}/p2p-circuit/webrtc/p2p/`;
export const RETRY_THRESHOLD = 3;

export const SIGNAL_TIMEOUT = 50000;

export const getRelayedMultiAddr = (peerAdd) => {
	const webRTCMultiAddrs = REMOTE_RELAY_NODE.map((add) =>
		multiaddr(`${add}/p2p-circuit/webrtc/p2p/${peerAdd}`)
	);

	const p2pMultiAddrs = REMOTE_RELAY_NODE.map((add) =>
		multiaddr(`${add}/p2p-circuit/p2p/${peerAdd}`)
	);

	return [...webRTCMultiAddrs, ...p2pMultiAddrs];
};
