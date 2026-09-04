import { fileURLToPath } from "node:url";

import { media, publicationUrl, sources, usedContent } from "../src/data/gaap.ts";
import {
  validateContent,
  validateLocalMediaFiles,
  type ValidationMode,
} from "../src/lib/content-validation.ts";

const requestedMode = process.argv[2] ?? "preview";

if (requestedMode !== "preview" && requestedMode !== "publish") {
  console.error(`Modo desconhecido: ${requestedMode}. Use preview ou publish.`);
  process.exitCode = 1;
} else {
  const mode: ValidationMode = requestedMode;
  const contentResult = validateContent({
    mode,
    publicationUrl: process.argv[3] ?? publicationUrl,
    sources,
    media,
    usedContent,
  });
  const fileResult = await validateLocalMediaFiles({
    publicDir: fileURLToPath(new URL("../public", import.meta.url)),
    media,
    usedContent,
  });
  const issues = [...contentResult.issues, ...fileResult.issues];

  if (issues.length > 0) {
    console.error(`Conteúdo reprovado para ${mode}:`);
    for (const issue of issues) {
      console.error(`- [${issue.code}] ${issue.path}: ${issue.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Conteúdo aprovado para ${mode}.`);
  }
}
