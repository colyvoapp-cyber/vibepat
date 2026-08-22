import { handleMcpRequest } from "../src/http-handler.js";

// Endpoint remoto de solo lectura (sin cuentas, sin estado entre llamadas):
// cada request crea su propio server+transport, encaja con el modelo
// serverless de Vercel. Deploy pendiente de confirmacion explicita.
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  await handleMcpRequest(req, res, req.body);
}

export const config = {
  runtime: "nodejs",
};
