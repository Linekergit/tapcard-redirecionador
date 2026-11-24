
export async function onRequest(context) {
  const { env, params } = context;
  const code = params.code;

  try {
    const url = new URL("/rest/v1/tags", env.SUPABASE_URL);

    url.searchParams.set("code", `eq.${code}`);
    url.searchParams.set("select", "status,destination_url");
    url.searchParams.set("limit", "1");

    const resposta = await fetch(url, {
      headers: {
        apikey: env.SUPABASE_SECRET_KEY
      }
    });

    if (!resposta.ok) {
      const erro = await resposta.text();
      console.error("Erro do Supabase:", resposta.status, erro);

      return new Response("Erro ao consultar etiqueta.", {
        status: 502
      });
    }

    const etiquetas = await resposta.json();

    if (!etiquetas.length) {
      return new Response("Etiqueta não encontrada.", {
        status: 404
      });
    }

    const etiqueta = etiquetas[0];

    if (
      etiqueta.status !== "ativada" ||
      !etiqueta.destination_url
    ) {
      return new Response(
        "Esta etiqueta ainda não está ativada.",
        { status: 403 }
      );
    }

    const destino = new URL(etiqueta.destination_url);

    if (!["http:", "https:"].includes(destino.protocol)) {
      return new Response("Destino inválido.", {
        status: 400
      });
    }

    return Response.redirect(destino.toString(), 302);

  } catch (error) {
    console.error("Erro no redirecionador:", error);

    return new Response("Erro interno no redirecionador.", {
      status: 500
    });
  }
}
