import { useEffect, useRef, useState } from 'react';
import { multiaddr } from '@multiformats/multiaddr';
import { pipe } from 'it-pipe';
import { chunkify } from '../node/utils';
import { encode, decode } from '../buffer/codec';
import { RETRY_THRESHOLD, CHUNK_SIZE } from '../node/constants';
import {
	Input,
	Button,
	Group,
	Text,
	Stack,
	ProgressCircle,
	ButtonGroup,
	Icon,
} from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { MdOutlineRemoveCircleOutline, MdSend } from 'react-icons/md';

const PROTOCOL = '/lftp/1.0';

/**
 * @type {import('react').FC<{
 *   node: import('@libp2p/interface').Libp2p;}> Sender
 */
const Sender = () => {
	const [files, setFiles] = useState({});
	const [peerAdd, setPeerAdd] = useState('');
	const [error, setError] = useState({});
	const [progress, setProgress] = useState({});
	const [sending, setSending] = useState({});
	const zipFileWasmRef = useRef();
	const node = useSelector((state) => state.node);

	useEffect(() => {
		zipFileWasmRef.current = window.zipFileWASM;
		console.log(node);
	}, [node]);

	const handleFileChange = (e) => {
		if (!e.target.files) return;
		const { files } = e.target;

		for (let file of files) {
			if (files[file.name]) continue;
			setFiles((oldState) => {
				const newState = { ...oldState };
				newState[file.name] = file;

				return newState;
			});

			setProgress((oldState) => {
				const newState = { ...oldState };
				newState[file.name] = 0;

				return newState;
			});

			setError((oldState) => {
				const newState = { ...oldState };
				const keyObj = { ...oldState[file.name] };
				keyObj.state = false;
				keyObj.msg = '';

				newState[file.name] = keyObj;

				return newState;
			});

			setSending((oldState) => {
				const newState = { ...oldState };
				newState[file.name] = false;
				return newState;
			});
		}
	};

	const removeFile = (file) => {
		const del = (oldState) => {
			const newState = { ...oldState };
			delete newState[file];

			return newState;
		};
		setFiles(del);

		setProgress(del);

		setError(del);

		setSending(del);
	};

	const sendOneFile = async (fileName, bytefiles, peerMA) => {
		const singleFile = {};
		const arrayBuf = await bytefiles[fileName].arrayBuffer();
		singleFile[fileName] = new Uint8Array(arrayBuf);

		const fileData = zipFileWasmRef.current(singleFile);
		// const fileData = await zipFiles(singleFile);
		console.log(fileData);
		const fileSize = fileData.byteLength;
		const { chunks, hashes } = await chunkify(
			fileData,
			fileSize,
			CHUNK_SIZE
		);

		let stream = await node.dialProtocol(peerMA, [PROTOCOL]);
		let sentBytes = 0;
		let retries = 0;

		const stack = chunks.map((_, index) => index);

		const write = async function* () {
			while (stack.length > 0) {
				const index = stack.pop();
				const chunk = chunks[index];
				const hash = hashes[index];

				sentBytes += chunk.length;
				setProgress((oldState) => {
					const newState = { ...oldState };
					newState[fileName] = ((sentBytes / fileSize) * 100).toFixed(
						2
					);

					return newState;
				});
				yield encode(0, { index, hash, chunk });

				await new Promise((res) => setTimeout(res, 100));
			}
		};

		const read = async function (source) {
			for await (const rawChunk of source) {
				const decodedChunk = decode(rawChunk.bufs[0]);

				if (decodedChunk.type === 1) {
					console.log(`✅ File ${fileName} sent successfully`);
					return;
				}

				console.log(
					`🔁 Retry requested for ${fileName}:`,
					decodedChunk.indices
				);
				decodedChunk.indices.forEach((idx) => stack.push(idx));
				break;
			}

			if (++retries > RETRY_THRESHOLD) {
				console.warn(`⚠️ Retry threshold exceeded for ${fileName}`);
				return;
			}

			stream = await node.dialProtocol(peerMA, [PROTOCOL]);
			await pipe(write, stream);
			await pipe(stream, read);
		};

		await pipe(write, stream);
		await pipe(stream, read);
		await stream.close();
	};

	const send = async (fileNameKey) => {
		setSending((oldState) => {
			const newState = { ...oldState };
			newState[fileNameKey] = true;
			return newState;
		});

		try {
			const peerMA = multiaddr(`${peerAdd}`);

			// Convert all files to Uint8Arrays
			// for (let fileName in files) {
			// 	const arrayBuffer = await files[fileName].arrayBuffer();
			// 	bytefiles[fileName] = new Uint8Array(arrayBuffer);
			// }

			// Loop through each file individually
			if (fileNameKey) {
				// await sendOneFile(fileNameKey, files, peerMA);
				await sendOneFile(fileNameKey, files, peerMA);
			}
		} catch (error) {
			setError((oldState) => {
				const newState = { ...oldState };
				const keyObj = { ...oldState[fileNameKey] };
				keyObj.state = true;
				keyObj.msg = error.message;

				newState[fileNameKey] = keyObj;

				return newState;
			});
			console.error(error);
		} finally {
			setSending((oldState) => {
				const newState = { ...oldState };
				newState[fileNameKey] = false;
				return newState;
			});
			setProgress((oldState) => {
				const newState = { ...oldState };
				newState[fileNameKey] = 0;

				return newState;
			});
		}
	};

	return (
		<Stack>
			<Input
				type="text"
				value={peerAdd}
				placeholder="Paste Receiver Address...."
				onChange={(e) => setPeerAdd(e.target.value)}
				padding="4"
				size="xs"
			/>
			<Group className="">
				<Input
					type="file"
					name="files"
					onChange={handleFileChange}
					multiple
					className="input-receiver"
					size="xs"
				/>

				<Button
					size="xs"
					onClick={async () => {
						const promiseArray = Object.keys(files).map((file) =>
							send(file)
						);
						await Promise.all(promiseArray);
					}}
					variant="surface"
				>
					Send
					<Icon>
						<MdSend />
					</Icon>
				</Button>
			</Group>

			<Stack paddingTop="8">
				{Object.entries(files).map(([key, file], id) => (
					<Group
						className=""
						key={files.length + id + key}
						border="yellow"
					>
						<Input value={file.name} readOnly size="xs"></Input>

						{sending[key] ? (
							<ProgressCircle.Root
								value={progress[key]}
								size="md"
							>
								<ProgressCircle.Circle>
									<ProgressCircle.Track />
									<ProgressCircle.Range strokeLinecap="round" />
								</ProgressCircle.Circle>
							</ProgressCircle.Root>
						) : (
							<ButtonGroup>
								<Button
									size="xs"
									onClick={() => removeFile(key)}
									variant="surface"
								>
									Remove
									<Icon>
										<MdOutlineRemoveCircleOutline />
									</Icon>
								</Button>
							</ButtonGroup>
						)}
						{error[key].status && (
							<Text color="red.600">error[key].msg</Text>
						)}
					</Group>
				))}
			</Stack>
		</Stack>
	);
};

export default Sender;
