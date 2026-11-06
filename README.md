# Reboot the Earth — API

Backend de rastreabilidade de extração de madeira com Node.js, Express e SQLite. O projeto não contém interface, servidor de arquivos estáticos nem build de frontend. O frontend externo consome os endpoints HTTP e pode usar qualquer tecnologia.

## Iniciar

Requer Node.js 22.13+ (recomendado 24+) e npm.

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Antes de iniciar, configure `API_WRITE_TOKEN` no `.env` com um token de pelo menos 24 caracteres. Para executar sem modo de observação, use `npm start`. A API responde por padrão em `http://127.0.0.1:3001/api/health`. Não há etapa de build.

## Configuração

| Variável | Uso |
| --- | --- |
| `API_WRITE_TOKEN` | Token obrigatório para POST e PATCH; mínimo de 24 caracteres |
| `HOST` | Endereço de escuta; padrão `127.0.0.1`. Use `0.0.0.0` para acesso pela rede ou em contêiner |
| `PORT` | Porta da API; padrão `3001` |
| `PUBLIC_BASE_URL` | Origem do frontend externo, por exemplo `https://app.exemplo.com`; usada no `tracking_url` |
| `CORS_ORIGINS` | Origens permitidas, separadas por vírgula, por exemplo `https://app.exemplo.com,http://localhost:5173` |

As URLs de configuração aceitam HTTP/HTTPS e somente a origem (protocolo, domínio e porta), sem caminho, parâmetros, credenciais ou curingas. Se `CORS_ORIGINS` estiver ausente, a origem de `PUBLIC_BASE_URL` será permitida; se estiver vazio, nenhuma origem de navegador será permitida. `localhost` e `127.0.0.1`, assim como portas diferentes, são origens diferentes. Reinicie a API após alterar o `.env`.

O CORS permite GET, POST, PATCH e OPTIONS, com os cabeçalhos Authorization e Content-Type. Preflights válidos retornam 204 sem exigir token. Origens não autorizadas retornam 403. Requisições sem Origin, como integrações entre servidores, continuam aceitas e precisam do token para escritas. CORS não substitui autenticação.

Para usar um frontend remoto, a API precisa estar acessível pelo computador do usuário. Em produção, publique a API por HTTPS; `127.0.0.1` aponta para o computador de quem abre o navegador. O token compartilhado é uma autorização de demonstração: não o inclua no bundle público do frontend. Envie-o a partir de um backend intermediário ou receba-o do operador durante a sessão.

## Contrato HTTP

| Método | Rota | Autorização | Uso |
| --- | --- | --- | --- |
| GET | `/api/health` | Pública | Estado da API |
| POST | `/api/products` | Bearer token | Cadastrar extração, usando multipart/form-data |
| PATCH | `/api/products/:id/photo-after` | Bearer token | Adicionar `photo_after` uma única vez, usando multipart/form-data |
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

Produtos e fotos são armazenados em `data/reboot.sqlite`, criado automaticamente. `.env` e `data/` não entram no Git. Para backup, pare a API e copie a pasta `data/` inteira; SQLite usa WAL e pode manter arquivos auxiliares enquanto aberto. A remoção do frontend não altera o esquema nem os registros existentes.

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
        auth.js                    # Senha para escrita de produtos
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
      cors.js                      # Política de origens para toda a API
      errorHandler.js              # Respostas de erro comuns a todas as rotas
tests/                             # Domínio, CORS, configuração, HTTP e SQLite real
```

O fluxo de um cadastro é `routes → middlewares → controller → service → model/repository`. Os validators são chamados pelo service antes de gravar os dados. O repository executa o SQL, enquanto o model encapsula o estado e as representações do produto. As classes recebem suas dependências nos construtores; as fábricas anteriores continuam como adaptadores para instâncias.

Para adicionar uma funcionalidade, crie uma pasta irmã de `products` em `features`, com suas próprias pastas `controllers`, `services`, `models`, `routes`, `validators` e `middlewares`. Registre suas rotas em `app.js`. Inclua `repositories`, `database` e `utils` quando a funcionalidade precisar deles. Código realmente comum fica em `shared`, sem depender de uma funcionalidade específica.

A reorganização altera apenas os caminhos dos arquivos e imports. Os endpoints e o arquivo persistente `data/reboot.sqlite` permanecem os mesmos.

## Verificação

```powershell
npm test
npm run format:check
```

Para aplicar a formatação, use `npm run format`.
