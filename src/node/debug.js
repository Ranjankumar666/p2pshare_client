// Add this debugging code after creating your libp2p node

/**
 *
 * @param {import("@libp2p/interface").Libp2p} node
 */
// Add this debugging code after creating your libp2p node

export function setupConnectionDebugging(node) {
	// Connection lifecycle events
	node.addEventListener('connection:open', (evt) => {
		const connection = evt.detail;
		const peerId = connection.remotePeer.toString();
		const multiaddrs = connection.remoteAddr?.toString() || 'unknown';
		console.log(`🟢 Connection opened with ${peerId}`);
		console.log(`   Address: ${multiaddrs}`);
		console.log(`   Status: ${connection.status}`);
	});

	node.addEventListener('connection:close', (evt) => {
		const connection = evt.detail;
		const peerId = connection.remotePeer.toString();
		console.log(`🔴 Connection closed with ${peerId}`);
		console.log(`   Final status: ${connection.status}`);
	});

	node.addEventListener('peer:connect', (evt) => {
		console.log(`✅ Peer connected: ${evt.detail.toString()}`);
	});

	node.addEventListener('peer:disconnect', (evt) => {
		console.log(`❌ Peer disconnected: ${evt.detail.toString()}`);
	});

	// Monitor connection status periodically
	setInterval(() => {
		const connections = node.getConnections();
		console.log(`📊 Active connections: ${connections.length}`);

		connections.forEach((conn, index) => {
			const peerId = conn.remotePeer.toString();
			const status = conn.status;
			const remoteAddr = conn.remoteAddr?.toString() || 'unknown';
			const isWebRTC = remoteAddr.includes('/webrtc');

			console.log(
				`  ${index + 1}. ${peerId.slice(0, 12)}... - ${status}`
			);
			console.log(`     Address: ${remoteAddr}`);
			console.log(`     WebRTC: ${isWebRTC ? 'Yes' : 'No'}`);

			// Check connection stats
			try {
				const timeline = conn.timeline;
				console.log(
					`     Timeline: open=${timeline.open}, upgraded=${timeline.upgraded}`
				);
			} catch (e) {
				console.log(
					`     ⚠️ Error getting connection timeline: ${e.message}`
				);
			}
		});
	}, 10000); // Every 10 seconds

	// Listen for stream events
	node.addEventListener('stream:inbound', (evt) => {
		console.log(`📥 Inbound stream: ${evt.detail.protocol}`);
	});

	node.addEventListener('stream:outbound', (evt) => {
		console.log(`📤 Outbound stream: ${evt.detail.protocol}`);
	});

	// Error handling
	node.addEventListener('error', (evt) => {
		console.error(`🚨 LibP2P Error:`, evt.detail);
	});
}

// Usage example:
// const node = await createLibp2p(defaultConfig);
// setupConnectionDebugging(node);
// await node.start();
// Usage example:
// const node = await createLibp2p(defaultConfig);
// setupConnectionDebugging(node);
// await node.start();

// WebRTC-specific debugging functions

export function debugWebRTCConnections(node) {
	// Track connection attempts
	const connectionAttempts = new Map();

	// Monitor dial attempts
	node.addEventListener('peer:discovery', (evt) => {
		const peerId = evt.detail.id.toString();
		console.log(`🔍 Discovered peer: ${peerId.slice(0, 12)}...`);

		evt.detail.multiaddrs.forEach((addr) => {
			console.log(`   Address: ${addr.toString()}`);
		});
	});

	// Track dial events
	const originalDial = node.dial.bind(node);
	node.dial = async (peer, options) => {
		const peerId = typeof peer === 'string' ? peer : peer.toString();
		console.log(`📞 Attempting to dial: ${peerId.slice(0, 12)}...`);

		try {
			const connection = await originalDial(peer, options);
			console.log(`✅ Dial successful: ${peerId.slice(0, 12)}...`);

			// Monitor this connection specifically
			monitorConnection(connection);

			return connection;
		} catch (error) {
			console.error(
				`❌ Dial failed: ${peerId.slice(0, 12)}... - ${error.message}`
			);
			throw error;
		}
	};

	// Monitor individual connections
	function monitorConnection(connection) {
		const peerId = connection.remotePeer.toString();
		const shortId = peerId.slice(0, 12);

		console.log(`🔬 Monitoring connection: ${shortId}...`);
		console.log(`   Status: ${connection.status}`);
		console.log(`   Remote address: ${connection.remoteAddr}`);

		// Check if it's WebRTC
		const isWebRTC = connection.remoteAddr.toString().includes('/webrtc');
		if (isWebRTC) {
			console.log(`🌐 WebRTC connection detected for ${shortId}...`);

			// Monitor connection state changes
			const checkInterval = setInterval(() => {
				if (connection.status === 'closed') {
					console.log(
						`🔴 WebRTC connection closed for ${shortId}...`
					);
					clearInterval(checkInterval);
					return;
				}

				console.log(
					`📊 WebRTC status for ${shortId}...: ${connection.status}`
				);
			}, 10000);

			// Set a timeout to clear interval if connection stays alive
			setTimeout(() => {
				clearInterval(checkInterval);
			}, 120000); // Clear after 2 minutes
		}
	}

	// Listen for stream errors which might indicate connection issues
	node.addEventListener('stream:error', (evt) => {
		console.error(`🚨 Stream error:`, evt.detail);
	});

	// Check for transport manager events (if available)
	try {
		const transportManager = node.components?.transportManager;
		if (transportManager) {
			transportManager.addEventListener('transport:error', (evt) => {
				console.error(`🚨 Transport error:`, evt.detail);
			});
		}
	} catch (e) {
		console.log('Transport manager events not available');
	}
}

// Function to test WebRTC connectivity
export async function testWebRTCConnectivity(node, targetPeerId) {
	console.log(
		`🧪 Testing WebRTC connectivity to ${targetPeerId.slice(0, 12)}...`
	);

	try {
		// First try to connect
		const connection = await node.dial(targetPeerId);
		console.log(`✅ Initial connection successful`);

		// Try to open a stream
		const stream = await connection.newStream('/ping/1.0.0');
		console.log(`✅ Stream opened successfully`);

		// Close the stream
		await stream.close();
		console.log(`✅ Stream closed successfully`);

		// Check if connection is still alive
		setTimeout(() => {
			console.log(`📊 Connection status after 10s: ${connection.status}`);
		}, 10000);

		return connection;
	} catch (error) {
		console.error(`❌ WebRTC connectivity test failed: ${error.message}`);
		console.error(`Error details:`, error);
		throw error;
	}
}

// Function to check peer connectivity via different transports
export async function checkTransportConnectivity(node, peerId) {
	const peer = await node.peerStore.get(peerId);
	const addresses = peer.addresses;

	console.log(
		`🔍 Checking transport connectivity for ${peerId.slice(0, 12)}...`
	);

	for (const addr of addresses) {
		const multiaddr = addr.multiaddr.toString();
		console.log(`🚀 Trying address: ${multiaddr}`);

		try {
			const connection = await node.dial(multiaddr);
			console.log(`✅ Connected via: ${multiaddr}`);

			// Test the connection with a ping
			try {
				await node.services.ping.ping(connection.remotePeer);
				console.log(`✅ Ping successful via: ${multiaddr}`);
			} catch (pingError) {
				console.log(
					`⚠️ Ping failed via: ${multiaddr} - ${pingError.message}`
				);
			}

			return connection;
		} catch (error) {
			console.log(
				`❌ Failed to connect via: ${multiaddr} - ${error.message}`
			);
		}
	}

	throw new Error(`Could not connect to peer ${peerId} via any transport`);
}
