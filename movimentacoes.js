// Histórico de movimentações (entradas e saídas).
// Depende de app.js: pastilhas, num, brl, mostrarStatus, semPermissao, atualizarPastilhaLocal.

const tabelaMov = $("tabela-mov");
const dlgMov = $("dlg-mov");
const formMov = $("form-mov");
const POR_PAGINA = 50;

let movimentacoes = [];
let movimentacoesCarregadas = false;
let limiteMov = POR_PAGINA;

const ROTULO_TIPO = { entrada: "Entrada", saida: "Saída" };

const dataHora = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};
const valorMov = (m) => Number(m.quantidade) * Number(m.precoUnitario || 0);
const sinalMov = (m) => (m.tipo === "entrada" ? "+" : "−");

// ---------- dados ----------
function montarMovimento({ pastilha, tipo, quantidade, saldoApos, origem, motivo }) {
  return {
    pastilhaId: String(pastilha.id),
    nome: pastilha.nome,
    codigo: pastilha.codigo,
    categoria: pastilha.categoria,
    tipo, // "entrada" | "saida"
    quantidade,
    saldoApos,
    precoUnitario: Number(pastilha.preco),
    origem, // "movimentacao" | "cadastro" | "ajuste"
    motivo,
    usuario: Auth.usuarioAtual().nome,
    data: new Date().toISOString(),
  };
}

function aplicarMovimentacoes() {
  renderizarHistorico();
  // Avisa os relatórios (relatorios.js) que o histórico mudou.
  document.dispatchEvent(new CustomEvent("movimentacoes-mudou"));
}

async function carregarMovimentacoes() {
  tabelaMov.replaceChildren(linhaMensagemMov("Carregando movimentações…"));
  try {
    movimentacoes = await MovimentacoesAPI.listar();
    movimentacoesCarregadas = true;
  } catch (erro) {
    movimentacoesCarregadas = false;
    tabelaMov.replaceChildren(
      linhaMensagemMov(
        `Não foi possível carregar o histórico. ${erro.message}`,
        el("button", { type: "button", class: "link", text: "Tentar novamente", onclick: carregarMovimentacoes }),
      ),
    );
    $("mov-resumo").textContent = "";
    $("mov-mais").hidden = true;
    document.dispatchEvent(new CustomEvent("movimentacoes-mudou"));
    return;
  }
  aplicarMovimentacoes();
}

// Chamado por app.js ao cadastrar/editar uma pastilha. Falha no histórico não desfaz o cadastro.
async function registrarMovimentoAutomatico(pastilha, delta, origem, motivo) {
  if (!delta || Number.isNaN(delta)) return;
  try {
    const mov = await MovimentacoesAPI.criar(
      montarMovimento({
        pastilha,
        tipo: delta > 0 ? "entrada" : "saida",
        quantidade: Math.abs(delta),
        saldoApos: Number(pastilha.quantidade),
        origem,
        motivo,
      }),
    );
    movimentacoes.push(mov);
    if (movimentacoesCarregadas) aplicarMovimentacoes();
  } catch (erro) {
    mostrarStatus(`Pastilha salva, mas o histórico não foi atualizado. ${erro.message}`, "erro");
  }
}

// ---------- renderização ----------
function linhaMensagemMov(texto, botao) {
  const celula = el("td", { class: "mensagem", colSpan: 9, text: texto });
  if (botao) celula.append(" ", botao);
  return el("tr", {}, celula);
}

function linhaMov(m) {
  return el("tr", {},
    el("td", { "data-label": "Data", text: dataHora(m.data) }),
    el("td", { "data-label": "Tipo" }, el("span", {
      class: `selo ${m.tipo === "entrada" ? "entrada" : "saida"}`,
      text: ROTULO_TIPO[m.tipo] ?? "—",
    })),
    el("td", { "data-label": "Modelo", text: m.nome }),
    el("td", { "data-label": "Código", text: m.codigo }),
    el("td", { class: "num", "data-label": "Qtd.", text: `${sinalMov(m)}${num(m.quantidade)}` }),
    el("td", { class: "num", "data-label": "Saldo após", text: m.saldoApos == null ? "—" : num(m.saldoApos) }),
    el("td", { class: "num", "data-label": "Valor", text: brl(valorMov(m)) }),
    el("td", { class: "quebra", "data-label": "Motivo", text: m.motivo || "—" }),
    el("td", { "data-label": "Responsável", text: m.usuario || "—" }),
  );
}

