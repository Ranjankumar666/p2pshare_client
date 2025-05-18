import './App.css';
import { useState, useEffect } from 'react';
import Sender from './sender/Sender';
import Receiver from './receiver/Receiver';
import { createNode } from './node/node';
import { loadWasm } from './wasm/loadWasm';

function App() {
	const [active, setActive] = useState('');
	/** @type {ReturnType<typeof useState<import('libp2p').Libp2p>>} */
	const [node, setNode] = useState();

	useEffect(() => {
		let node = null;
		(async () => {
			await loadWasm();
			node = await createNode();
			console.log('Node id : ', node.peerId.toString());
			console.log(
				'Node id : ',
				node.getMultiaddrs().map((v) => v.toString())
			);

			setNode(node);
		})();

		return () => {
			(async () => {
				if (node) {
					await node.stop();
				}
			})();
		};
	}, []);
	return (
		<div className="App">
			<div className="buttons">
				<button className="btn_send" onClick={() => setActive('Send')}>
					Send
				</button>
				<button
					className="btn_receive"
					onClick={() => setActive('Receive')}
				>
					Receive
				</button>
			</div>
			{active === 'Send' ? (
				<Sender node={node} />
			) : active === '' ? (
				<div />
			) : (
				<Receiver node={node} />
			)}
		</div>
	);
}

export default App;
