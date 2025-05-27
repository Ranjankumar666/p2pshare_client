import { useRef, useState } from 'react';
import { pipe } from 'it-pipe';
import { encode, decode, END, START, ACK } from '../../../buffer/codec.js';
import { getRelayedMultiAddr, roundMB, CHUNK_SIZE } from '../../../utils/constants.js';
import {
	Input,
	Button,
	Group,
	Text,
	Stack,
	ButtonGroup,
	Icon,
	SimpleGrid,
	Card,
	Avatar,
	Heading,
	Flex,
} from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import {
	MdClose,
	MdFileUpload,
	MdOutlineRemoveCircleOutline,
	MdSend,
	MdUpload,
} from 'react-icons/md';
import { dialProtocol } from '../../../node/node.js';
import { batchStream, zipStream } from '../../../fileCompression/coDecom.js';
import { sendEOFStream, sendStream } from '../../../node/sendStream.js';

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
		const { files: filesSelected } = e.target;

		console.log(files);
		for (let file of filesSelected) {
			if (files[file.name]) continue;
			setFiles((oldState) => ({
				...oldState,
				[file.name]: file,
			}));

			setProgress((oldState) => ({
				...oldState,
				[file.name]: {
					percent: 0,
					bytes: 0,
					total: file.size,
				},
			}));

			setError((oldState) => {
				const newState = { ...oldState };
				const keyObj = { ...oldState[file.name] };
				keyObj.state = false;
				keyObj.msg = '';

				newState[file.name] = keyObj;

				return newState;
			});

			setSending((oldState) => ({
				...oldState,
				[file.name]: false,
			}));
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
					newState[fileName] = null;
				}
				return newState;
			});
		}
	};

	const handleError = (err, context = '') => {
		console.error(`❌ Error${context ? ' in ' + context : ''}:`, err);
		if (err?.message) setGenError(err.message);
	};

	const send = async (conn, fileName) => {
		try {
			const peerMA = getRelayedMultiAddr(peerAdd);

			let singleFile = {};
			singleFile[fileName] = files[fileName];
			const fileSize = singleFile[fileName].size;
			let zippedStream = await zipStream(singleFile);
			const batches = batchStream(zippedStream);
			let sentBytes = {
				percent: 0,
				bytes: 0,
				total: fileSize,
			};

			const reader = batches.getReader();

			while (true) {
				const { value, done } = await reader.read();
				if (done) {
					await sendEOFStream(fileName, conn, peerMA);
					break;
				}

				const batch = [];

				for (let chunk of value) {
					batch.push(
						new Promise(async (res) => {
							await sendStream(chunk, conn, peerMA);
							sentBytes.bytes += CHUNK_SIZE;
							const donePercent = (
								(sentBytes.bytes / fileSize) *
								100
							).toFixed(1);
							sentBytes.percent = donePercent;

							setProgress((prev) => ({
								...prev,
								[fileName]: { ...sentBytes },
							}));

							res();
						})
					);
				}

				await Promise.all(batch).catch((err) => {
					handleError(err, `send [${fileName}] batch`);
					setError((prev) => ({
						...prev,
						[fileName]: {
							state: true,
							msg: err.message,
						},
					}));
				});
			}

			removeFile(fileName);
		} catch (error) {
			conn.close();
			setConnecting(false);
			handleError(error, `send [${fileName}]`);
			setError((prev) => ({
				...prev,
				[fileName]: {
					state: true,
					msg: error.message,
				},
			}));
		} finally {
			resetProgressAndSending(fileName);
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
					if (decodedChunk.type === ACK) {
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
								<Flex
									justify="space-between"
									align="center"
									width="100%"
								>
									<Text size="xs" alignItems="">
										{`${progress[file.name].bytes}`
											.length === 1 &&
										progress[file.name].percent !== 0
											? Math.round(
													parseInt(
														'0' +
															progress[file.name]
																.percent
													)
											  )
											: parseInt(
													'0' +
														progress[file.name]
															.percent
											  )}{' '}
										%
									</Text>
									<Text size="xs">
										{`(${roundMB(
											progress[file.name].bytes
										)} / ${roundMB(
											progress[file.name].total
										)} MB)`}
									</Text>
								</Flex>
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
