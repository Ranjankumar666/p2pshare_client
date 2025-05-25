let dbPromise;
const OBJECT_STORE = 'chunks';
const INDEX_NAME = 'peerFileIndex';

const indexedStore = async (peer, fileName) => {
	const db = await openDB();
	const tx = db.transaction(OBJECT_STORE, 'readonly');
	const store = tx.objectStore(OBJECT_STORE);
	const index = store.index(INDEX_NAME);

	console.log(typeof fileName, fileName);
	console.log(typeof peer, peer);

	const range = IDBKeyRange.bound(
		[peer, fileName, 0],
		[peer, fileName, Number.POSITIVE_INFINITY]
	);

	const request = index.openCursor(range);
	return request;
};

export const openDB = (dbName = 'p2pShareDB', version = 1) => {
	if (!dbPromise) {
		dbPromise = new Promise((res, rej) => {
			const req = indexedDB.open(dbName, version);

			req.onupgradeneeded = (evt) => {
				const db = evt.target.result;
				if (!db.objectStoreNames.contains(OBJECT_STORE)) {
					const store = db.createObjectStore(OBJECT_STORE, {
						keyPath: ['peer', 'fileName', 'index'],
					});
					store.createIndex(INDEX_NAME, [
						'peer',
						'fileName',
						'index',
					]);
				}
			};

			req.onsuccess = () => res(req.result);
			req.onerror = () => rej(req.error);
		});
	}
	return dbPromise;
};

export const storeChunk = async (peer, fileName, index, data) => {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(OBJECT_STORE, 'readwrite');
		const store = tx.objectStore(OBJECT_STORE);
		store.put({ peer, fileName, index, data });
		tx.oncomplete = resolve;
		tx.onerror = reject;
	});
};

export const getChunks = (peer, fileName) => {
	return new ReadableStream({
		async start(controller) {
			const request = await indexedStore(peer, fileName);

			request.onsuccess = function (e) {
				const cursor = e.target.result;
				if (cursor) {
					const { peer: p, fileName: f, data } = cursor.value;
					if (p === peer && f === fileName) {
						controller.enqueue(data); // Push chunk to stream
					}
					cursor.continue();
				} else {
					controller.close(); // End of stream
				}
			};

			request.onerror = () => controller.error('Failed to stream file');
		},
	});
};

export const clearDB = async () => {
	const db = await openDB();
	return new Promise((res, rej) => {
		const tx = db.transaction(OBJECT_STORE, 'readwrite');
		const store = tx.objectStore(OBJECT_STORE);
		const req = store.clear();
		req.onsuccess = () => res();
		req.onerror = () => rej(req.error);
	});
};

export const clearFile = async (peerId, fileName) => {
	const db = await openDB();
	const tx = db.transaction(OBJECT_STORE, 'readwrite');
	const store = tx.objectStore(OBJECT_STORE);

	const keysReq = store.getAllKeys();

	keysReq.onsuccess = () => {
		const keys = keysReq.result;
		keys.forEach((key) => {
			if (key.includes(peerId) && key.includes(fileName)) {
				console.log('Deleted keys: ', peerId);
				store.delete(key);
			}
		});
	};
};
