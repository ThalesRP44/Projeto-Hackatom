import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

// Ponto de entrada: conecta a árvore de componentes React ao elemento do index.html.
createRoot(document.getElementById('root')).render(<App />);
