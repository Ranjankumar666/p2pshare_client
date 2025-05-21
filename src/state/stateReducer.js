import { createSlice } from '@reduxjs/toolkit';

export const stateSlice = createSlice({
	name: 'state',
	initialState: {
		node: undefined,
		err: undefined,
		startedDownload: false,
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
	},
});

export const { setNode, setErr, delError, setStartDownload } =
	stateSlice.actions;
export default stateSlice.reducer;
