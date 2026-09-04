import type {
  EditorialStatus,
  Media,
  PublicPreviewAuthorization,
  Source,
  UsedContent,
} from "../lib/content-validation.ts";

export type { EditorialStatus, Media, Source, UsedContent };

export interface Story {
  id: string;
  name: string;
  eyebrow: string;
  summary: string;
  sourceId: string;
  mediaId: string;
  url: string;
  statusLabel: string;
  dateLabel: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  sourceId: string;
  mediaId: string;
  url: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  sourceId: string;
}

export interface ParticipationItem {
  title: string;
  description: string;
  href: string;
  label: string;
  sourceId: string;
}

export const site = {
  name: "GAAP",
  fullName: "Grupo de Apoio Amigos do Pudim",
  eyebrow: "Resgate e adoção consciente em São Paulo",
  title: "Pequenas vidas. Grandes recomeços.",
  description:
    "O GAAP acolhe porquinhos-da-índia em lares temporários, organiza os cuidados necessários e busca adoções conscientes.",
  intro:
    "Cada apoio ajuda a sustentar o cuidado enquanto um novo lar é preparado.",
  previewNotice:
    "Proposta de site publicada para apresentação, com autorização do solicitante para esta prévia no GitHub Pages.",
} as const;

export const publicationUrl = "https://viniciusextremxd.github.io/gaap-landing-page/";

export const publicationAuthorization: PublicPreviewAuthorization = {
  id: "gaap-pages-preview-2026-09-04",
  scope: "public-preview",
  destination: publicationUrl,
  authorizedAt: "2026-09-04",
  request: "no final, suba para o github e faça deploy no gh pages e me de o link",
  recordPath: "docs/publication-authorization.md",
  media: [
    { id: "logo", sourceId: "instagram", localPath: "/media/logo.webp" },
    { id: "hero", sourceId: "adoption-album", localPath: "/media/hero.webp" },
    { id: "churros", sourceId: "churros", localPath: "/media/churros.webp" },
    { id: "rony-farofa", sourceId: "adoption-album", localPath: "/media/rony-farofa.webp" },
    { id: "bella", sourceId: "adoption-album", localPath: "/media/bella.webp" },
    { id: "ravena", sourceId: "adoption-album", localPath: "/media/ravena.webp" },
    { id: "support", sourceId: "adoption-album", localPath: "/media/support.webp" },
  ],
};

export const links = {
  instagram: "https://www.instagram.com/gaap.porquinhos/",
  support: "https://apoia.se/projetogaap",
  linktree: "https://linktr.ee/projetoGAAP",
  adoption:
    "https://docs.google.com/forms/d/e/1FAIpQLSfBwcH_bmF0MFLovjB-NERuS7YmYoibUXCWAcKWLu-vVssblw/viewform",
  manual:
    "https://drive.google.com/file/d/1yIS9bbqHMkRMFIMhCflaROcZ4sbVdx1S/view",
  accounts:
    "https://drive.google.com/file/d/1PlUYf_jAoF908sB_MhTPYpQp2s7bD4B4/view",
} as const;

