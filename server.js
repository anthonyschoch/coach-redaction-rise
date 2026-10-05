import express from "express";
import { z } from "zod";
import { assessment } from "./lib/assessment.js";
import { getChatProvider } from "./lib/providers.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const maxDraftChars = Number(process.env.MAX_DRAFT_CHARS || 15_000);
const maxMessageChars = Number(process.env.MAX_MESSAGE_CHARS || 2_000);
const maxChatTurns = Number(process.env.MAX_CHAT_TURNS || 5);

const requestSchema = z.object({
  draft: z.string().trim().min(80).max(maxDraftChars),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(maxMessageChars)
  })).max(maxChatTurns * 2)
}).superRefine((value, context) => {
  const userTurns = value.messages.filter((item) => item.role === "user").length;
  if (userTurns > maxChatTurns) context.addIssue({ code: z.ZodIssueCode.custom, message: "Nombre maximal d’échanges atteint." });
});

app.disable("x-powered-by");
app.use((_request, response, next) => {
  response.setHeader("Content-Security-Policy", "frame-ancestors 'self' https://*.articulate.com https://*.rise.com; base-uri 'self'; object-src 'none'; script-src 'self'; style-src 'self'");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(express.json({ limit: "100kb" }));
app.use(express.static("public"));

app.get("/api/config", (_request, response) => response.json({
  assessment,
  limits: { maxDraftChars, maxMessageChars, maxChatTurns },
  provider: process.env.AI_PROVIDER || "mock"
}));
app.get("/api/health", (_request, response) => response.json({ ok: true, provider: process.env.AI_PROVIDER || "mock" }));

app.post("/api/chat", async (request, response) => {
  try {
    const parsed = requestSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({ error: parsed.error.issues[0]?.message || "La demande n’est pas valide." });
    }
    const provider = getChatProvider();
    const message = await provider.chat(parsed.data);
    response.json({ message, provider: provider.name });
  } catch (error) {
    console.error("Chat generation failed", error);
    response.status(500).json({ error: "Le retour n’a pas pu être généré. Veuillez réessayer." });
  }
});

app.use((_error, _request, response, _next) => response.status(400).json({ error: "La demande n’a pas pu être traitée." }));

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`Coach de rédaction : http://localhost:${port}`));
}

export default app;
