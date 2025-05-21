import { useEffect, useRef, useState } from 'react';
import { pipe } from 'it-pipe';
import { encode, decode, END, CHUNK, START } from '../buffer/codec';
import { PROTOCOL, getRelayedMultiAddr } from '../node/constants';
import {
	Input,
	Button,
	Group,
	Text,
	Stack,
	ProgressCircle,
	ButtonGroup,
	Icon,
	SimpleGrid,
	Card,
	Avatar,
	Heading,
} from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import {
	MdClose,
	MdFileUpload,
	MdOutlineRemoveCircleOutline,
	MdSend,
	MdUpload,
} from 'react-icons/md';
import { loadWasm } from '../wasm/loadWasm';
import FileCompressionWorker from '../workers/fileCompression.worker.js';
import { dialProtocol } from '../node/node.js';

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

	/** @type {import('@libp2p/interface').Libp2p} */
	const node = useSelector((state) => state.node);
	const [genError, setGenError] = useState();
	const fileUploadRef = useRef();

	useEffect(() => {
		if (!window.zipFileWASM) {
			loadWasm().then(() => {
				zipFileWasmRef.current = window.zipFileWASM;
			});
		} else if (!zipFileWasmRef.current) {
			zipFileWasmRef.current = window.zipFileWASM;
		}
	}, []);

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

		//do this ina different thread to make UI smooth
		const worker = new FileCompressionWorker();

		const { chunks, hashes, fileSize } = await new Promise((res) => {
			worker.postMessage({
				type: 'zip',
				data: singleFile,
			});

			worker.onmessage = (ev) => {
				res(ev.data);
			};
		});

		let sentBytes = [0];

		for (let index = 0; index < chunks.length; index += 1) {
			let stream = await dialProtocol(node, peerMA);

			const write = async function* () {
				// while (stack.length > 0) {

				// const idx = stack.pop();
				const idx = index;
				const chunk = chunks[idx];
				const hash = hashes[idx];

				sentBytes[0] += chunk.length;
				const donePercent = ((sentBytes[0] / fileSize) * 100).toFixed(
					1
				);

				setProgress((oldState) => {
					const newState = { ...oldState };
					newState[fileName] = donePercent;

					return newState;
				});
				yield encode(CHUNK, {
					index: idx,
					hash,
					chunk,
					filename: fileName,
				});
				// }
				// await new Promise((res) => setTimeout(res, 100));
				// }
			};

			const read = async function (source) {
				for await (const rawChunk of source) {
					const decodedChunk = decode(rawChunk.bufs[0]);

					if (decodedChunk.type === 1) {
						return;
					}

					console.log(
						`🔁 Retry requested for ${fileName}:`,
						decodedChunk.indices
					);
				}

				stream = await node.dialProtocol(peerMA, [PROTOCOL]);
				await pipe(write, stream);
				await pipe(stream, read);
			};

			await pipe(write, stream);
			await pipe(stream, read);
			await stream.close();
			// console.log(`✅ Connection closed `);
		}

		removeFile(fileName);
	};

	const send = async (fileNameKey) => {
		setSending((oldState) => {
			const newState = { ...oldState };
			newState[fileNameKey] = true;
			return newState;
		});

		try {
			const peerMA = getRelayedMultiAddr(peerAdd);

			if (fileNameKey) {
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
			console.error('Error' + error);
			setGenError(error.message);
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
		<Stack align="center">
			<Heading
				size={['sm', 'md', 'lg', 'lg']}
				textWrap="true"
				color="fg.subtle"
			>
				Paste Receiver's Address
			</Heading>
			<Input
				type="text"
				value={peerAdd}
				placeholder="Paste Receiver Address...."
				onChange={(e) => setPeerAdd(e.target.value)}
				padding="4"
				size="xs"
			/>
			<Group alignSelf="flex-end">
				<Input
					type="file"
					name="files"
					onChange={handleFileChange}
					multiple
					className="input-receiver"
					size="xs"
					display="none"
					ref={fileUploadRef}
				/>
				<Button
					size="xs"
					onClick={() => {
						fileUploadRef.current.click();
					}}
					variant="surface"
				>
					Add
					<Icon>
						<MdUpload />
					</Icon>
				</Button>

				<Button
					size="xs"
					onClick={async () => {
						const peerMA = getRelayedMultiAddr(peerAdd);
						// Start
						let stream = await dialProtocol(node, peerMA);
						await pipe(async function* () {
							yield encode(START);
						}, stream);

						// Send packets
						const promiseArray = Object.keys(files).map((file) =>
							send(file)
						);

						await Promise.all(promiseArray);

						// End
						stream = await dialProtocol(node, peerMA);

						await pipe(async function* () {
							yield encode(END);
						}, stream);

						await pipe(stream, async function (source) {
							for await (const rawChunk of source) {
								const decodedChunk = decode(rawChunk.bufs[0]);

								if (decodedChunk.type === 1) {
									console.log(`✅ Transferred successfully`);
									return;
								}
							}
						});

						await stream.close();
					}}
					variant="surface"
					disabled={!Object.keys(files).length || !peerAdd.length}
				>
					Send
					<Icon>
						<MdSend />
					</Icon>
				</Button>
			</Group>
			{genError && (
				<Group alignSelf="center">
					<Text color="red.600">
						Error:{' '}
						{genError.length > 64
							? genError.substring(0, 64) + '....'
							: genError}
					</Text>
					<Button
						size="xs"
						onClick={() => setGenError(undefined)}
						variant="surface"
					>
						<Icon>
							<MdClose />
						</Icon>
					</Button>
				</Group>
			)}
			<SimpleGrid columns={[2, null, 3]} gap="2">
				{Object.entries(files).map(([key, file], id) => (
					<Card.Root
						className=""
						key={files.length + id + key}
						size="lg"
					>
						<Card.Body gap="2">
							<Avatar.Root size="md" shape="rounded">
								<Icon size="xl">
									<MdFileUpload />
								</Icon>
							</Avatar.Root>

							<Text
								textStyle="xs"
								color="fg.subtle"
								fontWeight="medium"
							>
								{file.name}
							</Text>
						</Card.Body>

						<Card.Footer>
							{sending[file.name] ? (
								<>
									<ProgressCircle.Root value={null} size="xs">
										<ProgressCircle.Circle>
											<ProgressCircle.Track />
											<ProgressCircle.Range strokeLinecap="round" />
										</ProgressCircle.Circle>
									</ProgressCircle.Root>
									<Text size="md">
										{`${progress[file.name]}`.length ===
											1 && progress[file.name] !== 0
											? '0' + progress[file.name]
											: progress[file.name]}{' '}
										%
									</Text>
								</>
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
								<Text color="red.600">{error[key].msg}</Text>
							)}
						</Card.Footer>
					</Card.Root>
				))}
			</SimpleGrid>
		</Stack>
	);
};

export default Sender;
