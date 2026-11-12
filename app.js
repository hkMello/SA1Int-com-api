const MIN_ESTOQUE = 10;

if (!Auth.exigirLogin()) throw new Error("Sessão ausente: redirecionando para o login.");

const btnSair = document.getElementById("btn-sair");
btnSair.addEventListener("click", Auth.sair);

function aplicarSessao() {
  const u = Auth.usuarioAtual();
  $("usuario-nome").textContent = u.nome;
  $("usuario-papel").textContent = PAPEIS[u.papel];
  $("btn-nova").hidden = !Auth.pode("criar");
}

function semPermissao() {
  mostrarStatus("Você não tem permissão para essa ação.", "erro");
}

const tabela = $("tabela");
const statusEl = $("status");
const detalhe = $("detalhe");
const dlgForm = $("dlg-form");
const dlgExcluir = $("dlg-excluir");
const formPastilha = $("form-pastilha");

let pastilhas = [];
let filtro = "";
let alvoExclusao = null;
let temporizadorStatus;

const brl = (v) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const num = (v) => Number(v).toLocaleString("pt-BR");

function mostrarStatus(mensagem, tipo = "ok") {
  clearTimeout(temporizadorStatus);
  statusEl.textContent = mensagem;
  statusEl.className = tipo;
  statusEl.hidden = false;
  if (tipo === "ok") {
    temporizadorStatus = setTimeout(() => (statusEl.hidden = true), 4000);
  }
}

const estoqueBaixo = (p) => Number(p.quantidade) <= MIN_ESTOQUE;

// renderização 
function linhaMensagem(texto, botao) {
  const celula = el("td", { class: "mensagem", colSpan: 9, text: texto });
  if (botao) celula.append(" ", botao);
  return el("tr", {}, celula);
}

function acoesPastilha(p) {
  const botoes = [];
  if (Auth.pode("editar")) {
    botoes.push(el("button", {
      type: "button", class: "link", text: "Editar",
      "aria-label": `Editar ${p.nome}`,
      onclick: () => abrirFormulario(p),
    }));
  }
  if (Auth.pode("excluir")) {
    botoes.push(el("button", {
      type: "button", class: "link perigo", text: "Excluir",
      "aria-label": `Excluir ${p.nome}`,
      onclick: () => pedirExclusao(p),
    }));
  }
  return botoes.length ? botoes : [el("span", { class: "suave", text: "—" })];
}

function linhaPastilha(p) {
  const baixo = estoqueBaixo(p);
  // data-label alimenta o layout em cartões no celular (ver style.css).
  return el("tr", {},
    el("td", { "data-label": "ID", text: p.id }),
    el("td", { "data-label": "Nome", text: p.nome }),
    el("td", { "data-label": "Código", text: p.codigo }),
    el("td", { "data-label": "Categoria", text: p.categoria }),
    el("td", { "data-label": "Fornecedor", text: p.fornecedor }),
    el("td", { class: "num", "data-label": "Qtd.", text: num(p.quantidade) }),
    el("td", { class: "num", "data-label": "Preço", text: brl(p.preco) }),
    el("td", { "data-label": "Situação" }, el("span", {
      class: baixo ? "selo baixo" : "selo",
      text: baixo ? "Estoque baixo" : "Normal",
    })),
    el("td", { class: "acoes-cel", "data-label": "Ações" },
      el("div", { class: "acoes-linha" }, acoesPastilha(p)),
    ),
  );
}

function pastilhasFiltradas() {
  const termo = filtro.trim().toLowerCase();
  if (!termo) return pastilhas;
  return pastilhas.filter((p) =>
    [p.nome, p.codigo, p.categoria, p.fornecedor].some((v) =>
      String(v ?? "").toLowerCase().includes(termo),
    ),
  );
}

function renderizar() {
  const lista = pastilhasFiltradas();
  tabela.replaceChildren();

  if (pastilhas.length === 0) {
    tabela.append(linhaMensagem('Nenhuma pastilha cadastrada. Use "Nova pastilha" para começar.'));
  } else if (lista.length === 0) {
    tabela.append(linhaMensagem("Nenhuma pastilha corresponde ao filtro."));
  } else {
    tabela.append(...lista.map(linhaPastilha));
  }
  atualizarResumo();
}

function atualizarResumo() {
  $("ind-total").textContent = num(pastilhas.length);
  $("ind-unidades").textContent = num(pastilhas.reduce((s, p) => s + Number(p.quantidade || 0), 0));
  $("ind-baixo").textContent = num(pastilhas.filter(estoqueBaixo).length);
  $("ind-valor").textContent = brl(
    pastilhas.reduce((s, p) => s + Number(p.quantidade || 0) * Number(p.preco || 0), 0),
  );
}

async function carregar() {
  tabela.replaceChildren(linhaMensagem("Carregando pastilhas…"));
  try {
    pastilhas = await PastilhasAPI.listar();
    renderizar();
  } catch (erro) {
    tabela.replaceChildren(
      linhaMensagem(
        `Não foi possível carregar as pastilhas. ${erro.message}`,
        el("button", { type: "button", class: "link", text: "Tentar novamente", onclick: carregar }),
      ),
    );
  }
}

