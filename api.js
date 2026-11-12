const API_BASE = "https://6abaf4585b549d818d62bc4d.mockapi.io/api-dda";
const API_URL = `${API_BASE}/pastilhas`;
const USUARIOS_URL = `${API_BASE}/usuarios`;

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
