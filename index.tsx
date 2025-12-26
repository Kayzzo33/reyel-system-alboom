
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Log imediato para provar que o JS carregou
console.log("%c REYEL PRODUÇÕES: Motor iniciado! ", "background: #d4af37; color: #000; font-weight: bold;");

const startApp = () => {
  const container = document.getElementById('root');
  
  if (!container) {
    console.error("FATAL: Elemento #root não encontrado!");
    return;
  }

  try {
    console.log("Iniciando montagem do React...");
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("React: Renderização disparada com sucesso.");
  } catch (err) {
    console.error("Erro durante o render:", err);
    container.innerHTML = `<div style="color:white; padding:20px;">Erro ao carregar App: ${err}</div>`;
  }
};

// Execução imediata
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  startApp();
} else {
  window.addEventListener('DOMContentLoaded', startApp);
}
