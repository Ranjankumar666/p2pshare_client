import { protocols } from '@multiformats/multiaddr';

const PROTOCOL = '/lftp/1.0';
const WEBRTC_CODE = protocols('webrtc').code;
const BOOTSTRAP_NODES = [
	'/ip4/127.0.0.1/tcp/8080/ws/p2p/12D3KooWKYcd8Yb2mjiCUoEvPFxAVD1h59v7qSYfRkRNaMXEWUay',
	'/ip4/192.168.0.100/tcp/8080/ws/p2p/12D3KooWKYcd8Yb2mjiCUoEvPFxAVD1h59v7qSYfRkRNaMXEWUay',
	'/p2p-circuit/p2p/12D3KooWKYcd8Yb2mjiCUoEvPFxAVD1h59v7qSYfRkRNaMXEWUay',
];

export { PROTOCOL, WEBRTC_CODE, BOOTSTRAP_NODES };
