import React from 'react';
import Register from './pages/Register.jsx';
import Tracking from './pages/Tracking.jsx';

// Estrutura compartilhada e escolha da página pela URL, sem biblioteca de roteamento.
export default function App() {
  const match = window.location.pathname.match(/^\/rastreio\/([^/]+)\/?$/);
  return (
    <>
      <header>
        <a className="brand" href="/">
          <span className="brand-icon">↟</span> reboot<span className="brand-light">the earth</span>
        </a>
        <span className="header-note">ORIGEM QUE CONECTA</span>
      </header>
      <main>{match ? <Tracking id={encodeURIComponent(match[1])} /> : <Register />}</main>
      <footer>
        Reboot the Earth · Rastreabilidade florestal
        <p>
          Os registros são declaratórios. Hash e QR Code não comprovam a legalidade da extração nem
          substituem licenças ou certificações.
        </p>
      </footer>
    </>
  );
}
