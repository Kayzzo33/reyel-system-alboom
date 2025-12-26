
// @ts-ignore - Usando URLs absolutas para garantir versão única e ignorar bugs de importmap
import React from 'https://esm.sh/react@19.0.0';
// @ts-ignore
import ReactDOM from 'https://esm.sh/react-dom@19.0.0/client';
import App from './App';

console.log("Sistema: Iniciando boot da aplicação...");

const init = () => {
  const container = document.getElementById('root');
  if (!container) {
    console.error("Erro: Elemento #root não encontrado no DOM");
    return;
  }

  try {
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Sistema: React montado com sucesso.");
  } catch (error) {
    console.error("Erro Crítico no React Mount:", error);
    container.innerHTML = `
      <div style="padding:40px; color:white; font-family:sans-serif; text-align:center; background:#020617; height:100vh; display:flex; flex-direction:column; justify-content:center;">
        <h1 style="color:#d4af37">ReyelProduções</h1>
        <p style="color:#94a3b8">Falha técnica detectada na inicialização dos módulos.</p>
        <div style="background:#1e293b; padding:15px; border-radius:10px; margin-top:20px; font-size:12px; text-align:left; max-width:500px; margin-left:auto; margin-right:auto; border:1px solid #ef4444;">
          <code>${String(error)}</code>
        </div>
        <button onclick="window.location.reload()" style="margin-top:30px; background:#d4af37; color:black; border:none; padding:12px 24px; border-radius:8px; font-weight:bold; cursor:pointer;">Tentar Novamente</button>
      </div>
    `;
  }
};

// Executa assim que o script carrega
init();
