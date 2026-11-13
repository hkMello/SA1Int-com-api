const $ = (id) => document.getElementById(id);

function el(tag, props = {}, ...filhos) {
  const no = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props)) {
    if (chave === "class") no.className = valor;
    else if (chave === "text") no.textContent = valor;
    else if (chave.startsWith("aria-") || chave.startsWith("data-")) no.setAttribute(chave, valor);
    else no[chave] = valor;
  }
  no.append(...filhos.flat());
  return no;
}

const hojeISO = () => new Date().toLocaleDateString("sv-SE");

function baixarCSV(nomeArquivo, linhas) {
  const celula = (v) => {
    let s = typeof v === "number" ? String(v).replace(".", ",") : String(v ?? "");
    // Evita que o Excel interprete texto como fórmula.
    if (typeof v === "string" && /^[=+\-@]/.test(s)) s = `'${s}`;
    return /[;"\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const texto = "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
  const link = el("a", { href: url, download: nomeArquivo });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const CHAVE_TEMA = "dda_tema";

function iniciarTema() {
  const botao = document.getElementById("btn-tema");
  if (!botao) return;
  const raiz = document.documentElement;
  const escuro = () => raiz.dataset.tema === "escuro";
  const rotular = () => {
    botao.textContent = escuro() ? "☀ Tema claro" : "☾ Tema escuro";
  };
  rotular();
  botao.addEventListener("click", () => {
    raiz.dataset.tema = escuro() ? "claro" : "escuro";
    try {
      localStorage.setItem(CHAVE_TEMA, raiz.dataset.tema);
    } catch {
      
    }
    rotular();
  });
}

iniciarTema();
