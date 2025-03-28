import { createLibp2p } from 'libp2p';
import { defaultConfig } from './libp2pConfig';

import { PROTOCOL, BOOTSTRAP_NODES, WEBRTC_CODE } from './constants';
import { convertStreamToFile, handleFileDownload } from './utils';

const isWebRTC = (ma) => ma.protocols().includes(WEBRTC_CODE);

const handleProtocolStream = async ({ stream, connection }) => {
	try {
		const blob = await convertStreamToFile(stream);
		handleFileDownload(blob);
		await stream.close();
		await connection.close();
	} catch (error) {
		console.error('Error handling protocol stream:', error);
		// Retry logic or error handling can be added here
		await stream.close();
		await connection.close();
	}
};

const createNode = async () => {
	const node = await createLibp2p(defaultConfig);

	node.handle([PROTOCOL, '/webrtc', '/p2p-circuit'], handleProtocolStream, {
		force: true,
		runOnLimitedConnection: true,
		maxInboundStreams: 100,
		maxOutboundStreams: 100,
	});

	await node.start();
	return node;
};

export { createNode, PROTOCOL, BOOTSTRAP_NODES, WEBRTC_CODE, isWebRTC };
