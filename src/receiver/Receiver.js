import { useEffect, useState } from 'react';
import {
	Input,
	Clipboard,
	Button,
	Heading,
	Group,
	Stack,
	Spinner,
	ProgressCircle,
	Text,
} from '@chakra-ui/react';
import { useSelector } from 'react-redux';

/**
 * @type {import('react').FC<{
 *   node: import('@libp2p/interface').Libp2p;}> Receiver
 */
const Receiver = () => {
	const node = useSelector((state) => state.node);
	const startedDownload = useSelector((state) => state.startedDownload);

	const [addresses, setAddresses] = useState();

	useEffect(() => {
		setAddresses([node?.peerId.toString()]);
	}, [node]);

	const MainComp = (
		<Stack align="center">
			{/* <div className=""> */}
			<Heading
				size={['sm', 'md', 'lg', 'lg']}
				textWrap="true"
				color="fg.subtle"
			>
				Share to download files
			</Heading>
			{/* </div> */}
			{/* <Grid alignItems="center"> */}
			{addresses && addresses.length ? (
				addresses.map((address, i) => (
					<Group key={i + address}>
						<Input
							type="text"
							value={address}
							readOnly
							size="xs"
							paddingY="4"
						/>

						<Clipboard.Root value={address}>
							<Clipboard.Trigger asChild>
								<Button variant="surface" size="xs">
									<Clipboard.Indicator />
									<Clipboard.CopyText />
								</Button>
							</Clipboard.Trigger>
						</Clipboard.Root>
					</Group>
				))
			) : (
				<Group justify="center">
					<Spinner size="md" />
				</Group>
			)}
			{/* </Grid> */}
			{startedDownload && (
				<>
					<ProgressCircle.Root value={null} size="xs">
						<ProgressCircle.Circle>
							<ProgressCircle.Track />
							<ProgressCircle.Range strokeLinecap="round" />
						</ProgressCircle.Circle>
					</ProgressCircle.Root>
					<Text size="md">Downloading</Text>
				</>
			)}
		</Stack>
	);

	return <>{addresses ? MainComp : <Spinner />}</>;
};

export default Receiver;
