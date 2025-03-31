import { useState } from 'react';
import { multiaddr } from '@multiformats/multiaddr';
import { pipe } from 'it-pipe';
import { chunkify, zipFiles } from '../node/utils';
import { encode, decode } from '../buffer/codec';
import { RETRY_THRESHOLD, CHUNK_SIZE } from '../node/constants';

const PROTOCOL = '/lftp/1.0';

/**
 * @type {import('react').FC<{
 *   node: import('@libp2p/interface').Libp2p;}> Sender
 */
const Sender = ({ node }) => {
	const [files, setFiles] = useState({});
	const [peerAdd, setPeerAdd] = useState('');
	const [error, setError] = useState('');
	const [progress, setProgress] = useState(0);
	const [sending, setSending] = useState(false);

	const handleFileChange = (e) => {
		if (!e.target.files) return;
		const { files } = e.target;

		for (let file of files) {
			setFiles((oldState) => {
				const newState = { ...oldState };
				newState[file.name] = file;

				return newState;
			});
		}
	};

	const removeFile = (file) => {
		setFiles((oldState) => {
			const newState = { ...oldState };
			delete newState[file];

			return newState;
		});
	};

	const send = async () => {
		/** @type {import('@libp2p/interface').Connection} */
		let conn;
		/** @type {import('@libp2p/interface').Stream} */
		let stream;
		try {
			setSending(true);
			const fileData = await zipFiles(files);
			const fileSize = fileData.byteLength;

			const { chunks, hashes } = await chunkify(
				fileData,
				fileSize,
				CHUNK_SIZE
			);

			console.log(chunks.length);
			const peerMA = multiaddr(`${peerAdd}`);
			conn = await node.dial(peerMA);

			if (!conn || conn.status !== 'open') {
				return;
			}

			stream = await conn.newStream([PROTOCOL]);
			let sentBytes = 0;

			const stack = chunks.map((_, index) => index);

			const write = async function* () {
				while (stack.length > 0) {
					const index = stack.pop();
					const chunk = chunks[index];
					const hash = hashes[index];

					sentBytes += chunk.length;
					let progress = ((sentBytes / fileSize) * 100).toFixed(2);
					setProgress(progress);
					yield encode(0, { index, hash, chunk });
					await new Promise((res) => setTimeout(res, 200));
				}
			};

			let retries = 0;

			const read = async function (source) {
				for await (const rawChunk of source) {
					const decodedChunk = decode(rawChunk.bufs[0]);

					if (decodedChunk.type === 1) {
						console.log('File sent successfully');
						return;
					}
					console.log('Retrying ----> ', decodedChunk.indices);
					decodedChunk.indices.forEach((idx) => stack.push(idx));
					break;
				}

				if (retries === RETRY_THRESHOLD) return;

				retries += 1;

				if (conn.status === 'closed') {
					conn = await node.dial(peerMA);
					stream = await conn.newStream([PROTOCOL]);
				}

				await pipe(write, stream);
				await pipe(stream, read);
			};

			await pipe(write, stream);
			await pipe(stream, read);
		} catch (error) {
			setError(error.message);
			console.log(error);
		} finally {
			setSending(false);
			setProgress(0);
			await stream.close();
			await conn.close();
		}
	};

	return (
		<div>
			<div className="input-receiver">
				<input
					type="file"
					name="files"
					onChange={handleFileChange}
					multiple
				/>
				<button type="button">Upload</button>
			</div>
			<div className="">
				<input
					type="text"
					value={peerAdd}
					placeholder="Receiver"
					onChange={(e) => setPeerAdd(e.target.value)}
				/>
			</div>
			<div className="">
				{Object.entries(files).map(([key, file], id) => (
					<div className="" key={files.length + id + key}>
						<li>{file.name}</li>
						<button onClick={() => removeFile(key)}>X</button>
					</div>
				))}
			</div>
			<button type="button" onClick={send} disabled={!files || !peerAdd}>
				Send
			</button>
			{/* {sending && 'Sending......'} */}
			{sending && `File sent ---> ${progress} %`}
			{error && error}
		</div>
	);
};

export default Sender;
