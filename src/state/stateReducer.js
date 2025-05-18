import { createSlice } from '@reduxjs/toolkit';

export const stateSlice = createSlice({
	name: 'state',
	initialState: {
		node: undefined,
	},
	reducers: {
		setNode: (state, action) => {
			state.node = action.payload;
		},
	},
});

export const { setNode } = stateSlice.actions;
export default stateSlice.reducer;
