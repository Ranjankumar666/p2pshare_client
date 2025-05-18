const wasmResponse = await fetch('/main.wasm');
const wasmBuffer = await wasmResponse.arrayBuffer();
export const goInstance = new window.Go();

export const loadWasm = async () => {
	const { instance } = await WebAssembly.instantiate(
		wasmBuffer,
		goInstance.importObject
	);
	goInstance.run(instance);

	return goInstance;
};
