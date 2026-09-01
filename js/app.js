// js/app.js
// Lógica de interface comum + páginas: index, cardápio e pedido.

import {
  auth, db, onAuthStateChanged, signOut,
  collection, doc, getDoc, getDocs, addDoc, query, where, onSnapshot, serverTimestamp
} from "./firebase.js";
import {
  obterCarrinho, adicionarAoCarrinho, limparCarrinho,
  calcularTotalCarrinho, formatarPreco
} from "./carrinho.js";

/* ---------------- Menu mobile ---------------- */
document.getElementById("menuToggle")?.addEventListener("click", () => {
  document.getElementById("navPrincipal")?.classList.toggle("aberto");
});

/* ---------------- Área do usuário (header) ---------------- */
let usuarioAtual = null;
let usuarioEhAdmin = false;

function renderizarAreaUsuario() {
  const area = document.getElementById("areaUsuario");
  if (!area) return;

  if (usuarioAtual) {
    const primeiroNome = (usuarioAtual.nomeExibicao || usuarioAtual.email || "").split(" ")[0];
    area.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-weight:700; font-size:0.9rem; color:var(--creme-escuro);">Olá, ${primeiroNome}</span>
        <button id="btnSair" class="btn btn-secundario" style="padding:8px 14px; border-color:var(--creme-escuro); color:var(--creme-escuro);">Sair</button>
      </div>`;
    document.getElementById("btnSair")?.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "index.html";
    });
  } else {
    area.innerHTML = `
      <div style="display:flex; gap:10px;">
        <a href="login.html" class="btn btn-secundario" style="padding:8px 14px; border-color:var(--creme-escuro); color:var(--creme-escuro);">Entrar</a>
      </div>`;
  }

  document.querySelectorAll(".somente-admin").forEach(el => {
    el.style.display = usuarioEhAdmin ? "" : "none";
  });
  document.querySelectorAll(".somente-logado").forEach(el => {
    el.style.display = usuarioAtual ? "" : "none";
  });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    let nomeExibicao = user.email;
    try {
      const snap = await getDoc(doc(db, "usuarios", user.uid));
      if (snap.exists()) {
        nomeExibicao = snap.data().nome || nomeExibicao;
        usuarioEhAdmin = !!snap.data().admin;
      }
    } catch (e) { console.warn("Não foi possível carregar o perfil:", e); }
    usuarioAtual = { uid: user.uid, email: user.email, nomeExibicao };
  } else {
    usuarioAtual = null;
    usuarioEhAdmin = false;
  }
  renderizarAreaUsuario();
  window.dispatchEvent(new CustomEvent("usuario-pronto"));
  if (document.getElementById("resumoItensPedido")) iniciarPaginaPedido();
});

renderizarAreaUsuario();

/* ---------------- Cartão de produto (reutilizável) ---------------- */
function cartaoProdutoHTML(produto) {
  const indisponivel = produto.disponivel === false;
  return `
    <div class="cartao-produto ${indisponivel ? "item-indisponivel" : ""}" data-id="${produto.id}">
      <div class="imagem-produto">${produto.emoji || "🍽️"}</div>
      <div class="corpo">
        <h3>${produto.nome}</h3>
        <p class="desc">${produto.descricao || ""}</p>
        <div class="rodape-cartao">
          <span class="preco">${formatarPreco(Number(produto.preco) || 0)}</span>
          <button class="btn-add" data-acao="add-carrinho" ${indisponivel ? "disabled" : ""} aria-label="Adicionar ao carrinho">+</button>
        </div>
        ${indisponivel ? `<span style="font-size:0.75rem; font-weight:700; color:var(--vermelho);">${produto.motivo ? "Sem estoque: " + produto.motivo : "Indisponível no momento"}</span>` : ""}
      </div>
    </div>`;
}

function ativarBotoesAdicionar(container, produtosPorId) {
  container.querySelectorAll('[data-acao="add-carrinho"]').forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".cartao-produto").dataset.id;
      const produto = produtosPorId[id];
      if (produto) adicionarAoCarrinho(produto);
    });
  });
}

/* ---------------- Página inicial: destaques ---------------- */
const listaDestaques = document.getElementById("listaDestaques");
if (listaDestaques) {
  getDocs(collection(db, "produtos")).then(snap => {
    const produtos = [];
    snap.forEach(d => produtos.push({ id: d.id, ...d.data() }));
    const disponiveis = produtos.filter(p => p.disponivel !== false).slice(0, 4);
    if (disponiveis.length === 0) {
      listaDestaques.innerHTML = "<p>Nenhum produto cadastrado ainda. Volte em breve!</p>";
      return;
    }
    const porId = {};
    disponiveis.forEach(p => porId[p.id] = p);
    listaDestaques.innerHTML = disponiveis.map(cartaoProdutoHTML).join("");
    ativarBotoesAdicionar(listaDestaques, porId);
  }).catch(() => {
    listaDestaques.innerHTML = "<p>Não foi possível carregar os destaques agora.</p>";
  });
}

/* ---------------- Página de cardápio ---------------- */
const listaProdutos = document.getElementById("listaProdutos");
if (listaProdutos) {
  let todosProdutos = [];
  let categoriaAtiva = new URLSearchParams(window.location.search).get("categoria") || "Todos";
  let termoBusca = "";

  function renderizarLista() {
    let filtrados = todosProdutos;
    if (categoriaAtiva !== "Todos") {
      filtrados = filtrados.filter(p => p.categoria === categoriaAtiva);
    }
    if (termoBusca.trim() !== "") {
      const termo = termoBusca.toLowerCase();
      filtrados = filtrados.filter(p =>
        p.nome.toLowerCase().includes(termo) || (p.descricao || "").toLowerCase().includes(termo)
      );
    }
    if (filtrados.length === 0) {
      listaProdutos.innerHTML = "<p>Nenhum produto encontrado para esse filtro.</p>";
      return;
    }
    const porId = {};
    filtrados.forEach(p => porId[p.id] = p);
    listaProdutos.innerHTML = filtrados.map(cartaoProdutoHTML).join("");
    ativarBotoesAdicionar(listaProdutos, porId);
  }

  onSnapshot(collection(db, "produtos"), snap => {
    todosProdutos = [];
    snap.forEach(d => todosProdutos.push({ id: d.id, ...d.data() }));
    renderizarLista();
  }, () => {
    listaProdutos.innerHTML = "<p>Não foi possível carregar o cardápio agora.</p>";
  });

  document.querySelectorAll(".filtro-cat").forEach(btn => {
    if (btn.dataset.categoria === categoriaAtiva) btn.classList.add("ativo");
    else btn.classList.remove("ativo");
    btn.addEventListener("click", () => {
      categoriaAtiva = btn.dataset.categoria;
      document.querySelectorAll(".filtro-cat").forEach(b => b.classList.remove("ativo"));
      btn.classList.add("ativo");
      renderizarLista();
    });
  });

  document.getElementById("buscaProduto")?.addEventListener("input", (e) => {
    termoBusca = e.target.value;
    renderizarLista();
  });
}

/* ---------------- Página de pedido (checkout + acompanhamento) ---------------- */
let cupomAplicado = null;
let cancelarEscutaPedidoAtual = null;
let cancelarEscutaHistorico = null;

function renderizarResumoPedido() {
  const container = document.getElementById("resumoItensPedido");
  if (!container) return;
  const carrinho = obterCarrinho();

  if (carrinho.length === 0) {
    container.innerHTML = "<p style='color:#a0948a;'>Seu carrinho está vazio. Volte ao <a href='cardapio.html'>cardápio</a> para adicionar itens.</p>";
  } else {
    container.innerHTML = carrinho.map(item => `
      <div class="resumo-linha">
        <span>${item.qtd}x ${item.nome}</span>
        <span>${formatarPreco(item.preco * item.qtd)}</span>
      </div>
    `).join("");
  }

  const subtotal = calcularTotalCarrinho();
  const desconto = cupomAplicado ? subtotal * (cupomAplicado.desconto / 100) : 0;
  const total = subtotal - desconto;

  document.getElementById("subtotalPedido").textContent = formatarPreco(subtotal);
  document.getElementById("totalPedido").textContent = formatarPreco(total);
  const linhaDesconto = document.getElementById("linhaDesconto");
  if (cupomAplicado) {
    linhaDesconto.style.display = "flex";
    document.getElementById("valorDesconto").textContent = "- " + formatarPreco(desconto);
  } else {
    linhaDesconto.style.display = "none";
  }

  const btnConfirmar = document.getElementById("btnConfirmarPedido");
  if (btnConfirmar) btnConfirmar.disabled = carrinho.length === 0;
}

const ETAPAS_STATUS = ["Recebido", "Preparando", "Enviado", "Entregue"];

function trilhaStatusHTML(statusAtual) {
  if (statusAtual === "Cancelado") {
    return `<p style="margin-top:10px; font-weight:800; color:var(--vermelho);">❌ Este pedido foi cancelado.</p>`;
  }
  const indiceAtual = ETAPAS_STATUS.indexOf(statusAtual);
  return `
    <div class="trilha-status">
      ${ETAPAS_STATUS.map((etapa, i) => `
        <div class="etapa-status ${i <= indiceAtual ? "concluida" : ""}">
          <div class="bola">${i <= indiceAtual ? "✓" : i + 1}</div>
          <span class="rotulo">${etapa}</span>
        </div>
      `).join("")}
    </div>`;
}

function iniciarPaginaPedido() {
  const layout = document.getElementById("layoutPedido");
  if (!layout) return;

  renderizarResumoPedido();
  window.addEventListener("carrinho-atualizado", renderizarResumoPedido);

  const avisoLogin = document.getElementById("avisoLogin");
  const btnConfirmar = document.getElementById("btnConfirmarPedido");

  if (!usuarioAtual) {
    avisoLogin.style.display = "block";
    if (btnConfirmar) btnConfirmar.disabled = true;
    document.getElementById("acompanhamentoPedido").innerHTML = "<p style='color:#a0948a;'>Entre na sua conta para ver o status dos seus pedidos.</p>";
    document.getElementById("historicoPedidos").innerHTML = "";
    return;
  }
  avisoLogin.style.display = "none";

  // Preenche endereço/telefone salvos no cadastro, se existirem
  getDoc(doc(db, "usuarios", usuarioAtual.uid)).then(snap => {
    if (snap.exists()) {
      const dados = snap.data();
      const campoEndereco = document.getElementById("enderecoPedido");
      const campoTelefone = document.getElementById("telefonePedido");
      if (campoEndereco && !campoEndereco.value) campoEndereco.value = dados.endereco || "";
      if (campoTelefone && !campoTelefone.value) campoTelefone.value = dados.telefone || "";
    }
  });

  // Aplicar cupom
  document.getElementById("btnAplicarCupom")?.addEventListener("click", async () => {
    const codigo = document.getElementById("inputCupom").value.trim().toUpperCase();
    const mensagem = document.getElementById("mensagemCupom");
    if (!codigo) return;
    try {
      const q = query(collection(db, "cupons"), where("codigo", "==", codigo));
      const snap = await getDocs(q);
      let encontrado = null;
      snap.forEach(d => { if (d.data().ativo !== false) encontrado = d.data(); });
      if (encontrado) {
        cupomAplicado = encontrado;
        mensagem.style.color = "var(--verde)";
        mensagem.textContent = `Cupom aplicado! ${encontrado.desconto}% de desconto.`;
      } else {
        cupomAplicado = null;
        mensagem.style.color = "var(--vermelho)";
        mensagem.textContent = "Cupom inválido ou expirado.";
      }
      renderizarResumoPedido();
    } catch (e) {
      mensagem.style.color = "var(--vermelho)";
      mensagem.textContent = "Erro ao validar cupom.";
    }
  });

  // Confirmar pedido
  btnConfirmar?.addEventListener("click", async () => {
    const carrinho = obterCarrinho();
    if (carrinho.length === 0) return;
    const endereco = document.getElementById("enderecoPedido").value.trim();
    const telefone = document.getElementById("telefonePedido").value.trim();
    if (!endereco || !telefone) {
      alert("Preencha o endereço e o telefone para entrega.");
      return;
    }
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = "Enviando pedido...";

    const subtotal = calcularTotalCarrinho();
    const desconto = cupomAplicado ? subtotal * (cupomAplicado.desconto / 100) : 0;

    try {
      await addDoc(collection(db, "pedidos"), {
        uid: usuarioAtual.uid,
        clienteNome: usuarioAtual.nomeExibicao,
        itens: carrinho,
        subtotal,
        cupom: cupomAplicado ? cupomAplicado.codigo : null,
        desconto,
        total: subtotal - desconto,
        endereco,
        telefone,
        observacao: document.getElementById("obsPedido").value.trim(),
        status: "Recebido",
        criadoEm: serverTimestamp()
      });
      limparCarrinho();
      cupomAplicado = null;
      document.getElementById("inputCupom").value = "";
      document.getElementById("mensagemCupom").textContent = "";
      renderizarResumoPedido();
      alert("Pedido enviado com sucesso! Acompanhe o status ao lado.");
    } catch (e) {
      alert("Não foi possível enviar o pedido. Tente novamente.");
    } finally {
      btnConfirmar.textContent = "Confirmar pedido";
      btnConfirmar.disabled = false;
    }
  });

  // Acompanhamento em tempo real do pedido mais recente
  // (ordenação feita aqui no código, e não com orderBy no Firestore, para não
  // exigir a criação de um índice composto no console do Firebase)
  if (cancelarEscutaPedidoAtual) cancelarEscutaPedidoAtual();
  const qAtual = query(
    collection(db, "pedidos"),
    where("uid", "==", usuarioAtual.uid)
  );
  cancelarEscutaPedidoAtual = onSnapshot(qAtual, snap => {
    const pedidos = [];
    snap.forEach(d => pedidos.push({ id: d.id, ...d.data() }));
    pedidos.sort((a, b) => (b.criadoEm?.toMillis?.() || 0) - (a.criadoEm?.toMillis?.() || 0));

    const areaAcompanhamento = document.getElementById("acompanhamentoPedido");
    if (pedidos.length === 0) {
      areaAcompanhamento.innerHTML = "<p style='color:#a0948a;'>Você ainda não fez nenhum pedido.</p>";
    } else {
      const atual = pedidos[0];
      areaAcompanhamento.innerHTML = `
        <p style="font-weight:700;">Pedido #${atual.id.slice(0, 6).toUpperCase()} — ${formatarPreco(atual.total)}</p>
        ${trilhaStatusHTML(atual.status)}
      `;
    }

    const historico = document.getElementById("historicoPedidos");
    if (pedidos.length === 0) {
      historico.innerHTML = "<p style='color:#a0948a;'>Nenhum pedido ainda.</p>";
    } else {
      historico.innerHTML = pedidos.map(p => `
        <div class="cartao-pedido-hist">
          <div class="cabecalho-pedido">
            <strong>#${p.id.slice(0, 6).toUpperCase()}</strong>
            <span class="etiqueta-status ${(p.status || "").toLowerCase()}">${p.status}</span>
          </div>
          <div style="font-size:0.85rem; color:#6b5f55;">${p.itens.reduce((s, i) => s + i.qtd, 0)} item(ns) · ${formatarPreco(p.total)}</div>
        </div>
      `).join("");
    }
  });
}

// A página de pedido é inicializada dentro de onAuthStateChanged (acima),
// assim que sabemos se há um usuário logado ou não.
