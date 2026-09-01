// js/carrinho.js
// Carrinho de compras: guardado no localStorage do navegador,
// funciona em todas as páginas que tenham o painel lateral no HTML.

const CHAVE_CARRINHO = "ita_carrinho";

export function obterCarrinho() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CARRINHO)) || [];
  } catch {
    return [];
  }
}

export function salvarCarrinho(carrinho) {
  localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
  renderizarCarrinho();
  window.dispatchEvent(new CustomEvent("carrinho-atualizado"));
}

export function adicionarAoCarrinho(produto) {
  const carrinho = obterCarrinho();
  const existente = carrinho.find(i => i.id === produto.id);
  if (existente) {
    existente.qtd += 1;
  } else {
    carrinho.push({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      emoji: produto.emoji || "🍽️",
      qtd: 1
    });
  }
  salvarCarrinho(carrinho);
  abrirPainelCarrinho();
}

export function alterarQuantidade(id, delta) {
  let carrinho = obterCarrinho();
  const item = carrinho.find(i => i.id === id);
  if (!item) return;
  item.qtd += delta;
  if (item.qtd <= 0) {
    carrinho = carrinho.filter(i => i.id !== id);
  }
  salvarCarrinho(carrinho);
}

export function removerDoCarrinho(id) {
  const carrinho = obterCarrinho().filter(i => i.id !== id);
  salvarCarrinho(carrinho);
}

export function limparCarrinho() {
  salvarCarrinho([]);
}

export function calcularTotalCarrinho() {
  return obterCarrinho().reduce((soma, i) => soma + i.preco * i.qtd, 0);
}

export function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function abrirPainelCarrinho() {
  document.getElementById("painelCarrinho")?.classList.add("aberto");
  document.getElementById("overlayCarrinho")?.classList.add("aberto");
}

export function fecharPainelCarrinho() {
  document.getElementById("painelCarrinho")?.classList.remove("aberto");
  document.getElementById("overlayCarrinho")?.classList.remove("aberto");
}

export function renderizarCarrinho() {
  const carrinho = obterCarrinho();
  const container = document.getElementById("itensCarrinho");
  const contador = document.getElementById("contadorCarrinho");
  const totalEl = document.getElementById("totalCarrinho");

  const qtdTotal = carrinho.reduce((s, i) => s + i.qtd, 0);
  if (contador) contador.textContent = qtdTotal;
  if (totalEl) totalEl.textContent = formatarPreco(calcularTotalCarrinho());

  if (!container) return;

  if (carrinho.length === 0) {
    container.innerHTML = `<div class="vazio-carrinho">🛒<br>Seu carrinho está vazio.<br>Que tal dar uma olhada no cardápio?</div>`;
    return;
  }

  container.innerHTML = carrinho.map(item => `
    <div class="item-carrinho" data-id="${item.id}">
      <div class="icone-item">${item.emoji}</div>
      <div class="info-item">
        <h4>${item.nome}</h4>
        <div class="preco-item">${formatarPreco(item.preco * item.qtd)}</div>
        <div class="controle-qtd">
          <button data-acao="diminuir">−</button>
          <span>${item.qtd}</span>
          <button data-acao="aumentar">+</button>
        </div>
      </div>
      <button class="remover-item" data-acao="remover" aria-label="Remover item">🗑️</button>
    </div>
  `).join("");
}

// Delegação de eventos dentro do painel do carrinho
document.addEventListener("click", (e) => {
  const botao = e.target.closest("button[data-acao]");
  if (botao) {
    const linha = botao.closest(".item-carrinho");
    if (linha) {
      const id = linha.dataset.id;
      if (botao.dataset.acao === "aumentar") alterarQuantidade(id, 1);
      if (botao.dataset.acao === "diminuir") alterarQuantidade(id, -1);
      if (botao.dataset.acao === "remover") removerDoCarrinho(id);
      return;
    }
  }
  if (e.target.id === "abrirCarrinho" || e.target.closest("#abrirCarrinho")) {
    abrirPainelCarrinho();
  }
  if (e.target.id === "fecharCarrinho" || e.target.id === "overlayCarrinho") {
    fecharPainelCarrinho();
  }
});

renderizarCarrinho();
