
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const statusPainel = document.getElementById("status-painel");
const emailUsuario = document.getElementById("usuario-email");
const botaoSair = document.getElementById("botao-sair");

const formLote = document.getElementById("form-lote");
const nomeLote = document.getElementById("nome-lote");
const quantidadeLote = document.getElementById("quantidade-lote");
const botaoGerarLote = document.getElementById("botao-gerar-lote");
const resultadoLote = document.getElementById("resultado-lote");

const listaLotes = document.getElementById("lista-lotes");
const detalhesLote = document.getElementById("detalhes-lote");

function voltarParaLogin() {
  window.location.href = "index.html";
}

// Formata a data para o padrão brasileiro
function formatarData(data) {
  return new Date(data).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

// Evita interpretar nomes e códigos como HTML
function escaparHTML(valor) {
  return String(valor).replace(/[&<>"']/g, caractere => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[caractere]);
}
// Gera o endereço permanente de cada etiqueta
function gerarLinkEtiqueta(codigo) {
  return `https://tapcard-redirecionador.pages.dev/r/${encodeURIComponent(codigo)}`;
}

// Gera o QR Code de uma etiqueta
function gerarQRCode(codigo, elemento) {
  const link = gerarLinkEtiqueta(codigo);

  elemento.innerHTML = "";

  new QRCode(elemento, {
    text: link,
    width: 180,
    height: 180,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
  // Baixa todos os QR Codes de um lote em ZIP
async function baixarLoteZIP() {
  const cartoes = detalhesLote.querySelectorAll(".cartao-etiqueta");

  if (cartoes.length === 0) {
    alert("Nenhuma etiqueta encontrada neste lote.");
    return;
  }

  const zip = new JSZip();

  for (const cartao of cartoes) {
    const codigo = cartao.querySelector("h4").textContent;
    const canvas = cartao.querySelector("canvas");

    if (!canvas) continue;

    const imagem = canvas.toDataURL("image/png");
    const conteudo = imagem.split(",")[1];

    zip.file(`${codigo}.png`, conteudo, {
      base64: true
    });
  }

  const arquivo = await zip.generateAsync({
    type: "blob"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(arquivo);
  link.download = "TapCard-QR-Codes.zip";
  link.click();

  URL.revokeObjectURL(link.href);
}
}
// Verifica se o usuário pode acessar o painel
async function iniciar() {
  const { data, error } = await db.auth.getSession();

  if (error || !data.session) {
    voltarParaLogin();
    return;
  }

  const { data: ehAdmin, error: erroAdmin } =
    await db.rpc("is_admin");

  if (erroAdmin || !ehAdmin) {
    await db.auth.signOut();
    voltarParaLogin();
    return;
  }

  emailUsuario.textContent = data.session.user.email;

  statusPainel.textContent =
    "Acesso confirmado. Bem-vindo ao painel TapCard.";

  statusPainel.className = "mensagem sucesso";

  await carregarLotes();
}

// Busca os lotes cadastrados no Supabase
async function carregarLotes() {
  listaLotes.innerHTML = `
    <tr>
      <td colspan="4">Carregando lotes...</td>
    </tr>
  `;

  const { data: lotes, error } = await db
    .from("batches")
    .select("id, name, quantity, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar lotes:", error);

    listaLotes.innerHTML = `
      <tr>
        <td colspan="4">Não foi possível carregar os lotes.</td>
      </tr>
    `;
    return;
  }

  if (!lotes || lotes.length === 0) {
    listaLotes.innerHTML = `
      <tr>
        <td colspan="4">Nenhum lote cadastrado.</td>
      </tr>
    `;
    return;
  }

  listaLotes.innerHTML = lotes.map(lote => `
    <tr>
      <td>${escaparHTML(lote.name)}</td>
      <td>${lote.quantity}</td>
      <td>${formatarData(lote.created_at)}</td>
      <td>
        <button
          type="button"
          class="botao-ver-lote"
          data-batch-id="${escaparHTML(lote.id)}"
        >
          Ver etiquetas
        </button>
      </td>
    </tr>
  `).join("");
}

// Mostra as etiquetas de um lote específico
async function visualizarEtiquetas(batchId) {
  detalhesLote.innerHTML = "Carregando etiquetas...";

  const { data: etiquetas, error } = await db
    .from("tags")
    .select("code, status")
    .eq("batch_id", batchId)
    .order("code", { ascending: true });

  if (error) {
    console.error("Erro ao buscar etiquetas:", error);
    detalhesLote.textContent =
      "Não foi possível carregar as etiquetas.";
    return;
  }

  if (!etiquetas || etiquetas.length === 0) {
    detalhesLote.textContent =
      "Nenhuma etiqueta encontrada neste lote.";
    return;
  }

  const nomesStatus = {
    disponivel: "Disponível",
    reservada: "Reservada",
    vendida: "Vendida",
    ativada: "Ativada",
    desativada: "Desativada"
  };

    detalhesLote.innerHTML = `
    <h3>Etiquetas do lote</h3>
    <p>${etiquetas.length} etiquetas encontradas.</p>
    <button
  type="button"
  class="botao-baixar-lote"
  id="botao-baixar-lote"
>
  Baixar lote completo (.ZIP)
</button>

    <div class="grade-etiquetas">
      ${etiquetas.map(etiqueta => `
        <div class="cartao-etiqueta">
          <h4>${escaparHTML(etiqueta.code)}</h4>

          <p class="status-etiqueta">
            ${nomesStatus[etiqueta.status] || escaparHTML(etiqueta.status)}
          </p>

          <div
            class="qrcode-etiqueta"
            id="qrcode-${escaparHTML(etiqueta.code)}"
          ></div>

          <button
            type="button"
            class="botao-baixar-qr"
            data-code="${escaparHTML(etiqueta.code)}"
          >
            Baixar QR Code
          </button>
        </div>
      `).join("")}
    </div>
  `;

  etiquetas.forEach(etiqueta => {
    const elemento = document.getElementById(
      `qrcode-${etiqueta.code}`
    );

    gerarQRCode(etiqueta.code, elemento);
  });
  const botaoBaixarLote = document.getElementById(
    "botao-baixar-lote"
  );

  botaoBaixarLote.addEventListener("click", baixarLoteZIP);

}
// Baixa o QR Code de uma etiqueta
detalhesLote.addEventListener("click", event => {
  const botao = event.target.closest(".botao-baixar-qr");

  if (!botao) return;

  const codigo = botao.dataset.code;

  const elemento = document.getElementById(`qrcode-${codigo}`);
  const canvas = elemento.querySelector("canvas");

  if (!canvas) {
    alert("Não foi possível gerar o QR Code.");
    return;
  }

  const link = document.createElement("a");

  link.href = canvas.toDataURL("image/png");
  link.download = `${codigo}.png`;

  link.click();
});

// Clique no botão Ver etiquetas
listaLotes.addEventListener("click", event => {
  const botao = event.target.closest(".botao-ver-lote");

  if (!botao) return;

  visualizarEtiquetas(botao.dataset.batchId);
});

// Gera um novo lote
formLote.addEventListener("submit", async event => {
  event.preventDefault();

  const nome = nomeLote.value.trim();
  const quantidade = Number(quantidadeLote.value);

  if (!nome || !Number.isInteger(quantidade) || quantidade <= 0) {
    resultadoLote.textContent =
      "Informe um nome e uma quantidade válida.";
    resultadoLote.className = "mensagem erro";
    return;
  }

  botaoGerarLote.disabled = true;
  botaoGerarLote.textContent = "Gerando etiquetas...";

  resultadoLote.textContent =
    "Aguarde, estamos criando seu lote...";
  resultadoLote.className = "mensagem info";

  try {
    const { data, error } = await db.rpc("gerar_lote", {
      p_nome: nome,
      p_quantidade: quantidade
    });

    if (error) throw error;

    resultadoLote.textContent =
      `Lote criado com sucesso! ${data.quantity} etiquetas geradas: ` +
      `${data.first_code} até ${data.last_code}.`;

    resultadoLote.className = "mensagem sucesso";

    formLote.reset();

    detalhesLote.innerHTML = "";

    await carregarLotes();

  } catch (error) {
    console.error("Erro ao gerar lote:", error);

    resultadoLote.textContent =
      "Não foi possível gerar o lote: " + error.message;

    resultadoLote.className = "mensagem erro";

  } finally {
    botaoGerarLote.disabled = false;
    botaoGerarLote.textContent = "Gerar etiquetas";
  }
});

// Encerrar sessão
botaoSair.addEventListener("click", async () => {
  await db.auth.signOut();
  voltarParaLogin();
});

iniciar();
