// Relatórios: consumo por modelo e valor em estoque.
// Dependem de `pastilhas` (app.js) e de `movimentacoes` (movimentacoes.js).

const tabelaConsumo = $("tabela-consumo");
const tabelaValor = $("tabela-valor");

let csvConsumo = [];
let csvValor = [];

const ROTULOS_GRUPO = { modelo: "Modelo", categoria: "Categoria", fornecedor: "Fornecedor" };

const percentual = (parte, total) => (total > 0 ? (parte / total) * 100 : 0);
const textoPercentual = (v) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const centavos = (v) => Math.round(v * 100) / 100;
const somar = (lista, campo) => lista.reduce((s, item) => s + item[campo], 0);

function linhaMensagemRel(colunas, texto) {
  return el("tr", {}, el("td", { class: "mensagem", colSpan: colunas, text: texto }));
}

function celulaPercentual(valor, rotulo) {
  const preenchimento = el("span");
  preenchimento.style.width = `${Math.min(100, valor)}%`;
  return el("td", { class: "num", "data-label": rotulo },
    el("span", { class: "barra" }, preenchimento),
    ` ${textoPercentual(valor)}`,
  );
}

// ---------- consumo por modelo ----------
function calcularConsumo(dias) {
  const inicio = dias > 0 ? Date.now() - dias * 86400000 : 0;
  const grupos = new Map();

  for (const m of movimentacoes) {
    // Só conta saídas reais; ajustes de edição e cadastro inicial não são consumo.
    if (m.tipo !== "saida" || m.origem === "ajuste") continue;
    if (new Date(m.data).getTime() < inicio) continue;

    const chave = String(m.pastilhaId);
    const g = grupos.get(chave) ?? { id: chave, nome: m.nome, codigo: m.codigo, saidas: 0, unidades: 0, valor: 0 };
    const qtd = Number(m.quantidade) || 0;
    g.saidas += 1;
    g.unidades += qtd;
    g.valor += qtd * (Number(m.precoUnitario) || 0);
    grupos.set(chave, g);
  }

  return [...grupos.values()].sort(
    (a, b) => b.unidades - a.unidades || String(a.nome).localeCompare(String(b.nome), "pt-BR"),
  );
}

function renderizarConsumo() {
  tabelaConsumo.replaceChildren();
  csvConsumo = [];

  if (!movimentacoesCarregadas) {
    tabelaConsumo.append(linhaMensagemRel(7, "Histórico de movimentações indisponível."));
    return;
  }

  const linhas = calcularConsumo(Number($("rel-periodo").value));
  if (linhas.length === 0) {
    tabelaConsumo.append(linhaMensagemRel(7, "Nenhuma saída registrada no período."));
    return;
  }

  const total = { saidas: somar(linhas, "saidas"), unidades: somar(linhas, "unidades"), valor: somar(linhas, "valor") };
  csvConsumo.push(["Modelo", "Código", "Saídas", "Unidades consumidas", "Valor consumido (R$)", "% do consumo", "Estoque atual"]);

  for (const g of linhas) {
    const atual = pastilhas.find((p) => String(p.id) === g.id);
    const pct = percentual(g.unidades, total.unidades);
    tabelaConsumo.append(
      el("tr", {},
        el("td", { "data-label": "Modelo", text: atual?.nome ?? g.nome }),
        el("td", { "data-label": "Código", text: atual?.codigo ?? g.codigo }),
        el("td", { class: "num", "data-label": "Saídas", text: num(g.saidas) }),
        el("td", { class: "num", "data-label": "Unidades", text: num(g.unidades) }),
        el("td", { class: "num", "data-label": "Valor consumido", text: brl(g.valor) }),
        celulaPercentual(pct, "% do consumo"),
        el("td", { class: "num", "data-label": "Estoque atual", text: atual ? num(atual.quantidade) : "Excluída" }),
      ),
    );
    csvConsumo.push([
      atual?.nome ?? g.nome, atual?.codigo ?? g.codigo, g.saidas, g.unidades,
      centavos(g.valor), centavos(pct), atual ? Number(atual.quantidade) : "Excluída",
    ]);
  }

  tabelaConsumo.append(
    el("tr", { class: "total" },
      el("td", { colSpan: 2, "data-label": "Modelo", text: "Total" }),
      el("td", { class: "num", "data-label": "Saídas", text: num(total.saidas) }),
      el("td", { class: "num", "data-label": "Unidades", text: num(total.unidades) }),
      el("td", { class: "num", colSpan: 3, "data-label": "Valor consumido", text: brl(total.valor) }),
    ),
  );
  csvConsumo.push(["Total", "", total.saidas, total.unidades, centavos(total.valor), 100, ""]);
}