function movimentosFiltrados() {
  const tipo = $("mov-tipo").value;
  const termo = $("mov-busca").value.trim().toLowerCase();
  const de = $("mov-de").value ? new Date(`${$("mov-de").value}T00:00:00`).getTime() : null;
  const ate = $("mov-ate").value ? new Date(`${$("mov-ate").value}T23:59:59.999`).getTime() : null;

  return movimentacoes
    .filter((m) => {
      if (tipo && m.tipo !== tipo) return false;
      const t = new Date(m.data).getTime();
      if (de !== null && t < de) return false;
      if (ate !== null && t > ate) return false;
      if (termo && ![m.nome, m.codigo, m.motivo, m.usuario].some((v) => String(v ?? "").toLowerCase().includes(termo))) {
        return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.data) - new Date(a.data));
}

function renderizarHistorico() {
  if (!movimentacoesCarregadas) return;
  const lista = movimentosFiltrados();
  tabelaMov.replaceChildren();

  if (movimentacoes.length === 0) {
    tabelaMov.append(linhaMensagemMov("Nenhuma movimentação registrada ainda."));
  } else if (lista.length === 0) {
    tabelaMov.append(linhaMensagemMov("Nenhuma movimentação corresponde aos filtros."));
  } else {
    tabelaMov.append(...lista.slice(0, limiteMov).map(linhaMov));
  }

  const entradas = lista.filter((m) => m.tipo === "entrada").reduce((s, m) => s + Number(m.quantidade || 0), 0);
  const saidas = lista.filter((m) => m.tipo === "saida").reduce((s, m) => s + Number(m.quantidade || 0), 0);
  $("mov-resumo").textContent = lista.length
    ? `${num(lista.length)} ${lista.length === 1 ? "registro" : "registros"} · entradas: ${num(entradas)} un. · saídas: ${num(saidas)} un.`
    : "";

  const mais = $("mov-mais");
  mais.hidden = lista.length <= limiteMov;
  mais.textContent = `Mostrar mais (${num(lista.length - limiteMov)} restantes)`;
}

function aoMudarFiltro() {
  limiteMov = POR_PAGINA;
  renderizarHistorico();
}

for (const id of ["mov-tipo", "mov-busca", "mov-de", "mov-ate"]) {
  $(id).addEventListener("input", aoMudarFiltro);
}
$("mov-mais").addEventListener("click", () => {
  limiteMov += POR_PAGINA;
  renderizarHistorico();
});

$("btn-csv-mov").addEventListener("click", () => {
  const lista = movimentosFiltrados();
  if (lista.length === 0) return mostrarStatus("Não há movimentações para exportar.", "erro");
  baixarCSV(`movimentacoes-${hojeISO()}.csv`, [
    ["Data", "Tipo", "Modelo", "Código", "Categoria", "Quantidade", "Saldo após", "Preço unitário (R$)", "Valor (R$)", "Motivo", "Responsável"],
    ...lista.map((m) => [
      dataHora(m.data),
      ROTULO_TIPO[m.tipo] ?? "",
      m.nome,
      m.codigo,
      m.categoria ?? "",
      Number(m.quantidade),
      m.saldoApos == null ? "" : Number(m.saldoApos),
      Number(m.precoUnitario || 0),
      Math.round(valorMov(m) * 100) / 100,
      m.motivo ?? "",
      m.usuario ?? "",
    ]),
  ]);
});

// ---------- registrar entrada/saída manual ----------
function atualizarSaldoMov() {
  const p = pastilhas.find((x) => String(x.id) === $("m-pastilha").value);
  $("m-saldo").hidden = !p;
  if (p) $("m-saldo").textContent = `Estoque atual: ${num(p.quantidade)} un.`;
}

function abrirMovimento() {
  if (!Auth.pode("movimentar")) return semPermissao();
  formMov.reset();
  $("m-erro").hidden = true;

  const ordenadas = [...pastilhas].sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
  $("m-pastilha").replaceChildren(
    el("option", { value: "", text: "Selecione…" }),
    ...ordenadas.map((p) => el("option", { value: String(p.id), text: `${p.nome} (${p.codigo})` })),
  );
  atualizarSaldoMov();
  dlgMov.showModal();
  $("m-pastilha").focus();
}

$("m-pastilha").addEventListener("change", atualizarSaldoMov);
$("btn-mov").addEventListener("click", abrirMovimento);
$("m-cancelar").addEventListener("click", () => dlgMov.close());

formMov.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!Auth.pode("movimentar")) return semPermissao();

  const id = $("m-pastilha").value;
  const tipo = $("m-tipo").value;
  const quantidade = Number($("m-quantidade").value);
  const motivo = $("m-motivo").value.trim();
  const botao = $("m-salvar");
  botao.disabled = true;
  $("m-erro").hidden = true;

  try {
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      throw new Error("Informe uma quantidade inteira maior que zero.");
    }
    // Busca o saldo atual na API para não depender de uma lista desatualizada.
    const atual = await PastilhasAPI.buscarPorId(id);
    const saldo = Number(atual.quantidade);
    const novoSaldo = tipo === "entrada" ? saldo + quantidade : saldo - quantidade;
    if (novoSaldo < 0) {
      throw new Error(`Saldo insuficiente: há ${num(saldo)} unidade(s) em estoque.`);
    }

    const atualizada = await PastilhasAPI.atualizar(id, { ...atual, quantidade: novoSaldo });
    let mov;
    try {
      mov = await MovimentacoesAPI.criar(
        montarMovimento({ pastilha: atualizada, tipo, quantidade, saldoApos: novoSaldo, origem: "movimentacao", motivo }),
      );
    } catch (erro) {
      // Sem registro no histórico, o saldo volta ao valor anterior.
      let revertido = true;
      try {
        await PastilhasAPI.atualizar(id, atual);
      } catch {
        revertido = false;
      }
      throw new Error(
        revertido
          ? erro.message
          : `${erro.message} Atenção: o saldo da pastilha foi alterado e não pôde ser revertido; confira o estoque.`,
      );
    }

    atualizarPastilhaLocal(atualizada);
    movimentacoes.push(mov);
    if (movimentacoesCarregadas) aplicarMovimentacoes();
    dlgMov.close();
    mostrarStatus(`${ROTULO_TIPO[tipo]} de ${num(quantidade)} un. de "${atual.nome}" registrada. Saldo: ${num(novoSaldo)}.`);
  } catch (erro) {
    $("m-erro").textContent = `Não foi possível registrar. ${erro.message}`;
    $("m-erro").hidden = false;
  } finally {
    botao.disabled = false;
  }
});

// ---------- inicialização ----------
document.addEventListener("sessao-pronta", () => {
  $("btn-mov").hidden = !Auth.pode("movimentar");
  carregarMovimentacoes();
});
