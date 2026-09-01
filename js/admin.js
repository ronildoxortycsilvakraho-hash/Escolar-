// js/admin.js
// Painel administrativo: controle de acesso, CRUD de produtos/cupons e gestão de pedidos em tempo real.

import {
  auth, db, onAuthStateChanged,
  collection, doc, addDoc, setDoc, getDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy
} from "./firebase.js";

const formatarPreco = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ---------------- Controle de acesso ---------------- */
onAuthStateChanged(auth, async (user) => {
  const bloqueio = document.getElementById("bloqueioAcesso");
  const conteudo = document.getElementById("conteudoAdmin");
  if (!user) {
    bloqueio.style.display = "block";
    conteudo.style.display = "none";
    return;
  }
  try {
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    const ehAdmin = snap.exists() && snap.data().admin === true;
    if (ehAdmin) {
      bloqueio.style.display = "none";
      conteudo.style.display = "block";
      iniciarPainel();
    } else {
      bloqueio.style.display = "block";
      conteudo.style.display = "none";
    }
  } catch {
    bloqueio.style.display = "block";
    conteudo.style.display = "none";
  }
});

let painelIniciado = false;
function iniciarPainel() {
  if (painelIniciado) return;
  painelIniciado = true;
  iniciarAbas();
  escutarProdutos();
  escutarCupons();
  escutarPedidos();
  configurarModaisProduto();
  configurarModaisCupom();
  configurarFiltrosProdutos();
  configurarFiltrosPedidos();
}

/* ---------------- Abas ---------------- */
function iniciarAbas() {
  document.querySelectorAll(".aba-admin").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".aba-admin").forEach(b => b.classList.remove("ativo"));
      document.querySelectorAll(".painel-aba").forEach(p => p.classList.remove("ativo"));
      btn.classList.add("ativo");
      document.getElementById("aba" + capitalizar(btn.dataset.aba)).classList.add("ativo");
    });
  });
}
function capitalizar(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ==================================================
   PRODUTOS
   ================================================== */
let produtosCache = {};
let categoriaAdminAtiva = "Todos";
let termoBuscaProdutoAdmin = "";

function escutarProdutos() {
  onSnapshot(query(collection(db, "produtos"), orderBy("categoria")), snap => {
    produtosCache = {};
    snap.forEach(d => { produtosCache[d.id] = { id: d.id, ...d.data() }; });
    renderizarProdutosAdmin();
  });
}

function configurarFiltrosProdutos() {
  document.querySelectorAll("#filtrosCategoriaAdmin .filtro-status").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#filtrosCategoriaAdmin .filtro-status").forEach(b => b.classList.remove("ativo"));
      btn.classList.add("ativo");
      categoriaAdminAtiva = btn.dataset.categoria;
      renderizarProdutosAdmin();
    });
  });
  document.getElementById("buscaProdutoAdmin")?.addEventListener("input", (e) => {
    termoBuscaProdutoAdmin = e.target.value.toLowerCase();
    renderizarProdutosAdmin();
  });
}

