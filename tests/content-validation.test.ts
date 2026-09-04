import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  validateContent,
  validateLocalMediaFiles,
  type ContentValidationInput,
} from "../src/lib/content-validation.ts";

function validInput(
  overrides: Partial<ContentValidationInput> = {},
): ContentValidationInput {
  return {
    mode: "preview",
    sources: [
      {
        id: "instagram",
        url: "https://www.instagram.com/gaap.porquinhos/",
        checkedAt: "2026-09-04",
        status: "verified",
        note: "Perfil oficial consultado.",
      },
    ],
    media: [
      {
        id: "hero",
        sourceId: "instagram",
        sourceUrl: "https://www.instagram.com/gaap.porquinhos/",
        kind: "image",
        mode: "local",
        rights: "local-preview",
        alt: "Porquinho-da-índia acolhido pelo GAAP.",
        focalPoint: "50% 45%",
        localPath: "/media/hero.webp",
        width: 1086,
        height: 1448,
      },
    ],
    usedContent: {
      facts: [
        {
          id: "mission",
          sourceId: "instagram",
          status: "confirmed",
        },
      ],
      sourceIds: ["instagram"],
      mediaIds: ["hero"],
      urls: [
        {
          id: "support",
          url: "https://apoia.se/projetogaap",
        },
      ],
    },
    ...overrides,
  };
}

function codes(input: ContentValidationInput): string[] {
  return validateContent(input).issues.map((issue) => issue.code);
}

function publicPreviewInput(): ContentValidationInput {
  const input = validInput({
    mode: "publish",
    publicationUrl: "https://viniciusextremxd.github.io/gaap-landing-page/",
  });
  input.media[0].rights = "public-preview";
  input.media[0].publicationAuthorization = {
    id: "gaap-pages-preview-2026-09-04",
    scope: "public-preview",
    destination: "https://viniciusextremxd.github.io/gaap-landing-page/",
    authorizedAt: "2026-09-04",
    request: "Publique esta proposta no GitHub Pages.",
    recordPath: "docs/publication-authorization.md",
    media: [{ id: "hero", sourceId: "instagram", localPath: "/media/hero.webp" }],
  };
  return input;
}

test("accepts an explicitly authorized public preview only at its recorded destination", () => {
  assert.deepEqual(validateContent(publicPreviewInput()), { ok: true, issues: [] });
});

test("rejects a public preview when its authorization record is missing", () => {
  const input = publicPreviewInput();
  delete input.media[0].publicationAuthorization;
  assert.ok(codes(input).includes("PUBLIC_PREVIEW_AUTHORIZATION_REQUIRED"));
});

test("rejects a public preview for a different deployment destination", () => {
  const input = publicPreviewInput();
  input.publicationUrl = "https://elsewhere.example/";
  assert.ok(codes(input).includes("PUBLIC_PREVIEW_DESTINATION_MISMATCH"));
});

test("rejects a public preview when publishing without a destination", () => {
  const input = publicPreviewInput();
  delete input.publicationUrl;
  assert.ok(codes(input).includes("PUBLIC_PREVIEW_DESTINATION_MISMATCH"));
});

test("does not extend preview authorization to another file or a repost", async (t) => {
  await t.test("original rather than approved derivative", () => {
    const input = publicPreviewInput();
    input.media[0].localPath = "/media/originals/hero.jpg";
    assert.ok(codes(input).includes("PUBLIC_PREVIEW_MEDIA_NOT_AUTHORIZED"));
  });
  await t.test("third-party source rather than approved source", () => {
    const input = publicPreviewInput();
    input.media[0].sourceId = "third-party";
    assert.ok(codes(input).includes("PUBLIC_PREVIEW_MEDIA_NOT_AUTHORIZED"));
  });
});

test("accepts verified content and authorized local media in preview", () => {
  const result = validateContent(validInput());

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
});

test("rejects a pending fact that is included in used content", () => {
  const input = validInput();
  input.usedContent.facts[0].status = "pending";

  assert.ok(codes(input).includes("PENDING_FACT"));
});

test("rejects a used fact whose source is absent", () => {
  const input = validInput();
  input.usedContent.facts[0].sourceId = "missing-source";

  assert.ok(codes(input).includes("MISSING_SOURCE"));
});

test("rejects a pending source when used content references it", () => {
  const input = validInput();
  input.sources[0].status = "pending";

  assert.ok(codes(input).includes("UNREADY_SOURCE"));
});

test("rejects used local media without a local path", () => {
  const input = validInput();
  delete input.media[0].localPath;

  assert.ok(codes(input).includes("LOCAL_PATH_REQUIRED"));
});

test("rejects used local media without local or public rights", () => {
  const input = validInput();
  input.media[0].rights = "pending";

  assert.ok(codes(input).includes("LOCAL_RIGHTS_REQUIRED"));
});

