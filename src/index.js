import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Provider } from './components/ui/provider';
import { Provider as StateProvider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import stateReducer from './state/stateReducer';

const store = configureStore({
	reducer: stateReducer,
	middleware: (defaultMiddleware) =>
		defaultMiddleware({
			serializableCheck: false,
		}),
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
	<React.StrictMode>
		<StateProvider store={store}>
			<Provider>
				<App />
			</Provider>
		</StateProvider>
	</React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