export const sources: Source[] = [
  {
    id: "instagram",
    url: links.instagram,
    checkedAt: "2026-09-04",
    status: "verified",
    note: "Perfil oficial, bio e identidade visual consultados no Edge.",
  },
  {
    id: "linktree",
    url: links.linktree,
    checkedAt: "2026-09-04",
    status: "verified",
    note: "Central de links presente na bio do perfil oficial.",
  },
  {
    id: "support",
    url: links.support,
    checkedAt: "2026-09-04",
    status: "verified",
    note:
      "Campanha vinculada pelo GAAP; descreve lares temporários, cuidados e adoção consciente.",
  },
  {
    id: "support-post",
    url: "https://www.instagram.com/gaap.porquinhos/p/C5o12dLg9tR/",
    checkedAt: "2026-09-04",
    status: "verified",
    note: "Post fixado de 11/04/2024 sobre apoio mensal ao projeto.",
  },
  {
    id: "adoption-post",
    url: "https://www.instagram.com/gaap.porquinhos/p/Cs_Wnqggtxc/",
    checkedAt: "2026-09-04",
    status: "partial",
    note:
      "Post de 02/06/2023 com legenda editada; os detalhes operacionais são tratados como históricos.",
  },
  {
    id: "adoption-form",
    url: links.adoption,
    checkedAt: "2026-09-04",
    status: "verified",
    note:
      "Abertura do formulário oficial consultada; nenhuma resposta foi preenchida ou enviada.",
  },
  {
    id: "manual",
    url: links.manual,
    checkedAt: "2026-09-04",
    status: "verified",
    note: "Arquivo aberto no Edge: CARTILHA - COMO CUIDAR DO SEU PDI.pdf, 32 páginas, orientação do GAAP sobre adoção e cuidados. Sem reprodução de aconselhamento veterinário no site.",
  },
  {
    id: "accounts",
    url: links.accounts,
    checkedAt: "2026-09-04",
    status: "verified",
    note:
      "Arquivo aberto no Edge: Controle de Doações e Despesas GAAP_12Dez23.pdf, uma página referente a 2023. Link histórico; não equivale a auditoria.",
  },
  {
    id: "churros",
    url: "https://www.instagram.com/gaap.porquinhos/p/DayekiAuliL/",
    checkedAt: "2026-09-04",
    status: "verified",
    note:
      "Post de 14/07/2026; a legenda atualizada informa que Churros foi adotado.",
  },
  {
    id: "adoption-album",
    url: "https://www.instagram.com/gaap.porquinhos/p/DZpet4qDZRC/",
    checkedAt: "2026-09-04",
    status: "verified",
    note:
      "Post de 16/06/2026 com registros de animais adotados; nomes conferidos na publicação original.",
  },
  {
    id: "frido",
    url: "https://www.instagram.com/gaap.porquinhos/p/Dcj5T9Gt6ml/",
    checkedAt: "2026-09-04",
    status: "partial",
    note:
      "Post de 27/08/2026 anunciou procura por lar; a situação atual não foi confirmada separadamente.",
  },
  {
    id: "frida-highlight",
    url: "https://www.instagram.com/stories/highlights/18106574042094482/",
    checkedAt: "2026-09-04",
    status: "verified",
    note:
      "Quatro quadros consultados: resgate na zona sul, chegada ao lar temporário, consulta veterinária e status histórico.",
  },
  {
    id: "zion",
    url: "https://www.instagram.com/gaap.porquinhos/reel/DPhfUBkDeta/",
    checkedAt: "2026-09-04",
    status: "verified",
    note:
      "Reel do GAAP de 07/10/2025; a legenda identifica Zion como resgatado. Post abre, mas o código oficial de incorporação retornou erro em 04/09/2026; usar acesso ao post.",
  },
  {
    id: "peppa",
    url: "https://www.instagram.com/giopezzolato/reel/Dcq3ctluilp/",
    checkedAt: "2026-09-04",
    status: "verified",
    note:
      "Colaboração com o GAAP e outras autoras, embed habilitado; não é usada como relato de resgate.",
  },
  {
    id: "capuccino",
    url: "https://www.instagram.com/lettysitter/reel/DchnzGPIdUR/",
    checkedAt: "2026-09-04",
    status: "verified",
    note:
      "Colaboração com o GAAP, embed habilitado e música de terceiros; não hospedar localmente. No teste de 04/09/2026 o embed exibiu poster com link para assistir no Instagram.",
  },
  {
    id: "carinho",
    url: "https://www.instagram.com/gaap.porquinhos/reel/DccAXt9OdMN/",
    checkedAt: "2026-09-04",
    status: "verified",
    note: "Publicação de 24/08/2026: porquinho recebendo carinho, crédito visível @myadventurouspigs e trilha Catharine Beahan • SEVEN TIMES FOREVER. Incorporação oficial habilitada. Não alegar filmagem própria ou resgate do GAAP; somente embed/link.",
  },
];

