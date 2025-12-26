
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("Erro fatal no mount:", err);
    rootElement.innerHTML = `
      <div style="padding:40px; color:white; font-family:sans-serif; text-align:center;">
        <h1 style="color:#d4af37">ReyelProduções</h1>
        <p>Erro ao iniciar interface. Por favor, limpe o cache do navegador e recarregue.</p>
        <code style="display:block; background:#1e293b; padding:20px; border-radius:10px; margin-top:20px; text-align:left;">
          ${err instanceof Error ? err.message : String(err)}
        </code>
      </div>
    `;
  }
};

mountApp();
