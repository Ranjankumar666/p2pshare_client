import { protocols } from '@multiformats/multiaddr';

const PROTOCOL = '/lftp/1.0';
const WEBRTC_CODE = protocols('webrtc').code;
const BOOTSTRAP_NODES = [
	'/ip4/127.0.0.1/tcp/8080/ws/p2p/12D3KooWJQVFBzUxFeP7bnFh871Cw6Ajkpg5Z1LdwA4ua6uGR8us',
	'/ip4/192.168.68.101/tcp/8080/ws/p2p/12D3KooWJQVFBzUxFeP7bnFh871Cw6Ajkpg5Z1LdwA4ua6uGR8us',
	'/p2p-circuit/p2p/12D3KooWJQVFBzUxFeP7bnFh871Cw6Ajkpg5Z1LdwA4ua6uGR8us',
];
export { PROTOCOL, WEBRTC_CODE, BOOTSTRAP_NODES };
