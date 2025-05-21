import { configureStore } from '@reduxjs/toolkit';
import stateReducer from './stateReducer';

export const store = configureStore({
	reducer: stateReducer,
	middleware: (defaultMiddleware) =>
		defaultMiddleware({
			serializableCheck: false,
		}),
});
