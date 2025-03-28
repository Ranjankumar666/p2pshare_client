import { protocols } from '@multiformats/multiaddr';

const PROTOCOL = '/lftp/1.0';
const WEBRTC_CODE = protocols('webrtc').code;
const BOOTSTRAP_NODES = [
	'/ip4/127.0.0.1/tcp/8080/ws/p2p/12D3KooWCeQoiXqhDoZgB1U4P3GUuQ9GRBcng9B5FEhLYuMdr8n7',
	'/ip4/192.168.68.105/tcp/8080/ws/p2p/12D3KooWCeQoiXqhDoZgB1U4P3GUuQ9GRBcng9B5FEhLYuMdr8n7',
	'/p2p-circuit/p2p/12D3KooWCeQoiXqhDoZgB1U4P3GUuQ9GRBcng9B5FEhLYuMdr8n7',
];

export { PROTOCOL, WEBRTC_CODE, BOOTSTRAP_NODES };
