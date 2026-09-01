# ITA Fast Food 🍔

Site de delivery completo com Firebase: login/cadastro, cardápio com categorias,
carrinho de compras, pedidos em tempo real e painel administrativo.

## 1. Estrutura

```
ita-fast-food/
├── index.html        → Página inicial
├── cardapio.html      → Cardápio com categorias e busca
├── login.html         → Login (Firebase Auth)
├── cadastro.html       → Cadastro (Firebase Auth + Firestore)
├── pedido.html         → Checkout + acompanhamento em tempo real
├── admin.html          → Painel administrativo
├── css/
├── js/
│   ├── firebase.js     → Configuração do Firebase (já preenchida)
│   ├── app.js           → Header, home, cardápio, checkout
│   ├── carrinho.js      → Carrinho de compras (localStorage)
│   ├── auth.js          → Login e cadastro
│   └── admin.js         → CRUD de produtos/cupons + gestão de pedidos
└── imagens/
```

O projeto usa o Firebase SDK modular v10 direto via CDN (`import` nos arquivos
`.js`), então **não precisa instalar nada nem rodar `npm install`**.

## 2. Rodar localmente

Como as páginas usam `<script type="module">`, é preciso servir os arquivos por
HTTP (não funciona abrindo o `.html` direto no navegador com `file://`).
Duas opções simples:

```bash
# opção 1: Python
python3 -m http.server 8000

# opção 2: extensão "Live Server" do VS Code
```

Depois acesse `http://localhost:8000`.

## 3. Configuração do Firebase Console

O `js/firebase.js` já está com as credenciais do seu projeto
(`flashfood-e1da4`). Falta habilitar os serviços no console:

1. **Authentication** → Sign-in method → habilite **E-mail/senha**.
2. **Firestore Database** → crie o banco (modo produção).
3. Crie as coleções abaixo (podem ser criadas manualmente ou automaticamente
   assim que você cadastrar produtos/pedidos pelo painel):
   - `produtos` — nome, descricao, categoria, preco, emoji, disponivel
   - `usuarios` — nome, telefone, endereco, email, admin (boolean)
   - `pedidos` — criado automaticamente pelo checkout
   - `cupons` — codigo, desconto (número, ex.: 10), ativo (boolean)

### Tornar um usuário administrador

Por padrão, todo cadastro cria `admin: false`. Para liberar o painel
administrativo (`admin.html`) para alguém:

1. Peça para a pessoa criar uma conta normalmente pela página de cadastro.
2. No Firestore Console, abra `usuarios/<uid da pessoa>`.
3. Mude o campo `admin` para `true`.

### Índice do Firestore (necessário)

A tela "Meus pedidos" e o painel administrativo usam consultas com filtro +
ordenação (`where uid == ... orderBy criadoEm`). Na primeira vez que isso
rodar, o Firebase mostra no console do navegador um link para **criar o
índice composto automaticamente** — é só clicar no link e aguardar alguns
minutos.

### Regras de segurança sugeridas (Firestore)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function ehAdmin() {
      return request.auth != null &&
        get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.admin == true;
    }

    match /produtos/{id} {
      allow read: if true;
      allow write: if ehAdmin();
    }
    match /cupons/{id} {
      allow read: if true;
      allow write: if ehAdmin();
    }
    match /usuarios/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      allow read: if ehAdmin();
    }
    match /pedidos/{id} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
      allow read: if request.auth != null &&
        (resource.data.uid == request.auth.uid || ehAdmin());
      allow update: if ehAdmin();
    }
  }
}
```

## 3.1 Sobre o erro "The query requires an index"

Se aparecer esse erro no console em alguma consulta futura que você mesmo
adicionar (com `where` + `orderBy` juntos), é normal — o Firestore pede um
índice composto para esse tipo de consulta. Duas opções:

1. Clicar no link que o próprio erro mostra no console do navegador (ele
   cria o índice automaticamente em alguns minutos), **ou**
2. Fazer como o projeto já faz na tela "Meus pedidos": buscar sem `orderBy`
   no Firestore e ordenar os resultados no JavaScript com `.sort()`.

## 4. Fluxo do sistema

- **Cliente**: cadastra-se → navega pelo cardápio → adiciona itens ao
  carrinho → finaliza o pedido com cupom opcional → acompanha o status em
  tempo real (Recebido → Preparando → Enviado → Entregue).
- **Administrador**: acessa `admin.html` com uma conta marcada como
  `admin: true` → cadastra/edita/exclui produtos e cupons → muda o status
  dos pedidos conforme eles avançam na cozinha/entrega.

## 4.1 Painel administrativo — recursos

- **Pausar/Reativar produto com 1 clique**, direto na listagem, sem abrir o
  formulário.
- **Motivo da indisponibilidade**: ao pausar um item pelo formulário, dá pra
  escrever o motivo (ex.: "Sem pão hoje"), que aparece para o cliente no
  cardápio no lugar do aviso genérico.
- **Busca e filtro por categoria** na aba Produtos.
- **Busca e filtro por status** (incluindo "Cancelado") na aba Pedidos.
- **Cartões de resumo** com totais de produtos ativos/pausados e pedidos por
  status.
- **Pausar/reativar cupons** com 1 clique, além de editar/excluir.

## 5. Personalização

- Cores, fontes e espaçamentos: `css/style.css` (variáveis no `:root`).
- Categorias do cardápio: edite as opções em `admin.html`
  (`#produtoCategoria`) e os botões de filtro em `cardapio.html`.
- Emojis dos produtos podem ser trocados por imagens reais: troque a `div
  .imagem-produto` no `js/app.js` por uma tag `<img>` apontando para a pasta
  `imagens/`.