// ---------- valor em estoque ----------
function calcularValor(chave) {
  const grupos = new Map();
  for (const p of pastilhas) {
    const rotulo = chave === "modelo"
      ? `${p.nome} (${p.codigo})`
      : String(p[chave] ?? "").trim() || "Não informado";
    const id = rotulo.toLowerCase();
    const g = grupos.get(id) ?? { rotulo, modelos: 0, unidades: 0, valor: 0 };
    const qtd = Number(p.quantidade) || 0;
    g.modelos += 1;
    g.unidades += qtd;
    g.valor += qtd * (Number(p.preco) || 0);
    grupos.set(id, g);
  }
  return [...grupos.values()].sort(
    (a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo, "pt-BR"),
  );
}

function renderizarValor() {
  const chave = $("rel-agrupar").value;
  const rotuloGrupo = ROTULOS_GRUPO[chave];
  $("th-grupo").textContent = rotuloGrupo;
  tabelaValor.replaceChildren();
  csvValor = [];

  if (pastilhas.length === 0) {
    tabelaValor.append(linhaMensagemRel(5, "Nenhuma pastilha cadastrada."));
    return;
  }

  const linhas = calcularValor(chave);
  const total = { modelos: somar(linhas, "modelos"), unidades: somar(linhas, "unidades"), valor: somar(linhas, "valor") };
  csvValor.push([rotuloGrupo, "Modelos", "Unidades", "Valor em estoque (R$)", "% do total"]);

  for (const g of linhas) {
    const pct = percentual(g.valor, total.valor);
    tabelaValor.append(
      el("tr", {},
        el("td", { "data-label": rotuloGrupo, text: g.rotulo }),
        el("td", { class: "num", "data-label": "Modelos", text: num(g.modelos) }),
        el("td", { class: "num", "data-label": "Unidades", text: num(g.unidades) }),
        el("td", { class: "num", "data-label": "Valor em estoque", text: brl(g.valor) }),
        celulaPercentual(pct, "% do total"),
      ),
    );
    csvValor.push([g.rotulo, g.modelos, g.unidades, centavos(g.valor), centavos(pct)]);
  }

  tabelaValor.append(
    el("tr", { class: "total" },
      el("td", { "data-label": rotuloGrupo, text: "Total" }),
      el("td", { class: "num", "data-label": "Modelos", text: num(total.modelos) }),
      el("td", { class: "num", "data-label": "Unidades", text: num(total.unidades) }),
      el("td", { class: "num", "data-label": "Valor em estoque", text: brl(total.valor) }),
      el("td", { class: "num", "data-label": "% do total", text: total.valor > 0 ? "100%" : "–" }),
    ),
  );
  csvValor.push(["Total", total.modelos, total.unidades, centavos(total.valor), total.valor > 0 ? 100 : 0]);
}

// ---------- eventos ----------
document.addEventListener("estoque-mudou", () => {
  renderizarValor();
  renderizarConsumo();
});
document.addEventListener("movimentacoes-mudou", renderizarConsumo);
$("rel-periodo").addEventListener("change", renderizarConsumo);
$("rel-agrupar").addEventListener("change", renderizarValor);

function exportar(nome, linhas) {
  if (linhas.length === 0) return mostrarStatus("Não há dados para exportar.", "erro");
  baixarCSV(`${nome}-${hojeISO()}.csv`, linhas);
}
$("btn-csv-consumo").addEventListener("click", () => exportar("consumo-por-modelo", csvConsumo));
$("btn-csv-valor").addEventListener("click", () => exportar("valor-em-estoque", csvValor));
