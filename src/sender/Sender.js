import { useState } from 'react';
import JSZip from 'jszip';
import { multiaddr } from '@multiformats/multiaddr';
import { pipe } from 'it-pipe';
import { hashChunk } from '../integrity/fileIntegrity';
import { encode } from '../node/utils';

const PROTOCOL = '/lftp/1.0';

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

	const zipFiles = async () => {
		const zip = new JSZip();

		Object.values(files).forEach(async (file) => {
			zip.file(file.name, file, {
				binary: true,
			});
		});

		const fileData = await zip.generateAsync({
			type: 'uint8array',
			compression: 'DEFLATE',
			compressionOptions: {
				level: 9,
			},
		});

		return fileData;
	};

	const send = async () => {
		let conn;
		let stream;
		try {
			setSending(true);
			const fileData = await zipFiles();
			const fileSize = fileData.byteLength;
			// const sentPackets = new Map();

			const chunkSize = 10 * 1024;
			const chunks = [];

			let offset = 0;
			let index = 0;
			while (offset < fileSize) {
				const slice = [index, offset, offset + chunkSize];
				chunks.push(slice);
				offset += chunkSize;
				index += 1;
			}

			const peerMA = multiaddr(`${peerAdd}`);
			const controller = new AbortController();
			const signal = controller.signal;
			conn = await node.dial(peerMA, { signal });

			if (!conn || conn.status !== 'open') {
				return;
			}
			stream = await conn.newStream([PROTOCOL]);
			let sentBytes = 0;

			const stack = [...chunks];

			const trackerPercentage = async function* () {
				while (stack.length > 0) {
					const [index, start, end] = stack.pop();
					const chunk = fileData.slice(start, end);
					const hash = await hashChunk(chunk);

					sentBytes += chunk.length;
					let progress = ((sentBytes / fileSize) * 100).toFixed(2);
					setProgress(progress);
					yield encode(index, hash, chunk);
					await new Promise((res) => setTimeout(res, 100));
				}
			};
			await pipe(trackerPercentage, stream.sink);
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
					<div className="">
						<li key={files.length + id + key}>{file.name}</li>
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