$("form-busca").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const id = $("busca-id").value;
  try {
    const p = await PastilhasAPI.buscarPorId(id);
    const campos = [
      ["ID", p.id], ["Nome", p.nome], ["Código", p.codigo],
      ["Categoria", p.categoria], ["Fornecedor", p.fornecedor],
      ["Quantidade", num(p.quantidade)], ["Preço", brl(p.preco)],
      ["Situação", estoqueBaixo(p) ? "Estoque baixo" : "Normal"],
    ];
    detalhe.replaceChildren(
      el("dl", {}, ...campos.flatMap(([rotulo, valor]) => [
        el("dt", { text: rotulo }),
        el("dd", { text: valor }),
      ])),
    );
    detalhe.hidden = false;
  } catch (erro) {
    detalhe.hidden = true;
    mostrarStatus(`Pastilha ${id}: ${erro.message}`, "erro");
  }
});

const campos = {
  id: $("f-id"), nome: $("f-nome"), codigo: $("f-codigo"),
  categoria: $("f-categoria"), fornecedor: $("f-fornecedor"),
  quantidade: $("f-quantidade"), preco: $("f-preco"),
};

function abrirFormulario(p) {
  if (!Auth.pode(p ? "editar" : "criar")) return semPermissao();
  formPastilha.reset();
  $("form-erro").hidden = true;
  campos.id.value = p ? p.id : "";
  if (p) {
    for (const chave of ["nome", "codigo", "categoria", "fornecedor", "quantidade", "preco"]) {
      campos[chave].value = p[chave];
    }
  }
  $("dlg-form-titulo").textContent = p ? "Editar pastilha" : "Nova pastilha";
  dlgForm.showModal();
  campos.nome.focus();
}

function lerFormulario() {
  return {
    nome: campos.nome.value.trim(),
    codigo: campos.codigo.value.trim(),
    categoria: campos.categoria.value.trim(),
    fornecedor: campos.fornecedor.value.trim(),
    quantidade: Number(campos.quantidade.value),
    preco: Number(campos.preco.value),
  };
}

formPastilha.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const id = campos.id.value;
  if (!Auth.pode(id ? "editar" : "criar")) return semPermissao();
  const dados = lerFormulario();
  const botao = $("btn-salvar");
  botao.disabled = true;
  $("form-erro").hidden = true;

  try {
    if (id) {
      const atualizada = await PastilhasAPI.atualizar(id, dados);
      pastilhas = pastilhas.map((p) => (String(p.id) === String(id) ? atualizada : p));
      mostrarStatus(`"${atualizada.nome}" atualizada.`);
    } else {
      const nova = await PastilhasAPI.criar(dados);
      pastilhas.push(nova);
      mostrarStatus(`"${nova.nome}" cadastrada.`);
    }
    dlgForm.close();
    renderizar();
  } catch (erro) {
    $("form-erro").textContent = `Não foi possível salvar. ${erro.message}`;
    $("form-erro").hidden = false;
  } finally {
    botao.disabled = false;
  }
});

$("btn-cancelar").addEventListener("click", () => dlgForm.close());
$("btn-nova").addEventListener("click", () => abrirFormulario(null));

function pedirExclusao(p) {
  if (!Auth.pode("excluir")) return semPermissao();
  alvoExclusao = p;
  $("excluir-texto").textContent = `Excluir "${p.nome}" (código ${p.codigo})? Esta ação não pode ser desfeita.`;
  $("excluir-erro").hidden = true;
  dlgExcluir.showModal();
}

$("btn-excluir-confirmar").addEventListener("click", async () => {
  if (!alvoExclusao) return;
  if (!Auth.pode("excluir")) return semPermissao();
  const botao = $("btn-excluir-confirmar");
  botao.disabled = true;
  try {
    await PastilhasAPI.excluir(alvoExclusao.id);
    pastilhas = pastilhas.filter((p) => String(p.id) !== String(alvoExclusao.id));
    mostrarStatus(`"${alvoExclusao.nome}" excluída.`);
    dlgExcluir.close();
    alvoExclusao = null;
    renderizar();
  } catch (erro) {
    $("excluir-erro").textContent = `Não foi possível excluir. ${erro.message}`;
    $("excluir-erro").hidden = false;
  } finally {
    botao.disabled = false;
  }
});

$("btn-excluir-cancelar").addEventListener("click", () => dlgExcluir.close());

$("filtro").addEventListener("input", (evento) => {
  filtro = evento.target.value;
  renderizar();
});

async function iniciar() {
  await Auth.atualizarSessao();
  if (!Auth.usuarioAtual()) return;
  aplicarSessao();
  document.dispatchEvent(new CustomEvent("sessao-pronta"));
  carregar();
}

aplicarSessao();
// Os scripts ficam no fim do <body>, mas não dependemos disso.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}
