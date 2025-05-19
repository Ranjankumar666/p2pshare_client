import { createSlice } from '@reduxjs/toolkit';

export const stateSlice = createSlice({
	name: 'state',
	initialState: {
		node: undefined,
		err: undefined,
	},
	reducers: {
		setNode: (state, action) => {
			state.node = action.payload;
		},
		setErr: (state, action) => {
			state.err = action.payload;
		},
		delError: (state, action) => {
			state.err = undefined;
		},
	},
});

export const { setNode, setErr, delError } = stateSlice.actions;
export default stateSlice.reducer;
