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
    if (resposta.status === 404) throw new Error("Registro não encontrado.");
    throw new Error(`A API respondeu com erro (HTTP ${resposta.status}).`);
  }
  return resposta.json();
}

const CABECALHO_JSON = { "Content-Type": "application/json" };

const PastilhasAPI = {
  // GET
  listar() {
    return requisicao(API_URL);
  },

  buscarPorId(id) {
    return requisicao(`${API_URL}/${encodeURIComponent(id)}`);
  },

  // POST
  criar(dados) {
    return requisicao(API_URL, {
      method: "POST",
      headers: CABECALHO_JSON,
      body: JSON.stringify(dados),
    });
  },

  // PUT
  atualizar(id, dados) {
    return requisicao(`${API_URL}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: CABECALHO_JSON,
      body: JSON.stringify(dados),
    });
  },

  // DELETE
  excluir(id) {
    return requisicao(`${API_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};

// Recurso "usuarios" (crie no mockapi.io: nome, email, salt, senhaHash, criadoEm)
const UsuariosAPI = {
  // O filtro do mockapi faz busca parcial, então a comparação exata é feita aqui.
  async buscarPorEmail(email) {
    let lista;
    try {
      lista = await requisicao(`${USUARIOS_URL}?email=${encodeURIComponent(email)}`);
    } catch (erro) {
      if (erro.message === "Registro não encontrado.") {
        throw new Error('O recurso "usuarios" ainda não existe no mockapi.io. Crie-o com os campos nome, email, salt, senhaHash e criadoEm.');
      }
      throw erro;
    }
    return lista.find((u) => String(u.email).toLowerCase() === email.toLowerCase()) ?? null;
  },

  criar(dados) {
    return requisicao(USUARIOS_URL, {
      method: "POST",
      headers: CABECALHO_JSON,
      body: JSON.stringify(dados),
    });
  },
};
