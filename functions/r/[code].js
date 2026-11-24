export async function onRequest(context) {
  const code = context.params.code;

  return new Response(
    `Redirecionador TapCard funcionando! Etiqueta: ${code}`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    }
  );
}
