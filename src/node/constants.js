import { protocols } from '@multiformats/multiaddr';

const PROTOCOL = '/lftp/1.0';
const WEBRTC_CODE = protocols('webrtc').code;
const BOOTSTRAP_NODES = [
	'/ip4/127.0.0.1/tcp/8080/ws/p2p/12D3KooWQCUopERNKRrx53QyM8jawKiJncbjXyBB5i2Pg7AGwidA',
	'/ip4/192.168.68.104/tcp/8080/ws/p2p/12D3KooWQCUopERNKRrx53QyM8jawKiJncbjXyBB5i2Pg7AGwidA',
	'/p2p-circuit/p2p/12D3KooWQCUopERNKRrx53QyM8jawKiJncbjXyBB5i2Pg7AGwidA',
];
const RETRY_THRESHOLD = 3;
const CHUNK_SIZE = 221 * 1024;

export { PROTOCOL, WEBRTC_CODE, BOOTSTRAP_NODES, RETRY_THRESHOLD, CHUNK_SIZE };
