# Reboot the Earth — Rastro Florestal

MVP de rastreabilidade com API Node.js/Express, SQLite e o frontend React Rastro Florestal fornecido no ZIP. O frontend fica em `frontend/`, preservando o visual, a captura por câmera, o GPS e o histórico de até três tentativas por etapa. A persistência original em IndexedDB foi substituída pela API local. Os endpoints anteriores de produtos continuam disponíveis.

## Iniciar

Requer Node.js 22.13+ (recomendado 24+) e npm.

```powershell
# Somente se ainda não existir .env:
Copy-Item .env.example .env
npm install
npm run dev
```

Não sobrescreva um `.env` existente. `npm run dev` inicia API e frontend juntos. Abra **http://127.0.0.1:5173**: o sistema entra diretamente em **Meus registros**, sem login ou senha. O modo atual usa `AUTH_ENABLED=false` (padrão) e aceita somente um HOST local de loopback.

A API responde em `http://127.0.0.1:3001/api/health`. Configure `PUBLIC_BASE_URL=http://127.0.0.1:5173` para os links e QR Codes locais. Não é necessário configurar banco remoto nem executar SQL manualmente.

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia API e frontend juntos, apenas em loopback por padrão |
| `npm run dev:api` | Apenas API com reinício automático |
| `npm run dev:web` | Apenas frontend com proxy `/api` para a porta 3001 |
| `npm start` | Apenas API sem modo de observação |
| `npm run build` | Gera `frontend/dist/` |
| `npm run preview:web` | Serve o build na porta 5173 com proxy para a API já iniciada |

O frontend é servido pelo Vite. A API continua independente e retorna JSON para rotas desconhecidas, sem servir HTML. Câmera e GPS reais precisam de permissão no navegador; `localhost`/`127.0.0.1` são adequados para o teste neste computador. Não concedemos permissões de câmera/GPS automaticamente.

## Fluxo do frontend integrado

1. Abra o aplicativo para acessar diretamente a lista de registros do produtor.
2. Crie um registro com nome, produtor e de 1 a 10 produtos. Ele pode ser salvo incompleto.
3. Capture fotos antes/depois. Cada produto permite até três tentativas por etapa, com GPS próprio ou sem posição. O modo demonstração identifica explicitamente coordenadas simuladas.
4. Salve o registro. Metadados e fotos são gravados juntos em uma transação SQLite. Abra o registro salvo para ver o hash e QR Code.
5. Abra o link de rastreio: a consulta pública não exige a senha, omite nome/produtor e arredonda as posições. Ela também reconhece identificadores de produtos cadastrados pela API anterior.

O rascunho novo fica na memória da tela até salvar; sair ou atualizar pode perdê-lo. Em falha de rede ou validação, a tela preserva o rascunho para nova tentativa. A aplicação não oferece sincronização offline automática. Como API e banco rodam neste computador, o cadastro não depende de internet após instalar as dependências. Registros de uma versão anterior guardados apenas em IndexedDB não são migrados automaticamente.

## Endpoints do módulo de registros

| Método | Rota | Autorização | Uso |
| --- | --- | --- | --- |
| GET | `/api/records` | Apenas com AUTH_ENABLED=true | Listar registros completos do produtor |
| POST | `/api/records` | Apenas com AUTH_ENABLED=true | Criar registro com produtos e históricos |
| PATCH | `/api/records/:id` | Apenas com AUTH_ENABLED=true | Renomear, com JSON `{ "name": "Novo nome" }` |
| POST | `/api/records/:id/products/:productId/attempts/:phase` | Apenas com AUTH_ENABLED=true | Acrescentar tentativa em `before` ou `after` |
| GET | `/api/records/:id/trace` | Pública | Consulta de rastreio com dados permitidos |
| GET | `/api/records/:id/photos/:attemptId` | Pública | Foto vinculada a uma tentativa |

POST `/api/records` recebe multipart com `record` (JSON) e `photos` (arquivos com nome igual ao UUID da tentativa). O JSON contém `id`, `name`, `producer`, `products`; cada produto tem `id`, `species`, `before` e `after`. As tentativas têm `id`, `capturedAt`, `imageSource` e `location` opcional. A inclusão posterior usa os campos multipart `attempt` (JSON) e `photo` (arquivo). O cliente `frontend/src/store.js` implementa esse contrato. Fotos: JPEG/PNG/WebP até 5 MB; no máximo dez produtos e três fotos por etapa.

O servidor atribui códigos sequenciais, calcula hashes e registra o horário de inclusão. Repetir o mesmo UUID não duplica um registro nem uma tentativa. Novas fotos preservam as anteriores. O backend valida o limite dentro da transação para impedir duplicação por requisições concorrentes.

## Configuração

