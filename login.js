// Tela de login e cadastro. Depende de api.js e auth.js.

if (Auth.usuarioAtual()) location.replace(PAGINA_PAINEL);

const $ = (id) => document.getElementById(id);
const formLogin = $("form-login");
const formCadastro = $("form-cadastro");
const abaEntrar = $("aba-entrar");
const abaCadastro = $("aba-cadastro");

function mostrarAba(cadastro) {
  formLogin.hidden = cadastro;
  formCadastro.hidden = !cadastro;
  abaEntrar.setAttribute("aria-pressed", String(!cadastro));
  abaCadastro.setAttribute("aria-pressed", String(cadastro));
  $("t-auth").textContent = cadastro ? "Criar conta" : "Entrar";
  $("login-erro").hidden = true;
  $("cadastro-erro").hidden = true;
  (cadastro ? $("c-nome") : $("l-email")).focus();
}

abaEntrar.addEventListener("click", () => mostrarAba(false));
abaCadastro.addEventListener("click", () => mostrarAba(true));

function mostrarErro(id, mensagem) {
  const erro = $(id);
  erro.textContent = mensagem;
  erro.hidden = false;
}

formLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  $("login-erro").hidden = true;
  if (!formLogin.reportValidity()) return;

  const botao = $("btn-login");
  botao.disabled = true;
  try {
    await Auth.entrar({ email: $("l-email").value, senha: $("l-senha").value });
    location.replace(PAGINA_PAINEL);
  } catch (erro) {
    mostrarErro("login-erro", erro.message);
  } finally {
    botao.disabled = false;
  }
});

formCadastro.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  $("cadastro-erro").hidden = true;
  if (!formCadastro.reportValidity()) return;

  const senha = $("c-senha").value;
  if (senha !== $("c-confirma").value) {
    mostrarErro("cadastro-erro", "As senhas não conferem.");
    return;
  }

  const botao = $("btn-cadastro");
  botao.disabled = true;
  try {
    await Auth.cadastrar({ nome: $("c-nome").value, email: $("c-email").value, senha });
    location.replace(PAGINA_PAINEL);
  } catch (erro) {
    mostrarErro("cadastro-erro", erro.message);
  } finally {
    botao.disabled = false;
  }
});
