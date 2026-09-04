import { realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";

export type ValidationMode = "preview" | "publish";

export type SourceStatus = "verified" | "partial" | "pending" | "unavailable";
export type EditorialStatus = "confirmed" | "historical" | "pending" | "proposal";

export interface Source {
  id: string;
  url: string;
  checkedAt: string;
  status: SourceStatus;
  note: string;
}

export interface PublicPreviewAuthorization {
  id: string;
  scope: "public-preview";
  destination: string;
  authorizedAt: string;
  request: string;
  recordPath: string;
  media: { id: string; sourceId: string; localPath: string }[];
}

export interface Media {
  id: string;
  sourceId: string;
  sourceUrl: string;
  kind: "image" | "video";
  mode: "local" | "embed" | "link";
  rights: "local-preview" | "public-preview" | "public" | "pending" | "embed";
  publicationAuthorization?: PublicPreviewAuthorization;
  alt: string;
  focalPoint: string;
  localPath?: string;
  poster?: string;
  width?: number;
  height?: number;
  duration?: string;
}

export interface UsedFact {
  id: string;
  sourceId: string;
  status: EditorialStatus;
  used?: boolean;
}

export interface UsedUrl {
  id: string;
  url: string;
}

export interface UsedContent {
  facts: UsedFact[];
  sourceIds: string[];
  mediaIds: string[];
  urls: UsedUrl[];
}

export interface ContentValidationInput {
  mode: ValidationMode;
  publicationUrl?: string;
  sources: Source[];
  media: Media[];
  usedContent: UsedContent;
}

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export interface LocalMediaValidationInput {
  publicDir: string;
  media: Media[];
  usedContent: UsedContent;
}

function urlIssue(
  id: string,
  value: string,
  path: string,
): ValidationIssue | undefined {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return {
      code: "INVALID_URL",
      path,
      message: `A URL de ${id} não é válida.`,
    };
  }

  if (parsed.protocol !== "https:") {
    return {
      code: "INSECURE_URL",
      path,
      message: `A URL de ${id} precisa usar HTTPS.`,
    };
  }

  return undefined;
}

export function validateContent(input: ContentValidationInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  const sourcesById = new Map(input.sources.map((source) => [source.id, source]));
  const mediaById = new Map(input.media.map((item) => [item.id, item]));
  const activeFacts = input.usedContent.facts.filter((fact) => fact.used !== false);
  const requiredSourceIds = new Set(input.usedContent.sourceIds);

  for (const fact of activeFacts) {
    requiredSourceIds.add(fact.sourceId);

    if (fact.status === "pending") {
      issues.push({
        code: "PENDING_FACT",
        path: `usedContent.facts.${fact.id}`,
        message: `O fato ${fact.id} ainda está pendente.`,
      });
    }
  }

  for (const mediaId of input.usedContent.mediaIds) {
    const item = mediaById.get(mediaId);

    if (!item) {
      issues.push({
        code: "MISSING_MEDIA",
        path: `usedContent.mediaIds.${mediaId}`,
        message: `A mídia ${mediaId} não existe no manifesto.`,
      });
      continue;
    }

    requiredSourceIds.add(item.sourceId);

    const sourceUrlIssue = urlIssue(
      item.id,
      item.sourceUrl,
      `media.${item.id}.sourceUrl`,
    );
    if (sourceUrlIssue) issues.push(sourceUrlIssue);

    if (item.rights === "pending") {
      issues.push({
        code: "PENDING_MEDIA_RIGHTS",
        path: `media.${item.id}.rights`,
        message: `A mídia usada ${item.id} ainda possui direitos pendentes.`,
      });
    }

    if (
      item.mode === "embed" &&
      item.rights !== "embed" &&
      item.rights !== "public"
    ) {
      issues.push({
        code: "EMBED_RIGHTS_REQUIRED",
        path: `media.${item.id}.rights`,
        message: `A mídia incorporada ${item.id} não possui autorização compatível.`,
      });
    }

    if (item.mode === "local") {
      if (!item.localPath?.trim()) {
        issues.push({
          code: "LOCAL_PATH_REQUIRED",
          path: `media.${item.id}.localPath`,
          message: `A mídia local ${item.id} não informa um arquivo.`,
        });
      }

      if (
        item.rights !== "local-preview" &&
        item.rights !== "public-preview" &&
        item.rights !== "public"
      ) {
        issues.push({
          code: "LOCAL_RIGHTS_REQUIRED",
          path: `media.${item.id}.rights`,
          message: `A mídia local ${item.id} não possui autorização compatível.`,
        });
      }

      if (item.rights === "public-preview") {
        const authorization = item.publicationAuthorization;
        if (
          !authorization ||
          authorization.scope !== "public-preview" ||
          !authorization.id.trim() ||
          !authorization.authorizedAt.trim() ||
          !authorization.request.trim() ||
          !authorization.recordPath.trim()
        ) {
          issues.push({
            code: "PUBLIC_PREVIEW_AUTHORIZATION_REQUIRED",
            path: `media.${item.id}.publicationAuthorization`,
            message: `A mídia ${item.id} precisa do registro da autorização para esta prévia pública.`,
          });
        } else {
          const destinationIssue = urlIssue(
            authorization.id,
            authorization.destination,
            `media.${item.id}.publicationAuthorization.destination`,
          );
          if (destinationIssue) issues.push(destinationIssue);

          if (
            input.mode === "publish" &&
            input.publicationUrl !== authorization.destination
          ) {
            issues.push({
              code: "PUBLIC_PREVIEW_DESTINATION_MISMATCH",
              path: `media.${item.id}.publicationAuthorization.destination`,
              message: `A autorização de ${item.id} se limita ao destino registrado.`,
            });
          }

          if (!authorization.media.some((approved) =>
            approved.id === item.id &&
            approved.sourceId === item.sourceId &&
            approved.localPath === item.localPath
          )) {
            issues.push({
              code: "PUBLIC_PREVIEW_MEDIA_NOT_AUTHORIZED",
              path: `media.${item.id}.publicationAuthorization.media`,
              message: `O arquivo e a fonte de ${item.id} não constam nesta autorização de prévia pública.`,
            });
          }
        }
      }

      if (input.mode === "publish" && item.rights === "local-preview") {
        issues.push({
          code: "PREVIEW_ONLY_MEDIA",
          path: `media.${item.id}.rights`,
          message: `A mídia ${item.id} está autorizada somente para o protótipo local.`,
        });
      }
    }
  }

  for (const sourceId of requiredSourceIds) {
    const source = sourcesById.get(sourceId);

    if (!source) {
      issues.push({
        code: "MISSING_SOURCE",
        path: `sources.${sourceId}`,
        message: `A fonte ${sourceId} não existe no registro.`,
      });
      continue;
    }

    if (source.status === "pending" || source.status === "unavailable") {
      issues.push({
        code: "UNREADY_SOURCE",
        path: `sources.${source.id}.status`,
        message: `A fonte ${source.id} ainda não está pronta para sustentar conteúdo usado.`,
      });
    }

    const sourceUrlIssue = urlIssue(
      source.id,
      source.url,
      `sources.${source.id}.url`,
    );
    if (sourceUrlIssue) issues.push(sourceUrlIssue);
  }

  for (const entry of input.usedContent.urls) {
    const issue = urlIssue(entry.id, entry.url, `usedContent.urls.${entry.id}`);
    if (issue) issues.push(issue);
  }

  return { ok: issues.length === 0, issues };
}

