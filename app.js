
const API_URL = "https://6abaf4585b549d818d62bc4d.mockapi.io/api-dda/pastilhas";

const $ = (id) => document.getElementById(id);
const formPastilha = $("form-pastilha");
const tabela = $("tabela");
const detalhe = $("detalhe");
const statusEl = $("status");
let pastilhas = [];

function mostrarStatus(msg, tipo = "ok") {
  statusEl.textContent = msg;
  statusEl.className = tipo;
  statusEl.hidden = false;
}

const brl = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function requisicao(url, opcoes) {
  const resposta = await fetch(url, opcoes);
  if (!resposta.ok) {
    throw new Error(`Falha na API (HTTP ${resposta.status})`);
  }
  return resposta.json();
}

function escapar(texto) {
  const d = document.createElement("div");
  d.textContent = texto ?? "";
  return d.innerHTML;
}

async function listarPastilhas() {
  try {
    pastilhas = await requisicao(API_URL);
    renderizarTabela();
  } catch (e) {
    mostrarStatus(`Não foi possível carregar as pastilhas. ${e.message}`, "erro");
  }
}

function renderizarTabela() {
  if (pastilhas.length === 0) {
    tabela.innerHTML = `<tr><td colspan="8" class="vazio">Nenhuma pastilha cadastrada. Use o formulário acima.</td></tr>`;
    return;
  }
  tabela.innerHTML = pastilhas.map((p) => `
    <tr>
      <td>${escapar(p.id)}</td>
      <td>${escapar(p.nome)}</td>
      <td>${escapar(p.codigo)}</td>
      <td>${escapar(p.quantidade)}</td>
      <td>${escapar(p.categoria)}</td>
      <td>${escapar(p.fornecedor)}</td>
      <td>${brl(p.preco)}</td>
      <td class="acoes-cel">
        <button type="button" data-acao="editar" data-id="${escapar(p.id)}" class="sec">Editar</button>
        <button type="button" data-acao="excluir" data-id="${escapar(p.id)}" class="perigo">Excluir</button>
      </td>
    </tr>`).join("");
}

async function buscarPastilha(id) {
  try {
    const p = await requisicao(`${API_URL}/${id}`);
    detalhe.innerHTML = `
      <dl>
        <dt>ID</dt><dd>${escapar(p.id)}</dd>
        <dt>Nome</dt><dd>${escapar(p.nome)}</dd>
        <dt>Código</dt><dd>${escapar(p.codigo)}</dd>
        <dt>Quantidade</dt><dd>${escapar(p.quantidade)}</dd>
        <dt>Categoria</dt><dd>${escapar(p.categoria)}</dd>
        <dt>Fornecedor</dt><dd>${escapar(p.fornecedor)}</dd>
        <dt>Preço</dt><dd>${brl(p.preco)}</dd>
      </dl>`;
    detalhe.hidden = false;
    mostrarStatus(`Pastilha ${id} encontrada.`);
  } catch (e) {
    detalhe.hidden = true;
    mostrarStatus(`Pastilha ${id} não encontrada. ${e.message}`, "erro");
  }
}

async function criarPastilha(dados) {
  const nova = await requisicao(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  pastilhas.push(nova); 
  renderizarTabela();
  mostrarStatus(`Pastilha "${nova.nome}" cadastrada.`);
}

async function atualizarPastilha(id, dados) {
  const atualizada = await requisicao(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  pastilhas = pastilhas.map((p) => (String(p.id) === String(id) ? atualizada : p));
  renderizarTabela();
  mostrarStatus(`Pastilha "${atualizada.nome}" atualizada.`);
}

async function excluirPastilha(id) {
  await requisicao(`${API_URL}/${id}`, { method: "DELETE" });
  pastilhas = pastilhas.filter((p) => String(p.id) !== String(id));
  renderizarTabela();
  mostrarStatus(`Pastilha ${id} excluída.`);
}

function lerFormulario() {
  return {
    nome: $("nome").value.trim(),
    codigo: $("codigo").value.trim(),
    quantidade: Number($("quantidade").value),
    categoria: $("categoria").value.trim(),
    fornecedor: $("fornecedor").value.trim(),
    preco: Number($("preco").value),
  };
}

function entrarModoEdicao(p) {
  $("id").value = p.id;
  ["nome", "codigo", "quantidade", "categoria", "fornecedor", "preco"].forEach((c) => {
    $(c).value = p[c];
  });
  $("btn-salvar").textContent = "Salvar alterações";
  $("btn-cancelar").hidden = false;
  formPastilha.scrollIntoView({ behavior: "smooth" });
}

function sairModoEdicao() {
  formPastilha.reset();
  $("id").value = "";
  $("btn-salvar").textContent = "Cadastrar";
  $("btn-cancelar").hidden = true;
}

formPastilha.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const btn = $("btn-salvar");
  const id = $("id").value;
  btn.disabled = true;
  try {
    if (id) await atualizarPastilha(id, lerFormulario());
    else await criarPastilha(lerFormulario());
    sairModoEdicao();
  } catch (e) {
    mostrarStatus(`Não foi possível salvar. ${e.message}`, "erro");
  } finally {
    btn.disabled = false;
  }
});

$("btn-cancelar").addEventListener("click", sairModoEdicao);

$("form-busca").addEventListener("submit", (evento) => {
  evento.preventDefault();
  buscarPastilha($("busca-id").value);
});

tabela.addEventListener("click", async (evento) => {
  const btn = evento.target.closest("button[data-acao]");
  if (!btn) return;
  const { acao, id } = btn.dataset;
  if (acao === "editar") {
    entrarModoEdicao(pastilhas.find((p) => String(p.id) === id));
  } else if (acao === "excluir" && confirm("Excluir esta pastilha?")) {
    try {
      await excluirPastilha(id);
    } catch (e) {
      mostrarStatus(`Não foi possível excluir. ${e.message}`, "erro");
    }
  }
});

listarPastilhas();
