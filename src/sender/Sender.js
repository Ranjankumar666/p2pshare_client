import { useRef, useState } from 'react';
import { pipe } from 'it-pipe';
import { encode, decode, END, CHUNK, START } from '../buffer/codec';
import { getRelayedMultiAddr } from '../node/constants';
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
	const [connecting, setConnecting] = useState(false);

	/** @type {import('@libp2p/interface').Libp2p} */
	const node = useSelector((state) => state.node);
	const [genError, setGenError] = useState();
	const fileUploadRef = useRef();

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

	const resetProgressAndSending = (fileNameKey = null) => {
		if (fileNameKey) {
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
		} else {
			setSending((oldState) => {
				const newState = { ...oldState };

				for (let fileName in newState) {
					newState[fileName] = false;
				}
				return newState;
			});
			setProgress((oldState) => {
				const newState = { ...oldState };
				for (let fileName in newState) {
					newState[fileName] = 0;
				}
				return newState;
			});
		}
	};

	const handleError = (err, context = '') => {
		console.error(`❌ Error${context ? ' in ' + context : ''}:`, err);
		if (err?.message) setGenError(err.message);
	};

	const sendOneFile = async (conn, fileName, bytefiles, peerMA) => {
		let singleFile = {};
		let arrayBuf = await bytefiles[fileName].arrayBuffer();
		singleFile[fileName] = new Uint8Array(arrayBuf);

		const worker = new FileCompressionWorker();

		let { batches, fileSize } = await new Promise((res) => {
			worker.postMessage({ type: 'zip', data: singleFile });
			worker.onmessage = (ev) => res(ev.data);
		});

		worker.terminate();

		let sentBytes = [0];

		const transferChunk = async (index, hash, chunk, sentBytes) => {
			let stream;

			try {
				stream = await dialProtocol(conn, peerMA);

				const write = async function* () {
					yield encode(CHUNK, {
						index,
						hash,
						chunk,
						filename: fileName,
					});
				};

				const writeAgain = (resendIndex) =>
					async function* () {
						yield encode(CHUNK, {
							index: resendIndex,
							hash,
							chunk,
							filename: fileName,
						});
					};

				const read = async function (source) {
					for await (const rawChunk of source) {
						const decodedChunk = decode(rawChunk.bufs[0]);

						if (decodedChunk.type === 1) {
							sentBytes[0] += chunk.length;
							const donePercent = (
								(sentBytes[0] / fileSize) *
								100
							).toFixed(1);

							setProgress((prev) => ({
								...prev,
								[fileName]: donePercent,
							}));
							return;
						}

						console.log(`🔁 Retry requested for ${fileName}`);
						stream = await dialProtocol(node, peerMA);
						await pipe(writeAgain(decodedChunk.indices), stream);
						await pipe(stream, read);
					}
				};

				await pipe(write, stream);
				await pipe(stream, read);
			} catch (err) {
				handleError(err, `transferChunk [${fileName}]`);
				throw err;
			} finally {
				chunk = null;
				hash = null;
				if (stream?.close) await stream.close();
			}
		};

		try {
			for (let batch of batches) {
				await Promise.all(
					batch.map(([index, hash, chunk]) =>
						transferChunk(index, hash, chunk, sentBytes)
					)
				);

				batch = null;
			}
			batches = null;
		} catch (error) {
			handleError(error, `sendOneFile [${fileName}]`);
			setConnecting(false);
			resetProgressAndSending(fileName);
			return;
		} finally {
			arrayBuf = null;
			delete singleFile[fileName];
			singleFile = null;
		}

		removeFile(fileName);
	};

	const send = async (conn, fileNameKey) => {
		try {
			const peerMA = getRelayedMultiAddr(peerAdd);
			if (fileNameKey) {
				await sendOneFile(conn, fileNameKey, files, peerMA);
			}
		} catch (error) {
			conn.close();
			setConnecting(false);
			handleError(error, `send [${fileNameKey}]`);
			setError((prev) => ({
				...prev,
				[fileNameKey]: {
					state: true,
					msg: error.message,
				},
			}));
		} finally {
			resetProgressAndSending(fileNameKey);
		}
	};

	const sendAll = async () => {
		let conn;
		try {
			setConnecting(true);

			const peerMA = getRelayedMultiAddr(peerAdd);
			conn = await node.dial(peerMA, {
				force: true,
			});
			console.log('RTT: ' + conn.rtt);

			let stream = await dialProtocol(conn, peerMA);
			console.log(stream);

			await pipe(async function* () {
				yield encode(START);
			}, stream);
			setConnecting(false);

			Object.keys(files).forEach((fileNameKey) =>
				setSending((prev) => ({ ...prev, [fileNameKey]: true }))
			);

			await Promise.all(
				Object.keys(files).map((file) => send(conn, file))
			);

			stream = await dialProtocol(conn, peerMA);
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
		} catch (error) {
			setConnecting(false);
			handleError(error, 'sendAll');
			resetProgressAndSending();
		} finally {
			conn.close();
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
					onClick={sendAll}
					variant="surface"
					disabled={
						!Object.keys(files).length ||
						!peerAdd.length ||
						Object.values(sending).some((val) => val === true)
					}
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
			{connecting && <Text size="sm">Making connection.....</Text>}
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
											? Math.round(
													parseInt(
														'0' +
															progress[file.name]
													)
											  )
											: parseInt(
													'0' + progress[file.name]
											  )}{' '}
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
