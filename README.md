# Reboot the Earth — MVP local

Cadastro de extração de madeira com React + Vite, API Node.js/Express e SQLite. Dados e fotos ficam neste computador, no arquivo `data/reboot.sqlite`. Não exige contas, banco externo nem acesso à internet para cadastrar e consultar produtos.

## Iniciar

Requer Node.js 22.13+ (recomendado 24 ou superior) e npm. O SQLite é integrado ao Node.js e as tabelas são criadas automaticamente.

1. Se ainda não existir `.env`, copie `.env.example` para `.env`.
2. Configure `API_WRITE_TOKEN` com uma senha de pelo menos 24 caracteres. `PUBLIC_BASE_URL=http://127.0.0.1:5173` é o endereço usado nos links e QR Codes.
3. Execute:

```powershell
npm install
npm run dev
```

Abra http://127.0.0.1:5173. Preencha produtor, espécie, data, coordenadas e foto anterior. A foto posterior é opcional no primeiro cadastro. No campo de senha, informe o valor de `API_WRITE_TOKEN` do `.env`.

Use a senha definida em `API_WRITE_TOKEN` no seu arquivo `.env`, que não é enviado ao Git.

A API escuta apenas em `127.0.0.1:3001` e o frontend em `127.0.0.1:5173`. O link de rastreio e o QR funcionam neste computador. Acesso por outros aparelhos está desativado. Depois de alterar o `.env`, reinicie a aplicação.

## Testar o cadastro

1. Cadastre um produto com foto anterior e confira o UUID, o hash e o QR no comprovante.
2. Abra o link de rastreio para consultar os dados e a foto.
3. No comprovante, anexe a foto posterior para concluir. O hash muda, mas o endereço de rastreio permanece igual.
4. Reinicie a API e consulte o mesmo link: o registro e as fotos continuam no SQLite.

Depois de fechar o comprovante, a foto posterior pode ser anexada pelo endpoint PATCH usando o identificador e a senha da API. Uma segunda foto posterior para o mesmo registro retorna 409.

## Rascunhos e fotos

“Salvar rascunho” guarda os campos textuais no navegador. Não guarda a senha nem as fotos. Ao reabrir, selecione as fotos novamente e envie manualmente. Não há sincronização automática.

As imagens são JPEG, PNG ou WebP de até 5 MB cada, com validação de MIME e assinatura do arquivo. São gravadas como BLOBs no SQLite e servidas por rotas da API, sem URLs externas nem expiração. Somente fotos associadas a produtos podem ser consultadas. Falhas ao gravar um registro removem os uploads intermediários; falhas na limpeza são registradas no terminal.

## Dados e backup

O arquivo `data/reboot.sqlite` contém os produtos e as imagens. A pasta `data/` e o `.env` ficam fora do Git. Reiniciar o servidor preserva os registros.

Para backup simples, pare a aplicação e copie a pasta `data/` inteira. Não remova essa pasta para reiniciar o MVP. O banco usa WAL e pode manter arquivos auxiliares enquanto estiver aberto.

## API

| Método | Rota | Uso |
| --- | --- | --- |
| GET | `/api/health` | Estado da API; informa SQLite e armazenamento local |
| POST | `/api/products` | Cadastro multipart com `Authorization: Bearer <API_WRITE_TOKEN>` |
| PATCH | `/api/products/:id/photo-after` | Anexar `photo_after` uma vez, com a mesma autorização |
| GET | `/api/products/:id` | Consulta com dados permitidos e URLs locais das fotos |
| GET | `/api/products/:id/photos/before` | Imagem anterior |
| GET | `/api/products/:id/photos/after` | Imagem posterior, quando cadastrada |

Campos do POST: `producer_name` (2–150 caracteres), `tree_species` (2–120), `latitude` (-90 a 90), `longitude` (-180 a 180), `extraction_date` (YYYY-MM-DD), `photo_before` obrigatório e `photo_after` opcional. Resposta: `id`, `status` (`pending` ou `completed`), `hash`, `tracking_url`.

