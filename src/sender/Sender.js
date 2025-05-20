import { useEffect, useRef, useState } from 'react';
import { multiaddr } from '@multiformats/multiaddr';
import { pipe } from 'it-pipe';
import { encode, decode } from '../buffer/codec';
import { RETRY_THRESHOLD, MULTIADDR_SUFFIX } from '../node/constants';
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

		let conn = await node.dial(peerMA);
		console.log(conn.remoteAddr);
		let stream = await conn.newStream([PROTOCOL]);
		console.log(stream);
		// /** @type {import('@libp2p/interface').Stream} */

		// console.log();
		console.log(stream.protocol);
		let sentBytes = 0;
		let retries = 0;

		const stack = chunks.map((_, index) => index);

		const write = async function* () {
			while (stack.length > 0) {
				const index = stack.pop();
				const chunk = chunks[index];
				const hash = hashes[index];

				sentBytes += chunk.length;
				const donePercent = ((sentBytes / fileSize) * 100).toFixed(2);
				setProgress((oldState) => {
					const newState = { ...oldState };
					newState[fileName] = donePercent;

					return newState;
				});
				yield encode(0, { index, hash, chunk });

				// await new Promise((res) => setTimeout(res, 100));
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
		await conn.close();
		console.log(`✅ Connection closed for ${fileName}`);

		removeFile(fileName);
	};

	const send = async (fileNameKey) => {
		setSending((oldState) => {
			const newState = { ...oldState };
			newState[fileNameKey] = true;
			return newState;
		});

		try {
			const peerMA = multiaddr(`${MULTIADDR_SUFFIX}${peerAdd}`);
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
						const promiseArray = Object.keys(files).map((file) =>
							send(file)
						);
						await Promise.all(promiseArray);
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
