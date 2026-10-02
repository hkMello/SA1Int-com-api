const API_URL = "https://6abaf4585b549d818d62bc4d.mockapi.io/api-dda/pastilhas";

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