function renderizarProdutosAdmin() {
  const todos = Object.values(produtosCache);
  const lista = document.getElementById("listaProdutosAdmin");

  document.getElementById("totalProdutosResumo").textContent = todos.length;
  document.getElementById("totalAtivosResumo").textContent = todos.filter(p => p.disponivel !== false).length;
  document.getElementById("totalPausadosResumo").textContent = todos.filter(p => p.disponivel === false).length;

  let filtrados = todos;
  if (categoriaAdminAtiva !== "Todos") filtrados = filtrados.filter(p => p.categoria === categoriaAdminAtiva);
  if (termoBuscaProdutoAdmin) filtrados = filtrados.filter(p => p.nome.toLowerCase().includes(termoBuscaProdutoAdmin));

  if (todos.length === 0) {
    lista.innerHTML = "<p style='color:#a0948a;'>Nenhum produto cadastrado. Clique em “+ Novo produto”.</p>";
    return;
  }
  if (filtrados.length === 0) {
    lista.innerHTML = "<p style='color:#a0948a;'>Nenhum produto encontrado para esse filtro.</p>";
    return;
  }

  lista.innerHTML = filtrados.map(p => {
    const pausado = p.disponivel === false;
    return `
      <div class="linha-produto-admin">
        <div class="emoji-produto">${p.emoji || "🍽️"}</div>
        <div class="info-produto-admin">
          <h4>${p.nome} ${pausado ? '<span class="tag-indisponivel-admin">Pausado</span>' : ""}</h4>
          <span>${p.categoria} · ${formatarPreco(p.preco)}</span>
          ${pausado && p.motivo ? `<br><span class="motivo-indisponivel-admin">Motivo: ${p.motivo}</span>` : ""}
        </div>
        <div class="acoes-produto">
          <button class="${pausado ? "ativar" : "pausar"}" data-alternar="${p.id}">${pausado ? "Reativar" : "Pausar"}</button>
          <button data-editar="${p.id}">Editar</button>
          <button class="excluir" data-excluir="${p.id}">Excluir</button>
        </div>
      </div>`;
  }).join("");

  lista.querySelectorAll("[data-editar]").forEach(btn => {
    btn.addEventListener("click", () => abrirModalProduto(produtosCache[btn.dataset.editar]));
  });
  lista.querySelectorAll("[data-excluir]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Tem certeza que deseja excluir este produto?")) {
        await deleteDoc(doc(db, "produtos", btn.dataset.excluir));
      }
    });
  });
  lista.querySelectorAll("[data-alternar]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const produto = produtosCache[btn.dataset.alternar];
      if (!produto) return;
      const estaPausado = produto.disponivel === false;
      await updateDoc(doc(db, "produtos", produto.id), {
        disponivel: estaPausado ? true : false,
        motivo: estaPausado ? "" : (produto.motivo || "Pausado pela administração")
      });
    });
  });
}

function abrirModalProduto(produto) {
  document.getElementById("tituloModalProduto").textContent = produto ? "Editar produto" : "Novo produto";
  document.getElementById("produtoId").value = produto ? produto.id : "";
  document.getElementById("produtoNome").value = produto ? produto.nome : "";
  document.getElementById("produtoDescricao").value = produto ? (produto.descricao || "") : "";
  document.getElementById("produtoCategoria").value = produto ? produto.categoria : "Lanches";
  document.getElementById("produtoPreco").value = produto ? produto.preco : "";
  document.getElementById("produtoEmoji").value = produto ? (produto.emoji || "") : "";
  document.getElementById("produtoMotivo").value = produto ? (produto.motivo || "") : "";
  const disponivel = produto ? produto.disponivel !== false : true;
  document.getElementById("produtoDisponivel").checked = disponivel;
  document.getElementById("campoMotivoIndisponivel").style.display = disponivel ? "none" : "block";
  document.getElementById("modalProduto").classList.add("aberto");
}

function configurarModaisProduto() {
  document.getElementById("btnNovoProduto")?.addEventListener("click", () => abrirModalProduto(null));

  document.getElementById("produtoDisponivel")?.addEventListener("change", (e) => {
    document.getElementById("campoMotivoIndisponivel").style.display = e.target.checked ? "none" : "block";
  });

  document.getElementById("formProduto")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("produtoId").value;
    const disponivel = document.getElementById("produtoDisponivel").checked;
    const dados = {
      nome: document.getElementById("produtoNome").value.trim(),
      descricao: document.getElementById("produtoDescricao").value.trim(),
      categoria: document.getElementById("produtoCategoria").value,
      preco: parseFloat(document.getElementById("produtoPreco").value) || 0,
      emoji: document.getElementById("produtoEmoji").value.trim() || "🍽️",
      disponivel,
      motivo: disponivel ? "" : document.getElementById("produtoMotivo").value.trim()
    };
    if (id) {
      await updateDoc(doc(db, "produtos", id), dados);
    } else {
      await addDoc(collection(db, "produtos"), dados);
    }
    document.getElementById("modalProduto").classList.remove("aberto");
  });
}

