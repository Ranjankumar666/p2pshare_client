import './App.css';
import { useState, useEffect } from 'react';
import Sender from './sender/Sender';
import Receiver from './receiver/Receiver';
import { createNode } from './node/node';
import { loadWasm } from './wasm/loadWasm';
import { Button, ButtonGroup, Center, Container, Icon } from '@chakra-ui/react';
import { useDispatch } from 'react-redux';
import { setNode } from './state/stateReducer';
import { MdDownload, MdShare } from 'react-icons/md';

function App() {
	const [active, setActive] = useState('');
	const dispatch = useDispatch();

	const MainComp = (
		<>
			<ButtonGroup className="buttons" padding={'5'} align="center">
				<Button
					className="btn_send"
					size="xs"
					onClick={() => setActive('Send')}
					variant="surface"
				>
					Share
					<Icon>
						<MdShare />
					</Icon>
				</Button>
				<Button
					className="btn_receive"
					size="xs"
					onClick={() => setActive('Receive')}
					variant="surface"
				>
					Receive
					<Icon>
						<MdDownload />
					</Icon>
				</Button>
			</ButtonGroup>
			{active === 'Send' ? (
				<Sender />
			) : active === '' ? (
				<div />
			) : (
				<Receiver />
			)}
		</>
	);

	useEffect(() => {
		(async () => await loadWasm())();
	}, []);
	useEffect(() => {
		let node = null;
		(async () => {
			node = await createNode();
			console.log('Node id : ', node.peerId.toString());

			dispatch(setNode(node));
		})();

		return () => {
			(async () => {
				if (node) {
					await node.stop();
				}
			})();
		};
	}, [dispatch]);

	return (
		<Container
			width="100vw"
			height="100vh"
			centerContent="true"
			margin="0"
			padding="0"
			fluid="true"
		>
			<Center
				margin="auto"
				padding="5"
				boxShadow="0 0 8px rgba(255, 255, 255, 0.04)"
			>
				{MainComp}
			</Center>
		</Container>
	);
}

export default App;
