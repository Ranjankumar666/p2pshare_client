import { createLibp2p } from 'libp2p';
import { pipe } from 'it-pipe';
import { defaultConfig } from './libp2pConfig';

import { PROTOCOL, BOOTSTRAP_NODES, WEBRTC_CODE } from './constants';

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

const isWebRTC = (ma) => ma.protocols().includes(WEBRTC_CODE);

const handleProtocolStream = async ({ stream, connection }) => {
	console.log(stream);
	try {
		// 🛠️ Create a stream that will be consumed by the browser
		const readableStream = new ReadableStream({
			async start(controller) {
				await pipe(stream, async function process(source) {
					for await (const chunk of source) {
						if (!(chunk.bufs[0] instanceof Uint8Array)) {
							console.error(
								'Received non-Uint8Array chunk:',
								chunk
							);
							continue;
						}
						controller.enqueue(chunk.bufs[0]);
					}
					controller.close();
				});
			},
		});

		// Trigger download
		const response = new Response(readableStream);
		const url = URL.createObjectURL(await response.blob());
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `file-${Date.now()}.zip`;
		document.body.appendChild(anchor);
		anchor.click();

		// Cleanup
		requestAnimationFrame(() => {
			document.body.removeChild(anchor);
			URL.revokeObjectURL(url);
		});
	} catch (error) {
		console.error('Error handling protocol stream:', error);
		// Retry logic or error handling can be added here
	} finally {
		await stream.close();
		await connection.close();
	}
};

export { createNode, PROTOCOL, BOOTSTRAP_NODES, WEBRTC_CODE, isWebRTC };