function isInside(root: string, target: string): boolean {
  const pathFromRoot = relative(root, target);
  return (
    pathFromRoot !== ".." &&
    !pathFromRoot.startsWith(`..${sep}`) &&
    !isAbsolute(pathFromRoot)
  );
}

export async function validateLocalMediaFiles(
  input: LocalMediaValidationInput,
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const mediaById = new Map(input.media.map((item) => [item.id, item]));
  const publicRoot = await realpath(input.publicDir);

  for (const mediaId of input.usedContent.mediaIds) {
    const item = mediaById.get(mediaId);
    if (item?.mode !== "local" || !item.localPath) continue;

    const paths = [
      {
        localPath: item.localPath,
        missingCode: "LOCAL_FILE_MISSING",
        pathLabel: `media.${item.id}.localPath`,
      },
    ];

    if (item.kind === "image") {
      const extension = extname(item.localPath);
      const stem = item.localPath.slice(0, -extension.length);
      const variantWidths = [480, 800].filter(
        (width) => item.width === undefined || item.width > width,
      );
      for (const width of variantWidths) {
        paths.push({
          localPath: `${stem}-${width}${extension}`,
          missingCode: "LOCAL_VARIANT_MISSING",
          pathLabel: `media.${item.id}.localPath.${width}`,
        });
      }
    }

    for (const expected of paths) {
      const relativeLocalPath = expected.localPath.replace(/^[/\\]+/, "");
      const candidatePath = resolve(publicRoot, relativeLocalPath);

      if (!isInside(publicRoot, candidatePath)) {
        issues.push({
          code: "LOCAL_PATH_OUTSIDE_PUBLIC",
          path: expected.pathLabel,
          message: `A mídia ${item.id} aponta para fora do diretório público.`,
        });
        continue;
      }

      try {
        const actualPath = await realpath(candidatePath);
        const file = await stat(actualPath);
        const insidePublic = isInside(publicRoot, actualPath);

        if (!insidePublic || !file.isFile()) {
          issues.push({
            code: insidePublic
              ? expected.missingCode
              : "LOCAL_PATH_OUTSIDE_PUBLIC",
            path: expected.pathLabel,
            message: insidePublic
              ? `O arquivo local de ${item.id} não é um arquivo regular.`
              : `A mídia ${item.id} resolve para fora do diretório público.`,
          });
        }
      } catch {
        issues.push({
          code: expected.missingCode,
          path: expected.pathLabel,
          message: `O arquivo local de ${item.id} não foi encontrado.`,
        });
      }
    }
  }

  return { ok: issues.length === 0, issues };
}