/* ==================================================
   CUPONS
   ================================================== */
let cuponsCache = {};

function escutarCupons() {
  onSnapshot(collection(db, "cupons"), snap => {
    cuponsCache = {};
    const lista = document.getElementById("listaCuponsAdmin");
    if (snap.empty) {
      lista.innerHTML = "<p style='color:#a0948a;'>Nenhum cupom cadastrado.</p>";
      return;
    }
    let html = "";
    snap.forEach(d => {
      const c = { id: d.id, ...d.data() };
      cuponsCache[c.id] = c;
      html += `
        <div class="linha-produto-admin">
          <div class="emoji-produto">🎟️</div>
          <div class="info-produto-admin">
            <h4>${c.codigo} ${c.ativo === false ? '<span class="tag-indisponivel-admin">Inativo</span>' : ""}</h4>
            <span>${c.desconto}% de desconto</span>
          </div>
          <div class="acoes-produto">
            <button class="${c.ativo === false ? "ativar" : "pausar"}" data-alternar-cupom="${c.id}">${c.ativo === false ? "Reativar" : "Pausar"}</button>
            <button data-editar-cupom="${c.id}">Editar</button>
            <button class="excluir" data-excluir-cupom="${c.id}">Excluir</button>
          </div>
        </div>`;
    });
    lista.innerHTML = html;

    lista.querySelectorAll("[data-editar-cupom]").forEach(btn => {
      btn.addEventListener("click", () => abrirModalCupom(cuponsCache[btn.dataset.editarCupom]));
    });
    lista.querySelectorAll("[data-excluir-cupom]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (confirm("Excluir este cupom?")) {
          await deleteDoc(doc(db, "cupons", btn.dataset.excluirCupom));
        }
      });
    });
    lista.querySelectorAll("[data-alternar-cupom]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const cupom = cuponsCache[btn.dataset.alternarCupom];
        if (!cupom) return;
        await updateDoc(doc(db, "cupons", cupom.id), { ativo: cupom.ativo === false ? true : false });
      });
    });
  });
}

let cupomEditandoId = null;
function abrirModalCupom(cupom) {
  cupomEditandoId = cupom ? cupom.id : null;
  document.getElementById("cupomCodigo").value = cupom ? cupom.codigo : "";
  document.getElementById("cupomDesconto").value = cupom ? cupom.desconto : "";
  document.getElementById("cupomAtivo").checked = cupom ? cupom.ativo !== false : true;
  document.getElementById("modalCupom").classList.add("aberto");
}

function configurarModaisCupom() {
  document.getElementById("btnNovoCupom")?.addEventListener("click", () => abrirModalCupom(null));

  document.getElementById("formCupom")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dados = {
      codigo: document.getElementById("cupomCodigo").value.trim().toUpperCase(),
      desconto: parseFloat(document.getElementById("cupomDesconto").value) || 0,
      ativo: document.getElementById("cupomAtivo").checked
    };
    if (cupomEditandoId) {
      await updateDoc(doc(db, "cupons", cupomEditandoId), dados);
    } else {
      await addDoc(collection(db, "cupons"), dados);
    }
    document.getElementById("modalCupom").classList.remove("aberto");
  });
}

/* ---------------- Fechar modais ---------------- */
document.querySelectorAll(".fechar-modal").forEach(btn => {
  btn.addEventListener("click", () => {
    document.getElementById(btn.dataset.fechar).classList.remove("aberto");
  });
});
document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("aberto");
  });
});

/* ==================================================
   PEDIDOS
   ================================================== */
const ETAPAS_STATUS = ["Recebido", "Preparando", "Enviado", "Entregue"];
const TODOS_STATUS_ADMIN = [...ETAPAS_STATUS, "Cancelado"];

