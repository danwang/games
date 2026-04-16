import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app.js';
import './styles.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Expected a #root element for the platform web app.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
