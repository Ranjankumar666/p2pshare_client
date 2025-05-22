import './App.css';
import { useEffect } from 'react';
import Sender from './sender/Sender';
import Receiver from './receiver/Receiver';
import { createNode } from './node/node';
import {
	Box,
	Button,
	Container,
	Grid,
	Group,
	Icon,
	Spinner,
	Tabs,
	Text,
} from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import { delError, setErr, setNode } from './state/stateReducer';
import { MdClose, MdDownload, MdShare } from 'react-icons/md';

function App() {
	const dispatch = useDispatch();
	const node = useSelector((state) => state.node);
	const error = useSelector((state) => state.err);

	// useEffect(() => {
	// 	loadWasm().then(() => {
	// 		console.log('Loaded WASM binaries');
	// 	});
	// }, []);

	useEffect(() => {
		let node = null;
		(async () => {
			try {
				node = await createNode();
				console.log('Registered to Relay');
				dispatch(setNode(node));
			} catch (err) {
				console.error(err);
				dispatch(setErr(err.message));
			}
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
				{error && (
					<Group alignSelf="center" justify="center" paddingY="2">
						<Text color="red.600">
							Error:{' '}
							{error.length > 64
								? error.substring(0, 64) + '....'
								: error}
						</Text>
						<Button
							size="xs"
							onClick={() => dispatch(delError())}
							variant="surface"
						>
							<Icon>
								<MdClose />
							</Icon>
						</Button>
					</Group>
				)}
				{node && (
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
				)}
				{!error && !node && (
					<Box paddingTop={['8', '10', '12', '14']}>
						<Spinner />
					</Box>
				)}
			</Grid>
		</Container>
	);
}

export default App;