test("rejects local-preview media when validating for publish", () => {
  const input = validInput({ mode: "publish" });

  assert.ok(codes(input).includes("PREVIEW_ONLY_MEDIA"));
});

test("rejects pending rights on used embed and link media", async (t) => {
  for (const mode of ["embed", "link"] as const) {
    await t.test(mode, () => {
      const input = validInput();
      input.media[0].mode = mode;
      input.media[0].rights = "pending";
      delete input.media[0].localPath;

      assert.ok(codes(input).includes("PENDING_MEDIA_RIGHTS"));
    });
  }
});

test("rejects embed media without embed or public rights", () => {
  const input = validInput();
  input.media[0].mode = "embed";
  input.media[0].rights = "local-preview";
  delete input.media[0].localPath;

  assert.ok(codes(input).includes("EMBED_RIGHTS_REQUIRED"));
});

test("rejects malformed and insecure URLs used by the page", async (t) => {
  await t.test("malformed URL", () => {
    const input = validInput();
    input.usedContent.urls[0].url = "apoia se";

    assert.ok(codes(input).includes("INVALID_URL"));
  });

  await t.test("non-HTTPS URL", () => {
    const input = validInput();
    input.usedContent.urls[0].url = "http://apoia.se/projetogaap";

    assert.ok(codes(input).includes("INSECURE_URL"));
  });
});

test("ignores pending facts and incomplete media that are not used", () => {
  const input = validInput();
  input.usedContent.facts.push({
    id: "candidate",
    sourceId: "instagram",
    status: "pending",
    used: false,
  });
  input.media.push({
    id: "candidate-media",
    sourceId: "missing-source",
    sourceUrl: "not-a-url",
    kind: "video",
    mode: "local",
    rights: "pending",
    alt: "Candidato ainda não selecionado.",
    focalPoint: "50% 50%",
  });

  const result = validateContent(input);

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
});

test("accepts a used local media file inside the public directory", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "gaap-content-"));
  const publicDir = join(fixtureRoot, "public");

  try {
    await mkdir(join(publicDir, "media"), { recursive: true });
    await writeFile(join(publicDir, "media", "hero.webp"), "fixture");
    await writeFile(join(publicDir, "media", "hero-480.webp"), "fixture");
    await writeFile(join(publicDir, "media", "hero-800.webp"), "fixture");

    const input = validInput();
    const result = await validateLocalMediaFiles({
      publicDir,
      media: input.media,
      usedContent: input.usedContent,
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.issues, []);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("does not require oversized variants for a small local image", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "gaap-content-"));
  const publicDir = join(fixtureRoot, "public");

  try {
    await mkdir(join(publicDir, "media"), { recursive: true });
    await writeFile(join(publicDir, "media", "hero.webp"), "fixture");
    const input = validInput();
    input.media[0].width = 128;
    input.media[0].height = 128;

    const result = await validateLocalMediaFiles({
      publicDir,
      media: input.media,
      usedContent: input.usedContent,
    });

    assert.equal(result.ok, true);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("rejects a used local image when a responsive variant is missing", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "gaap-content-"));
  const publicDir = join(fixtureRoot, "public");

  try {
    await mkdir(join(publicDir, "media"), { recursive: true });
    await writeFile(join(publicDir, "media", "hero.webp"), "fixture");
    await writeFile(join(publicDir, "media", "hero-480.webp"), "fixture");
    const input = validInput();

    const result = await validateLocalMediaFiles({
      publicDir,
      media: input.media,
      usedContent: input.usedContent,
    });

    assert.ok(
      result.issues.some((issue) => issue.code === "LOCAL_VARIANT_MISSING"),
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("rejects a used local media path when the file is missing", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "gaap-content-"));
  const publicDir = join(fixtureRoot, "public");

  try {
    await mkdir(publicDir, { recursive: true });
    const input = validInput();
    const result = await validateLocalMediaFiles({
      publicDir,
      media: input.media,
      usedContent: input.usedContent,
    });

    assert.ok(result.issues.some((issue) => issue.code === "LOCAL_FILE_MISSING"));
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("rejects a used local media path that traverses outside public", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "gaap-content-"));
  const publicDir = join(fixtureRoot, "public");

  try {
    await mkdir(publicDir, { recursive: true });
    await writeFile(join(fixtureRoot, "outside.webp"), "fixture");
    const input = validInput();
    input.media[0].localPath = "/../outside.webp";

    const result = await validateLocalMediaFiles({
      publicDir,
      media: input.media,
      usedContent: input.usedContent,
    });

    assert.ok(
      result.issues.some((issue) => issue.code === "LOCAL_PATH_OUTSIDE_PUBLIC"),
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
