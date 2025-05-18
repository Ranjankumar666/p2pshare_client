import './App.css';
import { useEffect } from 'react';
import Sender from './sender/Sender';
import Receiver from './receiver/Receiver';
import { createNode } from './node/node';
import { loadWasm } from './wasm/loadWasm';
import { Box, Container, Grid, Icon, Spinner, Tabs } from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import { setNode } from './state/stateReducer';
import { MdDownload, MdShare } from 'react-icons/md';
import { multiaddr } from '@multiformats/multiaddr';
import { REMOTE_RELAY_NODE } from './node/constants';

function App() {
	const dispatch = useDispatch();
	const node = useSelector((state) => state.node);

	useEffect(() => {
		loadWasm().then(() => {
			console.log('Loaded WASM binaries');
		});
	}, []);

	useEffect(() => {
		let node = null;
		(async () => {
			node = await createNode();
			await node.dial(multiaddr(REMOTE_RELAY_NODE));
			console.log('Registered to Relay');
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
			<Grid
				margin="auto"
				paddingX={['6', '8', '10', '12']}
				paddingBottom={['8', '10', '12', '14']}
				// paddingBottom={['10', '12', '14', '16']}
				boxShadow="0 0 8px rgba(255, 255, 255, 0.04)"
				borderRadius="2xl"
			>
				{node ? (
					<Tabs.Root
						fitted
						defaultValue="Share"
						size="lg"
						width="full"
					>
						<Tabs.List>
							<Tabs.Trigger value="Share">
								Share
								<Icon>
									<MdShare />
								</Icon>
							</Tabs.Trigger>
							<Tabs.Trigger value="Receive">
								Receive
								<Icon>
									<MdDownload />
								</Icon>
							</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="Share">
							<Sender />
						</Tabs.Content>
						<Tabs.Content value="Receive">
							<Receiver />
						</Tabs.Content>
					</Tabs.Root>
				) : (
					<Box paddingTop={['8', '10', '12', '14']}>
						<Spinner />
					</Box>
				)}
			</Grid>
		</Container>
	);
}

export default App;