export const media: Media[] = [
  {
    id: "logo",
    sourceId: "instagram",
    sourceUrl: links.instagram,
    kind: "image",
    mode: "local",
    rights: "public-preview",
    publicationAuthorization,
    alt: "Marca ilustrada do Grupo de Apoio Amigos do Pudim.",
    focalPoint: "50% 50%",
    localPath: "/media/logo.webp",
    width: 128,
    height: 128,
  },
  {
    id: "hero",
    sourceId: "adoption-album",
    sourceUrl: "https://www.instagram.com/gaap.porquinhos/p/DZpet4qDZRC/",
    kind: "image",
    mode: "local",
    rights: "public-preview",
    publicationAuthorization,
    alt: "Rony e Farofa, dupla já no lar adotivo, em registro compartilhado pelo GAAP.",
    focalPoint: "50% 75%",
    localPath: "/media/hero.webp",
    width: 1086,
    height: 1448,
  },
  {
    id: "churros",
    sourceId: "churros",
    sourceUrl: "https://www.instagram.com/gaap.porquinhos/p/DayekiAuliL/",
    kind: "image",
    mode: "local",
    rights: "public-preview",
    publicationAuthorization,
    alt: "Churros em registro compartilhado pelo GAAP.",
    focalPoint: "50% 50%",
    localPath: "/media/churros.webp",
    width: 1200,
    height: 914,
  },
  {
    id: "frido",
    sourceId: "frido",
    sourceUrl: "https://www.instagram.com/gaap.porquinhos/p/Dcj5T9Gt6ml/",
    kind: "image",
    mode: "local",
    rights: "local-preview",
    alt: "Frido em registro compartilhado pelo GAAP.",
    focalPoint: "50% 75%",
    localPath: "/media/frido.webp",
    width: 1200,
    height: 1500,
  },
  {
    id: "rony-farofa",
    sourceId: "adoption-album",
    sourceUrl: "https://www.instagram.com/gaap.porquinhos/p/DZpet4qDZRC/",
    kind: "image",
    mode: "local",
    rights: "public-preview",
    publicationAuthorization,
    alt: "Rony e Farofa juntos, já no lar adotivo.",
    focalPoint: "50% 75%",
    localPath: "/media/rony-farofa.webp",
    width: 1086,
    height: 1448,
  },
  {
    id: "bella",
    sourceId: "adoption-album",
    sourceUrl: "https://www.instagram.com/gaap.porquinhos/p/DZpet4qDZRC/",
    kind: "image",
    mode: "local",
    rights: "public-preview",
    publicationAuthorization,
    alt: "Bella com outro porquinho-da-índia, em registro no lar adotivo.",
    focalPoint: "50% 65%",
    localPath: "/media/bella.webp",
    width: 1080,
    height: 1432,
  },
  {
    id: "ravena",
    sourceId: "adoption-album",
    sourceUrl: "https://www.instagram.com/gaap.porquinhos/p/DZpet4qDZRC/",
    kind: "image",
    mode: "local",
    rights: "public-preview",
    publicationAuthorization,
    alt: "Ravena, já no lar adotivo, em registro compartilhado pelo GAAP.",
    focalPoint: "50% 45%",
    localPath: "/media/ravena.webp",
    width: 1080,
    height: 1440,
  },
  {
    id: "frida",
    sourceId: "frida-highlight",
    sourceUrl: "https://www.instagram.com/stories/highlights/18106574042094482/",
    kind: "image",
    mode: "local",
    rights: "local-preview",
    alt: "Frida acolhida em mãos, em registro compartilhado pelo GAAP.",
    focalPoint: "50% 40%",
    localPath: "/media/frida.webp",
    width: 720,
    height: 1280,
  },
  {
    id: "support",
    sourceId: "adoption-album",
    sourceUrl: "https://www.instagram.com/gaap.porquinhos/p/DZpet4qDZRC/",
    kind: "image",
    mode: "local",
    rights: "public-preview",
    publicationAuthorization,
    alt: "Estelar, já no lar adotivo, junto a uma toalha em registro compartilhado pelo GAAP.",
    focalPoint: "57% 46%",
    localPath: "/media/support.webp",
    width: 1080,
    height: 1440,
  },
  {
    id: "peppa",
    sourceId: "peppa",
    sourceUrl: "https://www.instagram.com/giopezzolato/reel/Dcq3ctluilp/",
    kind: "video",
    mode: "embed",
    rights: "embed",
    alt: "Retrato de Peppa publicado em colaboração com o GAAP.",
    focalPoint: "50% 50%",
  },
  {
    id: "capuccino",
    sourceId: "capuccino",
    sourceUrl: "https://www.instagram.com/lettysitter/reel/DchnzGPIdUR/",
    kind: "video",
    mode: "embed",
    rights: "embed",
    alt: "Capuccino junto ao feno em publicação colaborativa com o GAAP.",
    focalPoint: "50% 50%",
  },
  {
    id: "zion",
    sourceId: "zion",
    sourceUrl: "https://www.instagram.com/gaap.porquinhos/reel/DPhfUBkDeta/",
    kind: "video",
    mode: "link",
    rights: "embed",
    alt: "Zion em registro posterior ao resgate, publicado pelo GAAP.",
    focalPoint: "50% 50%",
  },
  {
    id: "carinho", sourceId: "carinho",
    sourceUrl: "https://www.instagram.com/gaap.porquinhos/reel/DccAXt9OdMN/",
    kind: "video", mode: "embed", rights: "embed",
    alt: "Um porquinho recebe carinho em vídeo creditado a @myadventurouspigs, compartilhado pelo GAAP.",
    focalPoint: "50% 50%",
  },
];

