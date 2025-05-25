import { createSlice } from '@reduxjs/toolkit';

export const stateSlice = createSlice({
	name: 'state',
	initialState: {
		node: undefined,
		err: undefined,
		startedDownload: false,
		filesDownloaded: {},
	},
	reducers: {
		setNode: (state, action) => {
			state.node = action.payload;
		},
		setStartDownload: (state, action) => {
			console.log(action.payload);
			state.startedDownload = action.payload;
		},
		setErr: (state, action) => {
			state.err = action.payload;
		},
		delError: (state, action) => {
			state.err = undefined;
		},
		setFileDownload: (state, action) => {
			const key = action.payload.peerId + '/' + action.payload.fileName;
			state.filesDownloaded = {
				...state.filesDownloaded,
				[key]: true,
			};
		},
		removeFileDownload: (state, action) => {
			const key = action.payload;
			delete state.filesDownloaded[key];
		},
	},
});

export const {
	setNode,
	setErr,
	delError,
	setStartDownload,
	setFileDownload,
	removeFileDownload,
} = stateSlice.actions;
export default stateSlice.reducer;
