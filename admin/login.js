// Cria a conexão com o Supabase usando os dados do config.js
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("form-login");
const botao = document.getElementById("botao");
const mensagem = document.getElementById("mensagem");

function mostrarMensagem(texto, tipo) {
  mensagem.textContent = texto;
  mensagem.className = "mensagem " + tipo;
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // impede a página de recarregar
  botao.disabled = true;
  mostrarMensagem("Entrando...", "info");

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  // 1) Tenta fazer o login
  const { error } = await db.auth.signInWithPassword({ email: email, password: senha });
  if (error) {
    mostrarMensagem("E-mail ou senha incorretos.", "erro");
    botao.disabled = false;
    return;
  }

  // 2) Pergunta ao banco se este usuário é administrador
  const { data: ehAdmin, error: erroAdmin } = await db.rpc("is_admin");
  if (erroAdmin || !ehAdmin) {
    await db.auth.signOut();
    mostrarMensagem("Este usuário não tem permissão de administrador.", "erro");
    botao.disabled = false;
    return;
  }

   // 3) Deu tudo certo: vai para o painel
  window.location.href = "painel.html";
});