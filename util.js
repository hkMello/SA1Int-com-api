// Helpers compartilhados por login.html e index.html.
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
