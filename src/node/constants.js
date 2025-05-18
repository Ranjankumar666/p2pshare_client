import { protocols } from '@multiformats/multiaddr';

const PROTOCOL = '/lftp/1.0';
const WEBRTC_CODE = protocols('webrtc').code;
const REMOTE_RELAY_NODE =
	'/dns4/p2pshare-relay.onrender.com/tcp/443/wss/p2p/12D3KooWJsdceTSoGhdJfVVnnAkzA3tJGMfPMhcfZtcsUw9vwszn';
const BOOTSTRAP_NODES = [REMOTE_RELAY_NODE];
const MULTIADDR_SUFFIX = `${REMOTE_RELAY_NODE}/p2p-circuit/webrtc/p2p/`;
const RETRY_THRESHOLD = 3;
const CHUNK_SIZE = 221 * 1024;

export {
	PROTOCOL,
	WEBRTC_CODE,
	BOOTSTRAP_NODES,
	RETRY_THRESHOLD,
	CHUNK_SIZE,
	REMOTE_RELAY_NODE,
	MULTIADDR_SUFFIX,
};
