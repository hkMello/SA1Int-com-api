const CHAVE_SESSAO = "dda_sessao";
const PAGINA_LOGIN = "login.html";
const PAGINA_PAINEL = "index.html";

const PERMISSOES = [
  { id: "criar", rotulo: "Cadastrar pastilhas" },
  { id: "editar", rotulo: "Editar pastilhas" },
  { id: "excluir", rotulo: "Excluir pastilhas" },
];
const PAPEIS = { admin: "Administrador", usuario: "Usuário" };

function lerPermissoes(texto) {
  return String(texto ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((id) => PERMISSOES.some((p) => p.id === id));
}

function gravarPermissoes(lista) {
  return PERMISSOES.map((p) => p.id).filter((id) => lista.includes(id)).join(",");
}

const Auth = {
  usuarioAtual() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_SESSAO));
    } catch {
      return null;
    }
  },

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

  ehAdmin() {
    return Auth.usuarioAtual()?.papel === "admin";
  },

  pode(acao) {
    const usuario = Auth.usuarioAtual();
    if (!usuario) return false;
    return usuario.papel === "admin" || usuario.permissoes.includes(acao);
  },

  async atualizarSessao() {
    const atual = Auth.usuarioAtual();
    if (!atual) return null;
    try {
      iniciarSessao(await UsuariosAPI.buscarPorId(atual.id));
    } catch (erro) {
      if (erro.status === 404) {
        Auth.sair();
        return null;
      }
    }
    return Auth.usuarioAtual();
  },

  async primeiroAcesso() {
    return (await UsuariosAPI.listar()).length === 0;
  },

  async criarPrimeiroAdmin({ nome, email, senha }) {
    if (!(await Auth.primeiroAcesso())) {
      throw new Error("O administrador já foi criado. Peça uma conta a ele.");
    }
    const usuario = await registrar({ nome, email, senha, papel: "admin", permissoes: [] });
    iniciarSessao(usuario);
  },

  async criarUsuario(dados) {
    if (!Auth.ehAdmin()) throw new Error("Somente administradores podem criar usuários.");
    return registrar(dados);
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

async function registrar({ nome, email, senha, papel, permissoes }) {
  email = email.trim().toLowerCase();
  if (await UsuariosAPI.buscarPorEmail(email)) {
    throw new Error("Já existe uma conta com esse e-mail.");
  }
  const ehAdmin = papel === "admin";
  const salt = gerarSalt();
  return UsuariosAPI.criar({
    nome: nome.trim(),
    email,
    salt,
    senhaHash: await hash(salt + senha),
    papel: ehAdmin ? "admin" : "usuario",
    permissoes: gravarPermissoes(ehAdmin ? PERMISSOES.map((p) => p.id) : permissoes),
    criadoEm: new Date().toISOString(),
  });
}

function iniciarSessao(usuario) {
  localStorage.setItem(
    CHAVE_SESSAO,
    JSON.stringify({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel === "admin" ? "admin" : "usuario",
      permissoes: lerPermissoes(usuario.permissoes),
    }),
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