export const stories: Story[] = [
  {
    id: "churros",
    name: "Churros",
    eyebrow: "Um recomeço acompanhado",
    summary:
      "Churros passou pelo acolhimento do GAAP. A publicação que apresentou sua busca por um lar hoje traz a atualização: ele foi adotado.",
    sourceId: "churros",
    mediaId: "churros",
    url: "https://www.instagram.com/gaap.porquinhos/p/DayekiAuliL/",
    statusLabel: "Adoção concluída",
    dateLabel: "Atualização consultada em 4 set. 2026",
  },
  {
    id: "frido",
    name: "Frido",
    eyebrow: "Uma procura registrada",
    summary:
      "Em agosto de 2026, o GAAP publicou que Frido procurava um lar. A situação atual deve ser confirmada no canal oficial.",
    sourceId: "frido",
    mediaId: "frido",
    url: "https://www.instagram.com/gaap.porquinhos/p/Dcj5T9Gt6ml/",
    statusLabel: "Status atual não confirmado",
    dateLabel: "Publicação de 27 ago. 2026",
  },
  {
    id: "rony-farofa",
    name: "Rony e Farofa",
    eyebrow: "Dois nomes, um novo capítulo",
    summary:
      "Em junho de 2026, o GAAP compartilhou Rony e Farofa juntos, já no lar adotivo.",
    sourceId: "adoption-album",
    mediaId: "rony-farofa",
    url: "https://www.instagram.com/gaap.porquinhos/p/DZpet4qDZRC/",
    statusLabel: "Adoção concluída",
    dateLabel: "Publicação de 16 jun. 2026",
  },
  {
    id: "bella",
    name: "Bella",
    eyebrow: "Um registro depois da adoção",
    summary:
      "Em junho de 2026, o GAAP compartilhou Bella já no lar adotivo.",
    sourceId: "adoption-album",
    mediaId: "bella",
    url: "https://www.instagram.com/gaap.porquinhos/p/DZpet4qDZRC/",
    statusLabel: "Adoção concluída",
    dateLabel: "Publicação de 16 jun. 2026",
  },
  {
    id: "ravena",
    name: "Ravena",
    eyebrow: "Um registro depois da adoção",
    summary:
      "Em junho de 2026, o GAAP compartilhou Ravena já no lar adotivo.",
    sourceId: "adoption-album",
    mediaId: "ravena",
    url: "https://www.instagram.com/gaap.porquinhos/p/DZpet4qDZRC/",
    statusLabel: "Adoção concluída",
    dateLabel: "Publicação de 16 jun. 2026",
  },
];

export const videos: Video[] = [
  {
    id: "zion",
    title: "Zion, depois do resgate",
    description:
      "Em um registro de outubro de 2025, o GAAP apresenta Zion em um momento posterior ao resgate.",
    sourceId: "zion",
    mediaId: "zion",
    url: "https://www.instagram.com/gaap.porquinhos/reel/DPhfUBkDeta/",
  },
  {
    id: "capuccino",
    title: "Capuccino junto ao feno",
    description:
      "Capuccino junto ao feno, em colaboração de @lettysitter com o GAAP. Assista na publicação original.",
    sourceId: "capuccino",
    mediaId: "capuccino",
    url: "https://www.instagram.com/lettysitter/reel/DchnzGPIdUR/",
  },
  {
    id: "carinho",
    title: "Um momento de carinho",
    description:
      "Vídeo de @myadventurouspigs, compartilhado pelo GAAP. Um pequeno momento de afeto e companhia.",
    sourceId: "carinho",
    mediaId: "carinho",
    url: "https://www.instagram.com/gaap.porquinhos/reel/DccAXt9OdMN/",
  },
];

