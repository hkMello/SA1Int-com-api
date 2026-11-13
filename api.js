const API_BASE = "https://6abaf4585b549d818d62bc4d.mockapi.io/api-dda";
const API_URL = `${API_BASE}/pastilhas`;
const USUARIOS_URL = `${API_BASE}/usuarios`;
const API_BASE_HISTORICO = "https://6af65857e844c7ff741b4b55.mockapi.io/api_dda";
const MOVIMENTACOES_URL = `${API_BASE_HISTORICO}/movimentacoes`;
const historicoConfigurado = () => !API_BASE_HISTORICO.startsWith("");

async function requisicao(url, opcoes) {
  let resposta;
  try {
    resposta = await fetch(url, opcoes);
  } catch {
    throw new Error("Sem conexão com a API. Verifique a internet e a URL configurada.");
  }

  if (!resposta.ok) {
    const erro = new Error(
      resposta.status === 404
        ? "Registro não encontrado."
        : `A API respondeu com erro (HTTP ${resposta.status}).`,
    );
    erro.status = resposta.status;
    throw erro;
  }
  return resposta.json();
}

const CABECALHO_JSON = { "Content-Type": "application/json" };

const PastilhasAPI = {

  listar() {
    return requisicao(API_URL);
  },

  buscarPorId(id) {
    return requisicao(`${API_URL}/${encodeURIComponent(id)}`);
  },

  criar(dados) {
    return requisicao(API_URL, {
      method: "POST",
      headers: CABECALHO_JSON,
      body: JSON.stringify(dados),
    });
  },

  atualizar(id, dados) {
    return requisicao(`${API_URL}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: CABECALHO_JSON,
      body: JSON.stringify(dados),
    });
  },

  excluir(id) {
    return requisicao(`${API_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};

const UsuariosAPI = {
  async listar() {
    try {
      return await requisicao(USUARIOS_URL);
    } catch (erro) {
      if (erro.status === 404) await garantirRecursoUsuarios();
      throw erro;
    }
  },

  buscarPorId(id) {
    return requisicao(`${USUARIOS_URL}/${encodeURIComponent(id)}`);
  },

  atualizar(id, dados) {
    return requisicao(`${USUARIOS_URL}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: CABECALHO_JSON,
      body: JSON.stringify(dados),
    });
  },

  async buscarPorEmail(email) {
    let lista;
    try {
      lista = await requisicao(`${USUARIOS_URL}?email=${encodeURIComponent(email)}`);
    } catch (erro) {
      if (erro.status !== 404) throw erro;
      await garantirRecursoUsuarios();
      return null;
    }
    return lista.find((u) => String(u.email).toLowerCase() === email.toLowerCase()) ?? null;
  },

  async criar(dados) {
    try {
      return await requisicao(USUARIOS_URL, {
        method: "POST",
        headers: CABECALHO_JSON,
        body: JSON.stringify(dados),
      });
    } catch (erro) {
      if (erro.status === 404) await garantirRecursoUsuarios();
      throw erro;
    }
  },
};

// Histórico de entradas e saídas (recurso "movimentacoes" no mockapi.io).
function traduzirErroMovimentacoes(erro) {
  if (erro.status !== 404) return erro;
  const novo = new Error('O recurso "movimentacoes" não foi encontrado no segundo projeto do mockapi.io. Crie-o (nome exato, em minúsculas) e confira a URL em API_BASE_HISTORICO (api.js).');
  novo.status = 404;
  return novo;
}

function exigirHistoricoConfigurado() {
  if (!historicoConfigurado()) {
    throw new Error("A URL do projeto do histórico ainda não foi configurada. Preencha API_BASE_HISTORICO no api.js.");
  }
}

const MovimentacoesAPI = {
  async listar() {
    exigirHistoricoConfigurado();
    try {
      return await requisicao(MOVIMENTACOES_URL);
    } catch (erro) {
      throw traduzirErroMovimentacoes(erro);
    }
  },

  async criar(dados) {
    exigirHistoricoConfigurado();
    try {
      return await requisicao(MOVIMENTACOES_URL, {
        method: "POST",
        headers: CABECALHO_JSON,
        body: JSON.stringify(dados),
      });
    } catch (erro) {
      throw traduzirErroMovimentacoes(erro);
    }
  },
};

async function garantirRecursoUsuarios() {
  try {
    await requisicao(USUARIOS_URL);
  } catch (erro) {
    if (erro.status === 404) {
      throw new Error('O recurso "usuarios" não foi encontrado no mockapi.io. Confira se o nome é exatamente "usuarios" (minúsculas) no projeto api-dda.');
    }
    throw erro;
  }
}
