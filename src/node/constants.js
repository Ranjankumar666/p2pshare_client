import { protocols } from '@multiformats/multiaddr';

const PROTOCOL = '/lftp/1.0';
const WEBRTC_CODE = protocols('webrtc').code;
const BOOTSTRAP_NODES = [
	'/ip4/127.0.0.1/tcp/8080/ws/p2p/12D3KooWGyib9Hc1uGMW5YEjJFUDAHNT1WC68PGzJuKmoWEtfJjU',
	'/ip4/192.168.68.106/tcp/8080/ws/p2p/12D3KooWGyib9Hc1uGMW5YEjJFUDAHNT1WC68PGzJuKmoWEtfJjU',
	'/p2p-circuit/p2p/12D3KooWGyib9Hc1uGMW5YEjJFUDAHNT1WC68PGzJuKmoWEtfJjU',
];
const RETRY_THRESHOLD = 3;

export { PROTOCOL, WEBRTC_CODE, BOOTSTRAP_NODES, RETRY_THRESHOLD };
