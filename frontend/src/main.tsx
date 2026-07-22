import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { registerPwa } from './app/pwa';
import './styles.css';

registerPwa();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