| Variável | Uso |
| --- | --- |
| `AUTH_ENABLED` | `false` por padrão: MVP local sem login; `true` ativa a exigência de Bearer token na API |
| `API_WRITE_TOKEN` | Exigido apenas com `AUTH_ENABLED=true`; mínimo de 24 caracteres |
| `HOST` | Endereço de escuta; padrão `127.0.0.1`. Use `0.0.0.0` somente com AUTH_ENABLED=true para acesso pela rede ou em contêiner |
| `PORT` | Porta da API; padrão `3001` |
| `PUBLIC_BASE_URL` | Origem do frontend externo, por exemplo `https://app.exemplo.com`; usada no `tracking_url` |
| `CORS_ORIGINS` | Origens permitidas, separadas por vírgula, por exemplo `https://app.exemplo.com,http://localhost:5173` |

As URLs de configuração aceitam HTTP/HTTPS e somente a origem (protocolo, domínio e porta), sem caminho, parâmetros, credenciais ou curingas. Se `CORS_ORIGINS` estiver ausente, a origem de `PUBLIC_BASE_URL` será permitida; se estiver vazio, nenhuma origem de navegador será permitida. `localhost` e `127.0.0.1`, assim como portas diferentes, são origens diferentes. Reinicie a API após alterar o `.env`.

O CORS permite GET, POST, PATCH e OPTIONS, com os cabeçalhos Authorization e Content-Type. Preflights válidos retornam 204 sem exigir token. Origens não autorizadas retornam 403. Requisições sem Origin, como integrações entre servidores, continuam aceitas e exigem token somente quando AUTH_ENABLED=true. CORS não substitui autenticação.

Para usar um frontend remoto, a API precisa estar acessível pelo computador do usuário. Em produção, publique a API por HTTPS; `127.0.0.1` aponta para o computador de quem abre o navegador. O token compartilhado é uma autorização de demonstração: não o inclua no bundle público do frontend. Envie-o a partir de um backend intermediário ou receba-o do operador durante a sessão.

## Contrato HTTP anterior de produtos

| Método | Rota | Autorização | Uso |
| --- | --- | --- | --- |
| GET | `/api/health` | Pública | Estado da API |
| POST | `/api/products` | Apenas com AUTH_ENABLED=true | Cadastrar extração, usando multipart/form-data |
| PATCH | `/api/products/:id/photo-after` | Apenas com AUTH_ENABLED=true | Adicionar `photo_after` uma única vez, usando multipart/form-data |
| GET | `/api/products/:id` | Pública | Dados públicos da extração |
| GET | `/api/products/:id/photos/before` | Pública | Bytes da foto anterior |
| GET | `/api/products/:id/photos/after` | Pública | Bytes da foto posterior, quando existente |

Campos do POST:

| Campo | Regra |
| --- | --- |
| `producer_name` | Texto de 2 a 150 caracteres |
| `tree_species` | Texto de 2 a 120 caracteres |
| `latitude` | Número enviado como texto, entre -90 e 90 |
| `longitude` | Número enviado como texto, entre -180 e 180 |
| `extraction_date` | Data real no formato YYYY-MM-DD |
| `photo_before` | Arquivo obrigatório |
| `photo_after` | Arquivo opcional |

Fotos devem ser JPEG, PNG ou WebP de até 5 MB cada, com MIME e assinatura válidos. O PATCH recebe somente o arquivo `photo_after`. Uma segunda conclusão retorna 409.

POST retorna 201 e PATCH retorna 200, com este formato:

```json
{
  "id": "UUID do produto",
  "status": "pending",
  "hash": "SHA-256 do registro e evidências",
  "tracking_url": "https://app.exemplo.com/rastreio/UUID"
}
```

`status` será `completed` quando a foto posterior existir. O hash muda na conclusão, e o endereço de rastreio permanece igual. O frontend deve implementar `/rastreio/:id`, consultar GET `/api/products/:id` e gerar o QR Code a partir de `tracking_url`, se necessário.

A consulta pública retorna `id`, `tree_species`, `extraction_date`, `status`, `hash`, `created_at`, `approximate_location`, `photo_before` e `photo_after`. Omite o produtor e arredonda as coordenadas para duas casas decimais. `photo_after` é `null` enquanto pendente. Os caminhos das fotos são relativos à **origem da API**, por exemplo `/api/products/UUID/photos/before`; resolva-os com `new URL(data.photo_before, API_BASE_URL)` antes de usá-los em uma imagem do frontend externo.

Erros retornam JSON `{"error":"mensagem"}`: 400 para entrada inválida, 401 para token inválido, 403 para CORS não permitido, 404 para rota/registro/foto inexistente, 409 para conclusão repetida, 429 para limite de solicitações e 503 para falha de infraestrutura. As rotas da API têm limite de 90 solicitações por minuto por IP, exceto saúde e preflight. `/`, `/rastreio/:id` e arquivos HTML não são servidos por este backend.

## Exemplo no frontend externo

