import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Photo from './Photo.jsx';
import { request } from '../services/api.js';
import { labels } from '../utils/product.js';

// Comprovante retornado pela API: mostra o QR e permite concluir um registro pendente.
// A senha fica apenas no estado da sessão e autoriza o envio da foto posterior.
export default function Receipt({ receipt, token, onNew }) {
  const [value, setValue] = useState(receipt);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function complete(e) {
    // Atualiza o comprovante com o novo status e hash sem alterar o identificador do QR.
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setValue(
        await request(`/api/products/${value.id}/photo-after`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: new FormData(e.currentTarget),
        }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card receipt">
      <span className="tag">Cadastro concluído</span>
      <h2>Uma origem que pode ser consultada.</h2>
      <p>{labels[value.status]}</p>
      <div className="qr">
        <QRCodeSVG value={value.tracking_url} size={180} marginSize={2} />
      </div>
      <a href={value.tracking_url}>Abrir rastreabilidade →</a>
      <dl>
        <dt>Identificador do produto</dt>
        <dd>{value.id}</dd>
        <dt>Hash SHA-256</dt>
        <dd>{value.hash}</dd>
      </dl>
      {value.status === 'pending' && (
        <form onSubmit={complete}>
          <h3>Concluir a extração</h3>
          <Photo name="photo_after" title="Foto depois da extração" required />
          <button disabled={busy}>{busy ? 'Salvando…' : 'Adicionar foto posterior'}</button>
        </form>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="secondary" onClick={onNew}>
        Cadastrar outro produto
      </button>
    </section>
  );
}
