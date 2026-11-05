import React, { useEffect, useState } from 'react';
import { request } from '../services/api.js';
import { labels } from '../utils/product.js';

// Consulta pelo identificador do QR. A API já remove os dados privados da resposta.
// O sinalizador active impede atualizar o estado após sair desta página.
export default function Tracking({ id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    request(`/api/products/${id}`)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  if (error)
    return (
      <section className="card">
        <h1>Consulta de origem</h1>
        <p className="error" role="alert">
          {error}
        </p>
        <a href="/">Voltar ao cadastro</a>
      </section>
    );
  if (!data) return <p role="status">Consultando a origem…</p>;
  return (
    <section className="card">
      <span className="tag">Rastreabilidade pública</span>
      <h1>{data.tree_species}</h1>
      <p>{labels[data.status]}</p>
      <dl>
        <dt>Data de extração</dt>
        <dd>{data.extraction_date.split('-').reverse().join('/')}</dd>
        <dt>Localização aproximada</dt>
        <dd>
          {data.approximate_location.latitude}, {data.approximate_location.longitude}
        </dd>
        <dt>Identificador</dt>
        <dd>{data.id}</dd>
        <dt>Hash SHA-256</dt>
        <dd>{data.hash}</dd>
      </dl>
      <div className="grid evidence">
        <figure>
          <img src={data.photo_before} alt="Árvore antes da extração" />
          <figcaption>Antes da extração</figcaption>
        </figure>
        {data.photo_after ? (
          <figure>
            <img src={data.photo_after} alt="Local depois da extração" />
            <figcaption>Depois da extração</figcaption>
          </figure>
        ) : (
          <p>A foto posterior ainda não foi anexada.</p>
        )}
      </div>
      <p className="hint">Os dados e as fotos estão armazenados neste computador.</p>
      <a href="/">Voltar ao cadastro</a>
    </section>
  );
}
