import { useState } from 'react';
import { WEBRTC_CODE } from '../node/node';

const Receive = ({ node }) => {
	// const [node, setNode] = useState();
	const [addresses] = useState(
		node
			.getMultiaddrs()
			.filter((addr) => addr.protoCodes().includes(WEBRTC_CODE))
			.map((add) => add.toString())
	);
	const [downloading] = useState(false);

	return (
		<div className="">
			<div className="">
				<div className="">
					Your addresses ,Share one with receiver to download files
				</div>
				{addresses.map((address, i) => (
					<input type="text" value={address} key={i} readOnly />
				))}
				<div className="">
					Peer ID
					<input
						type="text"
						name=""
						id=""
						value={node.peerId.toString()}
						readOnly
					/>
				</div>
			</div>
			{downloading && 'Downloading......'}
		</div>
	);
};

export default Receive;
