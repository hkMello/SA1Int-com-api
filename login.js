if (Auth.usuarioAtual()) location.replace(PAGINA_PAINEL);

const formLogin = $("form-login");
const formCadastro = $("form-cadastro");
const aviso = $("aviso");

function mostrarErro(id, mensagem) {
  const erro = $(id);
  erro.textContent = mensagem;
  erro.hidden = false;
}

async function prepararTela() {
  try {
    if (await Auth.primeiroAcesso()) {
      $("t-auth").textContent = "Primeiro acesso";
      aviso.textContent = "Ainda não há usuários. A conta criada agora será o administrador do sistema.";
      formCadastro.hidden = false;
      $("c-nome").focus();
    } else {
      aviso.textContent = "Não tem conta? Peça ao administrador para criar uma para você.";
      formLogin.hidden = false;
      $("l-email").focus();
    }
  } catch (erro) {
    aviso.textContent = `Não foi possível verificar o acesso. ${erro.message}`;
    aviso.className = "erro";
    formLogin.hidden = false;
  }
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
    await Auth.criarPrimeiroAdmin({ nome: $("c-nome").value, email: $("c-email").value, senha });
    location.replace(PAGINA_PAINEL);
  } catch (erro) {
    mostrarErro("cadastro-erro", erro.message);
  } finally {
    botao.disabled = false;
  }
});

prepararTela();