Erros: 400 para entrada inválida, 401 para senha inválida, 404 para registro ou foto inexistente, 409 para foto posterior já cadastrada, 429 para excesso de solicitações e 503 para falha no banco local.

## Privacidade e integridade

A consulta omite o nome do produtor e arredonda as coordenadas para duas casas decimais. As fotos ficam disponíveis para quem tiver o link neste computador; evite rostos e documentos nas imagens. A senha compartilhada é para a demonstração, sem contas ou isolamento por produtor.

O servidor gera UUID e SHA-256 sobre campos em ordem fixa, incluindo hashes do conteúdo das fotos. `hashProduct` em `server/utils/hash.js` define a representação. Hash e QR não comprovam legalidade nem substituem licenças ou certificações.

## Build e testes

```powershell
npm test
npm run build
```

Os testes cobrem validação, cadastro, fotos, hash, autorização, consulta, limpeza em falhas e integração HTTP com SQLite real, incluindo persistência após reabrir o banco.

Para servir o build e a API juntos, defina `PUBLIC_BASE_URL=http://127.0.0.1:3001` no `.env`, rode `npm run build` e `npm start`, e abra http://127.0.0.1:3001.

Referência técnica: https://nodejs.org/api/sqlite.html

## Organização do código

```text
src/
  main.jsx              # Inicia o React no elemento root do HTML
  App.jsx               # Cabeçalho, rodapé e escolha da página pela URL
  pages/
    Register.jsx        # Cadastro, GPS, rascunho e envio das fotos
    Tracking.jsx        # Consulta pública pelo identificador do produto
  components/
    Photo.jsx           # Campo de foto com validação de tamanho e prévia
    Receipt.jsx         # Comprovante, QR e inclusão da foto posterior
  services/api.js       # Comunicação HTTP com a API local
  utils/
    product.js          # Data local, campos iniciais e nomes dos status
    draft.js            # Recuperação segura de rascunhos do navegador
  styles/global.css     # Aparência e adaptação para telas pequenas
server/
  index.js              # Inicia a API e fecha o banco ao encerrar
  app.js                # Configura Express, limites, rotas e frontend compilado
  config/env.js         # Valida .env e restringe o endereço ao computador local
  routes/               # Associa URLs e métodos aos filtros e controladores
  controllers/          # Recebe a requisição e monta a resposta HTTP
  services/             # Aplica as regras de cadastro e conclusão da extração
  validators/           # Valida campos, coordenadas, data e assinatura das fotos
  repositories/         # Executa SQL e armazena os bytes das fotos
  database/schema.sql   # Cria tabelas, vínculos e restrições automaticamente
  middleware/           # Autorização, upload, validação de UUID e tratamento de erros
  utils/                # Erro HTTP e funções de hash SHA-256
tests/product.test.js   # Testes de regras, API e persistência com SQLite real
data/                  # Banco persistente; não é código e não entra no Git
```

### Caminho de um cadastro

1. `Register.jsx` monta um `FormData` com os campos e fotos. `services/api.js` envia o POST.
2. `app.js` encaminha para `routes/productRoutes.js`. Os middlewares verificam a senha e recebem o multipart.
3. `controllers/productController.js` chama `services/productService.js`.
4. O serviço valida a entrada, gera UUID, calcula hashes e solicita a gravação ao repositório.
5. `repositories/productRepository.js` salva o registro e as fotos em SQLite, usando parâmetros SQL.
6. O controlador devolve o comprovante. `Receipt.jsx` mostra o QR, e `Tracking.jsx` usa o GET para consultar a origem.

Os comentários em português explicam as responsabilidades de cada módulo e os pontos que exigem cuidado: limpeza de fotos após falhas, privacidade da consulta, comparação da senha, concorrência na foto posterior e liberação das prévias no navegador.

Para manter a formatação, use `npm run format`. Para apenas verificar a formatação, use `npm run format:check`.
