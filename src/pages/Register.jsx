import React, { useEffect, useState } from 'react';
import Photo from '../components/Photo.jsx';
import Receipt from '../components/Receipt.jsx';
import { request } from '../services/api.js';
import { draftKey, loadDraft } from '../utils/draft.js';
import { empty } from '../utils/product.js';

// Página principal: reúne os campos, GPS, rascunho e envio do cadastro.
// Cada estado controla um aspecto da tela; nenhum dado é gravado no banco até o POST.
export default function Register() {
  const [fields, setFields] = useState(loadDraft);
  const [token, setToken] = useState('');
  // Quando receipt recebe o resultado da API, o formulário dá lugar ao comprovante.
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [setupNotice, setSetupNotice] = useState('');
  // Verifica se a API respondeu; a proteção active evita atualizar uma tela desmontada.
  useEffect(() => {
    let active = true;
    request('/api/health')
      .then((data) => {
        if (active && data.status !== 'ok')
          setSetupNotice('A API local está indisponível. Tente novamente.');
      })
      .catch(() => {
        if (active)
          setSetupNotice('Não foi possível conectar à API local. Verifique se ela está rodando.');
      });
    return () => {
      active = false;
    };
  }, []);
  // Observa o estado de rede sem impedir o uso da API local quando não há internet.
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  function saveDraft() {
    // Persiste apenas os campos; fotos e senha não são colocadas no localStorage.
    try {
      localStorage.setItem(draftKey, JSON.stringify(fields));
      setNotice(
        'Rascunho salvo neste navegador. As fotos devem ser selecionadas novamente ao voltar.',
      );
    } catch {
      setError('O navegador não permitiu salvar o rascunho.');
    }
  }
  function gps() {
    // Se o navegador negar a localização, os campos continuam disponíveis para digitação.
    setError('');
    if (!navigator.geolocation) {
      setError('GPS indisponível. Preencha as coordenadas manualmente.');
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFields((f) => ({
          ...f,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));
        setGpsBusy(false);
      },
      () => {
        setError(
          'Não foi possível obter o GPS. Permita a localização ou preencha as coordenadas manualmente.',
        );
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  async function submit(e) {
    // FormData reúne os inputs nomeados e as fotos, preservando o formato multipart.
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    const body = new FormData(e.currentTarget);
    // Não enviar o input de arquivo vazio como se fosse uma foto.
    if (!body.get('photo_after')?.size) body.delete('photo_after');
    try {
      const data = await request('/api/products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* O cadastro já foi persistido. */
      }
      setReceipt(data);
    } catch (err) {
      setError(`${err.message} Seus dados continuam no formulário; você pode salvar um rascunho.`);
    } finally {
      setBusy(false);
    }
  }
  // O mesmo gerador de campos mantém rótulo, estado e validação HTML consistentes.
  const field = (name, title, props = {}) => (
    <label>
      {title} *
      <input
        name={name}
        value={fields[name]}
        required
        onChange={(e) => setFields({ ...fields, [name]: e.target.value })}
        {...props}
      />
    </label>
  );
  // A resposta bem-sucedida troca o formulário pelo comprovante sem recarregar a página.
  if (receipt)
    return (
      <Receipt
        receipt={receipt}
        token={token}
        onNew={() => {
          setReceipt(null);
          setFields(empty());
          setError('');
          setNotice('');
        }}
      />
    );
  return (
    <>
      <div className="intro">
        <span className="eyebrow">DA FLORESTA À ORIGEM</span>
        <h1>
          Todo produto tem
          <br />
          uma história.
        </h1>
        <p>Registre a extração e conecte a madeira à sua origem, com localização e evidências.</p>
      </div>
      <form className="card" onSubmit={submit}>
        <div className="section-head">
          <span className="tag">Novo registro</span>
          <small>* Campos obrigatórios</small>
        </div>
        <h2>Cadastro de produto</h2>
        {setupNotice && (
          <p role="status" className="notice">
            {setupNotice}
          </p>
        )}
        {!online && (
          <p role="status" className="notice">
            O navegador indica falta de conexão. O cadastro ainda funciona se a API local estiver
            rodando; você também pode salvar um rascunho.
          </p>
        )}
        <fieldset disabled={busy}>
          <legend>01 · Produtor e árvore</legend>
          <div className="grid">
            {field('producer_name', 'Nome do produtor', {
              minLength: 2,
              maxLength: 150,
              autoComplete: 'name',
              placeholder: 'Nome do responsável',
            })}
            {field('tree_species', 'Espécie da árvore', {
              minLength: 2,
              maxLength: 120,
              placeholder: 'Ex.: eucalipto',
            })}
            {field('extraction_date', 'Data da extração', { type: 'date' })}
          </div>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>02 · Local de origem</legend>
          <p className="hint">Use o GPS ou informe as coordenadas em graus decimais.</p>
          <button type="button" className="secondary" onClick={gps} disabled={gpsBusy}>
            {gpsBusy ? 'Obtendo localização…' : '◎ Usar minha localização'}
          </button>
          <div className="grid coordinates">
            {field('latitude', 'Latitude', {
              type: 'number',
              min: -90,
              max: 90,
              step: 'any',
              placeholder: '-23.5505',
            })}
            {field('longitude', 'Longitude', {
              type: 'number',
              min: -180,
              max: 180,
              step: 'any',
              placeholder: '-46.6333',
            })}
          </div>
          <small>
            Na consulta pública, as coordenadas são aproximadas e o nome do produtor não é exibido.
          </small>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>03 · Evidências da extração</legend>
          <div className="grid">
            <Photo name="photo_before" title="Antes da extração" required />
            <Photo name="photo_after" title="Depois da extração" />
          </div>
          <p className="hint">
            Você pode anexar a foto posterior no comprovante, após salvar. As fotos serão visíveis
            na consulta pública; evite rostos e documentos.
          </p>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>04 · Autorização de cadastro</legend>
          <label>
            Senha da API local *
            <input
              type="password"
              required
              value={token}
              autoComplete="off"
              onChange={(e) => setToken(e.target.value)}
              placeholder="Senha configurada pelo responsável"
            />
          </label>
          <small>Usada apenas para autorizar o envio. Não é salva no rascunho.</small>
        </fieldset>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        <div className="actions">
          <button disabled={busy}>{busy ? 'Registrando…' : 'Cadastrar e gerar QR Code →'}</button>
          <button type="button" className="secondary" disabled={busy} onClick={saveDraft}>
            Salvar rascunho
          </button>
        </div>
      </form>
    </>
  );
}
