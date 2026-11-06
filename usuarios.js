// Gestão de usuários: só o administrador vê e usa esta área.
// Depende de api.js, auth.js e app.js ($, el, mostrarStatus).

const tabelaUsuarios = $("tabela-usuarios");
const dlgUsuario = $("dlg-usuario");
const formUsuario = $("form-usuario");
const caixasPermissao = $("u-permissoes");

let listaUsuarios = [];

// uma caixa de seleção para cada permissão
for (const p of PERMISSOES) {
  caixasPermissao.append(
    el("label", { class: "check" },
      el("input", { type: "checkbox", value: p.id }),
      ` ${p.rotulo}`,
    ),
  );
}
const caixas = () => [...caixasPermissao.querySelectorAll("input")];

document.addEventListener("sessao-pronta", () => {
  if (!Auth.ehAdmin()) return;
  $("usuarios").hidden = false;
  $("nav-usuarios").hidden = false;
  carregarUsuarios();
});

function resumoPermissoes(u) {
  if (u.papel === "admin") return "Tudo (administrador)";
  const rotulos = PERMISSOES
    .filter((p) => lerPermissoes(u.permissoes).includes(p.id))
    .map((p) => p.rotulo);
  return rotulos.length ? rotulos.join(", ") : "Somente visualizar";
}

function linhaMensagemUsuarios(texto, botao) {
  const celula = el("td", { class: "mensagem", colSpan: 5, text: texto });
  if (botao) celula.append(" ", botao);
  return el("tr", {}, celula);
}

function linhaUsuario(u) {
  const eu = String(u.id) === String(Auth.usuarioAtual().id);
  return el("tr", {},
    el("td", { text: eu ? `${u.nome} (você)` : u.nome }),
    el("td", { text: u.email }),
    el("td", {}, el("span", {
      class: u.papel === "admin" ? "selo" : "selo suave-selo",
      text: PAPEIS[u.papel === "admin" ? "admin" : "usuario"],
    })),
    el("td", { class: "quebra", text: resumoPermissoes(u) }),
    el("td", { class: "acoes-cel" },
      el("button", {
        type: "button", class: "link", text: "Gerenciar",
        "aria-label": `Gerenciar ${u.nome}`,
        onclick: () => abrirUsuario(u),
      }),
    ),
  );
}

async function carregarUsuarios() {
  tabelaUsuarios.replaceChildren(linhaMensagemUsuarios("Carregando usuários…"));
  try {
    listaUsuarios = await UsuariosAPI.listar();
    tabelaUsuarios.replaceChildren(...listaUsuarios.map(linhaUsuario));
  } catch (erro) {
    tabelaUsuarios.replaceChildren(
      linhaMensagemUsuarios(
        `Não foi possível carregar os usuários. ${erro.message}`,
        el("button", { type: "button", class: "link", text: "Tentar novamente", onclick: carregarUsuarios }),
      ),
    );
  }
}

// Administrador tem tudo marcado e travado.
function sincronizarPapel() {
  const admin = $("u-papel").value === "admin";
  for (const c of caixas()) {
    if (admin) c.checked = true;
    c.disabled = admin;
  }
}
$("u-papel").addEventListener("change", sincronizarPapel);

// u === null abre o formulário de novo usuário; senão, gerencia o usuário escolhido.
function abrirUsuario(u) {
  if (!Auth.ehAdmin()) return semPermissao();
  formUsuario.reset();
  $("u-erro").hidden = true;
  $("u-id").value = u ? u.id : "";

  // campos de cadastro só no modo "novo" (e só aí são obrigatórios)
  $("u-novo").hidden = Boolean(u);
  for (const id of ["u-nome", "u-email", "u-senha"]) $(id).required = !u;
  $("u-resumo").hidden = !u;
  if (u) $("u-resumo").textContent = `${u.nome} · ${u.email}`;

  $("u-papel").value = u?.papel === "admin" ? "admin" : "usuario";
  const marcadas = u ? lerPermissoes(u.permissoes) : [];
  for (const c of caixas()) c.checked = marcadas.includes(c.value);
  sincronizarPapel();

  $("dlg-usuario-titulo").textContent = u ? "Gerenciar usuário" : "Novo usuário";
  dlgUsuario.showModal();
  (u ? $("u-papel") : $("u-nome")).focus();
}

// Impede que o sistema fique sem nenhum administrador.
async function garantirOutroAdmin(idIgnorado) {
  const todos = await UsuariosAPI.listar();
  const outros = todos.filter((u) => u.papel === "admin" && String(u.id) !== String(idIgnorado));
  if (outros.length === 0) {
    throw new Error("Precisa existir pelo menos um administrador. Promova outra pessoa antes de rebaixar esta conta.");
  }
}

formUsuario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!Auth.ehAdmin()) return semPermissao();

  const id = $("u-id").value;
  const papel = $("u-papel").value;
  const permissoes = caixas().filter((c) => c.checked).map((c) => c.value);
  const botao = $("u-salvar");
  botao.disabled = true;
  $("u-erro").hidden = true;

  try {
    if (id) {
      const atual = await UsuariosAPI.buscarPorId(id);
      if (atual.papel === "admin" && papel !== "admin") await garantirOutroAdmin(id);
      const salvo = await UsuariosAPI.atualizar(id, {
        ...atual,
        papel,
        permissoes: gravarPermissoes(papel === "admin" ? PERMISSOES.map((p) => p.id) : permissoes),
      });
      dlgUsuario.close();
      if (String(id) === String(Auth.usuarioAtual().id)) {
        location.reload(); // o próprio admin mudou: recarrega para refletir o novo acesso
        return;
      }
      await carregarUsuarios();
      mostrarStatus(`Permissões de "${salvo.nome}" atualizadas.`);
    } else {
      const novo = await Auth.criarUsuario({
        nome: $("u-nome").value,
        email: $("u-email").value,
        senha: $("u-senha").value,
        papel,
        permissoes,
      });
      dlgUsuario.close();
      await carregarUsuarios();
      mostrarStatus(`Usuário "${novo.nome}" criado.`);
    }
  } catch (erro) {
    $("u-erro").textContent = `Não foi possível salvar. ${erro.message}`;
    $("u-erro").hidden = false;
  } finally {
    botao.disabled = false;
  }
});

$("u-cancelar").addEventListener("click", () => dlgUsuario.close());
$("btn-novo-usuario").addEventListener("click", () => abrirUsuario(null));