let pedidosCache = [];
let statusFiltroAtivo = "Todos";
let termoBuscaPedidoAdmin = "";

function escutarPedidos() {
  onSnapshot(query(collection(db, "pedidos"), orderBy("criadoEm", "desc")), snap => {
    pedidosCache = [];
    snap.forEach(d => pedidosCache.push({ id: d.id, ...d.data() }));
    atualizarResumoPedidos(pedidosCache);
    renderizarPedidosAdmin();
  });
}

function configurarFiltrosPedidos() {
  document.querySelectorAll("#filtrosStatusPedido .filtro-status").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#filtrosStatusPedido .filtro-status").forEach(b => b.classList.remove("ativo"));
      btn.classList.add("ativo");
      statusFiltroAtivo = btn.dataset.status;
      renderizarPedidosAdmin();
    });
  });
  document.getElementById("buscaPedidoAdmin")?.addEventListener("input", (e) => {
    termoBuscaPedidoAdmin = e.target.value.toLowerCase();
    renderizarPedidosAdmin();
  });
}

function renderizarPedidosAdmin() {
  const lista = document.getElementById("listaPedidosAdmin");
  if (pedidosCache.length === 0) {
    lista.innerHTML = "<p style='color:#a0948a;'>Nenhum pedido recebido ainda.</p>";
    return;
  }

  let filtrados = pedidosCache;
  if (statusFiltroAtivo !== "Todos") filtrados = filtrados.filter(p => (p.status || "Recebido") === statusFiltroAtivo);
  if (termoBuscaPedidoAdmin) {
    filtrados = filtrados.filter(p =>
      (p.clienteNome || "").toLowerCase().includes(termoBuscaPedidoAdmin) ||
      p.id.toLowerCase().includes(termoBuscaPedidoAdmin)
    );
  }

  if (filtrados.length === 0) {
    lista.innerHTML = "<p style='color:#a0948a;'>Nenhum pedido encontrado para esse filtro.</p>";
    return;
  }

  lista.innerHTML = filtrados.map(p => `
    <div class="cartao-pedido-admin status-${(p.status || "recebido").toLowerCase()}">
      <div class="cabecalho-pedido-admin">
        <h3>#${p.id.slice(0, 6).toUpperCase()} — ${p.clienteNome || "Cliente"}</h3>
        <span>${formatarPreco(p.total)}</span>
      </div>
      <div class="itens-pedido-admin">
        ${p.itens.map(i => `${i.qtd}x ${i.nome}`).join(", ")}
        <br>📍 ${p.endereco || "-"} · 📞 ${p.telefone || "-"}
        ${p.cupom ? `<br>🎟️ Cupom: ${p.cupom}` : ""}
        ${p.observacao ? `<br>📝 ${p.observacao}` : ""}
      </div>
      <div class="rodape-pedido-admin">
        <select data-pedido="${p.id}">
          ${TODOS_STATUS_ADMIN.map(s => `<option value="${s}" ${p.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
    </div>
  `).join("");

  lista.querySelectorAll("select[data-pedido]").forEach(select => {
    select.addEventListener("change", async () => {
      await updateDoc(doc(db, "pedidos", select.dataset.pedido), { status: select.value });
    });
  });
}

function atualizarResumoPedidos(pedidos) {
  const hoje = new Date();
  const pedidosHoje = pedidos.filter(p => {
    const data = p.criadoEm?.toDate ? p.criadoEm.toDate() : null;
    return data && data.toDateString() === hoje.toDateString();
  });
  document.getElementById("totalPedidosResumo").textContent = pedidosHoje.length;
  document.getElementById("totalRecebidoResumo").textContent = pedidos.filter(p => p.status === "Recebido").length;
  document.getElementById("totalPreparandoResumo").textContent = pedidos.filter(p => p.status === "Preparando").length;
  document.getElementById("totalEnviadoResumo").textContent = pedidos.filter(p => p.status === "Enviado").length;
}
