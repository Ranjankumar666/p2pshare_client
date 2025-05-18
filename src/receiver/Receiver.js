import { useEffect, useState } from 'react';
import { WEBRTC_CODE } from '../node/node';
import {
	Input,
	Clipboard,
	Button,
	Heading,
	Group,
	Stack,
	Spinner,
} from '@chakra-ui/react';
import { useSelector } from 'react-redux';

/**
 * @type {import('react').FC<{
 *   node: import('@libp2p/interface').Libp2p;}> Receiver
 */
const Receiver = () => {
	const node = useSelector((state) => state.node);
	const [addresses, setAddresses] = useState();
	const [downloading] = useState(false);

	useEffect(() => {
		setAddresses(
			node
				?.getMultiaddrs()
				.filter((addr) => addr.protoCodes().includes(WEBRTC_CODE))
				.map((add) => add.toString())
		);
	}, [node]);

	const MainComp = (
		<Stack>
			{/* <div className=""> */}
			<Heading size={['sm', 'md', 'lg', 'xl']} textWrap="true">
				Copy address and share to download files
			</Heading>
			{/* </div> */}
			{/* <Grid alignItems="center"> */}
			{addresses && addresses.length ? (
				addresses.map((address, i) => (
					<Group key={address}>
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
			{downloading && 'Downloading......'}
		</Stack>
	);

	return <>{addresses ? MainComp : <Spinner />}</>;
};

export default Receiver;
