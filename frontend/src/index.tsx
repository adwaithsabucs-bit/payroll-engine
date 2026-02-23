import './global.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Reset browser default styles
const style = document.createElement('style');
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: Inter, system-ui, -apple-system, sans-serif; }
  input, select, textarea, button { font-family: inherit; }
  a { text-decoration: none; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<React.StrictMode><App /></React.StrictMode>);