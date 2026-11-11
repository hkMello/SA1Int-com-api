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
