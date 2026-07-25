import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { registerPwa } from './app/pwa';
import './styles.css';

function trackVisualViewport() {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const sync = () => {
    document.documentElement.style.setProperty('--visual-viewport-height', `${viewport.height}px`);
    document.documentElement.classList.toggle('keyboard-open', window.innerHeight - viewport.height > 150);
  };
  sync();
  viewport.addEventListener('resize', sync);
  viewport.addEventListener('scroll', sync);
  window.addEventListener('resize', sync);
}

trackVisualViewport();
registerPwa();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
