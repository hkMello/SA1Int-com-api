// Autenticação do painel. Depende de api.js (UsuariosAPI).
// Atenção: a validação acontece no navegador e os dados ficam no mockapi.io.
// Serve para a atividade, mas não substitui um back-end com JWT/sessão real.

const CHAVE_SESSAO = "dda_sessao";
const PAGINA_LOGIN = "login.html";
const PAGINA_PAINEL = "index.html";

const Auth = {
  usuarioAtual() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_SESSAO));
    } catch {
      return null;
    }
  },

  // Protege uma página: sem sessão, volta para o login.
  exigirLogin() {
    const usuario = Auth.usuarioAtual();
    if (!usuario) {
      location.replace(PAGINA_LOGIN);
      return null;
    }
    return usuario;
  },

  sair() {
    localStorage.removeItem(CHAVE_SESSAO);
    location.replace(PAGINA_LOGIN);
  },

  async cadastrar({ nome, email, senha }) {
    email = email.trim().toLowerCase();
    if (await UsuariosAPI.buscarPorEmail(email)) {
      throw new Error("Já existe uma conta com esse e-mail.");
    }
    const salt = gerarSalt();
    const usuario = await UsuariosAPI.criar({
      nome: nome.trim(),
      email,
      salt,
      senhaHash: await hash(salt + senha),
      criadoEm: new Date().toISOString(),
    });
    iniciarSessao(usuario);
  },

  async entrar({ email, senha }) {
    email = email.trim().toLowerCase();
    const usuario = await UsuariosAPI.buscarPorEmail(email);
    // Mesma mensagem para e-mail inexistente e senha errada.
    const invalido = new Error("E-mail ou senha incorretos.");
    if (!usuario) throw invalido;
    if ((await hash(usuario.salt + senha)) !== usuario.senhaHash) throw invalido;
    iniciarSessao(usuario);
  },
};

function iniciarSessao(usuario) {
  // Nunca guarda salt nem hash na sessão.
  localStorage.setItem(
    CHAVE_SESSAO,
    JSON.stringify({ id: usuario.id, nome: usuario.nome, email: usuario.email }),
  );
}

function gerarSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hash(texto) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Este navegador exige HTTPS ou localhost para proteger a senha. Abra o projeto por um servidor local (ex.: Live Server).");
  }
  const dados = new TextEncoder().encode(texto);
  const resumo = await crypto.subtle.digest("SHA-256", dados);
  return Array.from(new Uint8Array(resumo), (b) => b.toString(16).padStart(2, "0")).join("");
}