export const faq: FaqItem[] = [
  {
    question: "Onde o GAAP atua?",
    answer:
      "O perfil oficial informa atuação em São Paulo. Consulte o canal oficial antes de iniciar um processo de adoção.",
    sourceId: "instagram",
  },
  {
    question: "O GAAP recebe visitas?",
    answer:
      "O material de adoção consultado descreve lares temporários em residências de voluntárias, sem visitação pública.",
    sourceId: "adoption-post",
  },
  {
    question: "Como começa uma adoção?",
    answer:
      "O primeiro passo indicado é o formulário oficial. O processo é de adoção consciente e deve ficar sob responsabilidade de uma pessoa adulta.",
    sourceId: "adoption-form",
  },
  {
    question: "Porquinhos que vivem em dupla podem ser separados?",
    answer:
      "O formulário oficial informa que pares não serão separados.",
    sourceId: "adoption-form",
  },
  {
    question: "Como acompanhar informações atuais?",
    answer:
      "Acompanhe o Instagram e a central de links do GAAP para publicações e orientações atualizadas.",
    sourceId: "instagram",
  },
];

export const participation: ParticipationItem[] = [
  {
    title: "Apoiar todos os meses",
    description:
      "A campanha oficial reúne contribuições recorrentes para as despesas do projeto.",
    href: links.support,
    label: "Apoiar no Apoia.se",
    sourceId: "support",
  },
  {
    title: "Começar uma adoção consciente",
    description:
      "Leia as orientações e preencha o formulário somente quando puder assumir essa responsabilidade.",
    href: links.adoption,
    label: "Abrir formulário de adoção",
    sourceId: "adoption-form",
  },
  {
    title: "Conhecer os cuidados",
    description:
      "Consulte o manual do adotante vinculado pelo projeto antes de decidir.",
    href: links.manual,
    label: "Ler o manual",
    sourceId: "manual",
  },
  {
    title: "Acompanhar o trabalho",
    description:
      "Siga as histórias, orientações e atualizações diretamente no perfil oficial.",
    href: links.instagram,
    label: "Ir ao Instagram",
    sourceId: "instagram",
  },
  {
    title: "Consultar a prestação de contas",
    description:
      "Acesse o documento vinculado pelo GAAP e verifique o período informado no próprio arquivo.",
    href: links.accounts,
    label: "Abrir prestação de contas",
    sourceId: "accounts",
  },
];

export const usedContent: UsedContent = {
  facts: [
    { id: "identity", sourceId: "instagram", status: "confirmed" },
    { id: "mission", sourceId: "instagram", status: "confirmed" },
    { id: "sao-paulo", sourceId: "instagram", status: "confirmed" },
    { id: "temporary-homes", sourceId: "support", status: "confirmed" },
    { id: "conscious-adoption", sourceId: "support", status: "confirmed" },
    { id: "monthly-support", sourceId: "support-post", status: "confirmed" },
    {
      id: "no-public-visits",
      sourceId: "adoption-post",
      status: "historical",
    },
    {
      id: "adult-responsibility",
      sourceId: "adoption-form",
      status: "confirmed",
    },
    {
      id: "pairs-stay-together",
      sourceId: "adoption-form",
      status: "confirmed",
    },
    { id: "churros-adopted", sourceId: "churros", status: "historical" },
    {
      id: "adoption-album-status",
      sourceId: "adoption-album",
      status: "historical",
    },
    { id: "zion-rescued", sourceId: "zion", status: "historical" },
    {
      id: "capuccino-collaboration",
      sourceId: "capuccino",
      status: "confirmed",
    },
    { id: "carinho-credit", sourceId: "carinho", status: "confirmed" },
    { id: "accounts-period", sourceId: "accounts", status: "historical" },
  ],
  sourceIds: [
    "instagram",
    "linktree",
    "support",
    "support-post",
    "adoption-post",
    "adoption-form",
    "manual",
    "accounts",
    "churros",
    "adoption-album",
    "zion",
    "capuccino",
    "carinho",
  ],
  mediaIds: [
    "logo",
    "hero",
    "churros",
    "rony-farofa",
    "bella",
    "ravena",
    "support",
    "zion",
    "capuccino",
    "carinho",
  ],
  urls: [
    ...Object.entries(links).map(([id, url]) => ({ id, url })),
    ...stories
      .filter(({ id }) => id !== "frido")
      .map(({ id, url }) => ({ id: `story-${id}`, url })),
  ],
};