```js
const API_BASE_URL = 'http://127.0.0.1:3001';

async function registerProduct(fields, beforeFile, afterFile, token) {
  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => body.set(key, value));
  body.set('photo_before', beforeFile);
  if (afterFile) body.set('photo_after', afterFile);

  const response = await fetch(new URL('/api/products', API_BASE_URL), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

async function findProduct(id) {
  const response = await fetch(new URL(`/api/products/${encodeURIComponent(id)}`, API_BASE_URL));
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return {
    ...data,
    photo_before: new URL(data.photo_before, API_BASE_URL).href,
    photo_after: data.photo_after ? new URL(data.photo_after, API_BASE_URL).href : null,
  };
}
```

Deixe o navegador definir o Content-Type do FormData para incluir o delimitador multipart. O PATCH usa a mesma estrutura de fetch, com método PATCH e FormData contendo `photo_after`.

## Dados e integridade

Produtos, registros e fotos são armazenados em `data/reboot.sqlite`, criado automaticamente. As tabelas `forest_records` e `record_photos` atendem ao frontend; as tabelas anteriores de extrações são preservadas. `.env` e `data/` não entram no Git. Para backup, pare a API e copie a pasta `data/` inteira; SQLite usa WAL e pode manter arquivos auxiliares enquanto aberto.

Somente fotos vinculadas a registros podem ser consultadas. Falhas de persistência limpam uploads intermediários. Fotos são públicas para quem conhece o identificador; evite informações pessoais nelas. UUID, SHA-256 e QR Code não comprovam legalidade nem substituem certificações.

## Organização por funcionalidade

Cada funcionalidade reúne suas próprias camadas dentro de `server/features/`. O MVP possui a funcionalidade `products`, responsável pelo cadastro, conclusão da extração, consulta de rastreio e fotos.

```text
server/
  index.js                         # Inicialização e encerramento da API
  app.js                           # Express, limites e registro das funcionalidades
  config/
    env.js                         # Validação das configurações
  features/
    products/
      controllers/
        productController.js       # Requisições e respostas HTTP
      services/
        productService.js          # Regras, coordenação do cadastro e limpeza em falhas
      models/
        Product.js                 # Estado do produto, conclusão e dados públicos
      routes/
        productRoutes.js           # Endpoints e ordem de execução dos middlewares
      validators/
        productValidator.js        # Campos, coordenadas, datas e conteúdo das fotos
      middlewares/
        upload.js                  # Recebimento e limites das fotos
        validateId.js              # Validação do UUID do produto
      repositories/
        productRepository.js       # Persistência SQLite e fotos em bytes
      database/
        schema.sql                 # Tabelas e restrições da funcionalidade
      utils/
        hash.js                    # SHA-256 e representação dos campos do produto
  shared/
    errors/
      HttpError.js                 # Erro HTTP reutilizável por qualquer funcionalidade
    middlewares/
      auth.js                      # Senha para rotas privadas de produtos e registros
      cors.js                      # Política de origens para toda a API
      errorHandler.js              # Respostas de erro comuns a todas as rotas
tests/                             # Domínio, CORS, configuração, HTTP e SQLite real
```

O fluxo de um cadastro é `routes → middlewares → controller → service → model/repository`. Os validators são chamados pelo service antes de gravar os dados. O repository executa o SQL, enquanto o model encapsula o estado e as representações do produto. As classes recebem suas dependências nos construtores; as fábricas anteriores continuam como adaptadores para instâncias.

Para adicionar uma funcionalidade, crie uma pasta irmã de `products` em `features`, com suas próprias pastas `controllers`, `services`, `models`, `routes`, `validators` e `middlewares`. Registre suas rotas em `app.js`. Inclua `repositories`, `database` e `utils` quando a funcionalidade precisar deles. Código realmente comum fica em `shared`, sem depender de uma funcionalidade específica.

`server/features/records/` segue a mesma separação, com controller, service, model, routes, validators, middlewares, repository e schema próprios. Autorização, SHA-256 e validação dos bytes das imagens ficam em `server/shared/` para evitar dependências entre funcionalidades.

`frontend/src/main.jsx` mantém as telas do ZIP e abre diretamente a lista de registros; `store.js` adapta suas operações para HTTP; `api.js` centraliza as requisições e os erros; `domain/record.js` reúne regras visuais; `pages/Trace.jsx` implementa a consulta pública e o fallback para produtos antigos. O diretório `.git` incluído no ZIP não foi importado. Os documentos de origem em `frontend/docs/` e `frontend/integracoes/` são referências; a configuração vigente é a deste README.

## Verificação

```powershell
npm test
npm run format:check
npm run build
```

Para aplicar a formatação, use `npm run format`.

Os testes incluem contratos HTTP anteriores, cadastro completo de registros, limites de tentativas, idempotência, transações, privacidade da consulta, leitura dos bytes, persistência após reabrir o SQLite e adaptação multipart do frontend.
