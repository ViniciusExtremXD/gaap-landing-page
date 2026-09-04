# Contrato de conteúdo do GAAP

`src/data/gaap.ts` é a fonte de dados da landing page. A apresentação pode importar os valores abaixo sem conhecer o gate de validação.

## Exports

- `site`: nome, nome completo, chamada, título, descrição, introdução e aviso de proposta.
- `publicationUrl`: destino exato autorizado para esta prévia pública.
- `publicationAuthorization`: registro do pedido do solicitante, destino, escopo e lista de derivados autorizados.
- `links`: objeto de URLs HTTPS com as chaves `instagram`, `support`, `linktree`, `adoption`, `manual` e `accounts`.
- `sources: Source[]`: registro de procedência.
- `media: Media[]`: manifesto de imagens e vídeos.
- `stories: Story[]`: histórias verificadas ou historicamente contextualizadas.
- `videos: Video[]`: vídeos selecionados, cada um ligado a uma entrada de `media` e à publicação original.
- `faq: FaqItem[]`: perguntas e respostas com `sourceId`.
- `participation: ParticipationItem[]`: ações com título, descrição, destino, rótulo e fonte.
- `usedContent: UsedContent`: lista explícita do que a página usa e, portanto, do que o gate valida.

Os tipos `Source`, `Media`, `Story`, `Video`, `FaqItem`, `ParticipationItem`, `EditorialStatus` e `UsedContent` também são exportados.

```ts
type Source = {
  id: string;
  url: string;
  checkedAt: string;
  status: "verified" | "partial" | "pending" | "unavailable";
  note: string;
};

type Media = {
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
};

type PublicPreviewAuthorization = {
  id: string;
  scope: "public-preview";
  destination: string;
  authorizedAt: string;
  request: string;
  recordPath: string;
  media: { id: string; sourceId: string; localPath: string }[];
};

type Story = {
  id: string;
  name: string;
  eyebrow: string;
  summary: string;
  sourceId: string;
  mediaId: string;
  url: string;
  statusLabel: string;
  dateLabel: string;
};
```

`usedContent.facts` aceita os estados editoriais `confirmed`, `historical`, `pending` e `proposal`. Um fato `pending` só pode permanecer no manifesto com `used: false`. O gate ignora candidatos não usados e rejeita pendências que tenham entrado na página.

## Mídia local e publicação

A autorização inicial informada pelo usuário cobria fotos e vídeos próprios da ONG no protótipo local. Depois de receber essa proposta, o solicitante pediu sua publicação no GitHub e no GitHub Pages. O escopo específico está registrado em [publication-authorization.md](publication-authorization.md) e se limita a `https://viniciusextremxd.github.io/gaap-landing-page/`, com os derivados já apresentados. Esse registro não representa licença irrestrita da ONG.

Para cada arquivo integrado à prévia pública autorizada:

1. altere a entrada correspondente para `mode: "local"`;
2. use `rights: "public-preview"` e associe `publicationAuthorization` somente quando o arquivo constar da autorização específica;
3. informe `localPath`, por exemplo `/media/churros.webp`;
4. mantenha a URL original em `sourceUrl`;
5. registre `width`, `height` e `focalPoint` a partir de `docs/media-derivatives.json`;
6. inclua o id em `usedContent.mediaIds` somente se a mídia for renderizada.

Os modos `preview` e `publish` aceitam `public-preview` com registro válido. Em `publish`, o destino solicitado também deve corresponder exatamente ao destino registrado. `local-preview` continua servindo para arquivos autorizados somente localmente e continua sendo rejeitado na publicação. Nenhuma mídia atual foi marcada com o estado genérico `public`.

A seleção final usa Zion em modo link e Capuccino/Carinho em modo embed. Esses embeds mostram publicações e encaminham a reprodução para o Instagram. Carinho preserva crédito a @myadventurouspigs; não é apresentado como filmagem própria ou resgate do GAAP. Peppa permanece apenas no inventário de pesquisa. Nenhum vídeo completo foi obtido ou hospedado localmente. Veja docs/verification.md para os testes reais e limites.

Churros está registrado como adoção concluída. Frido permanece no inventário com o contexto datado da publicação de 27 de agosto de 2026, mas foi removido de `usedContent` porque não está na interface final. O destaque de Frida foi verificado, mas sua situação atual não foi extrapolada a partir do último quadro histórico. Os seis derivados não usados de Frido/Frida estão em `assets/unused-media`, fora de `public`; o otimizador não os recria na exportação. Os originais continuam fora de `public`, em `assets/originals`.

## Gate

`validateContent({ mode, publicationUrl, sources, media, usedContent })` retorna `{ ok, issues }`. A validação percorre somente ids e fatos declarados em `usedContent` e rejeita:

- fato usado com estado `pending`;
- referência a fonte ou mídia inexistente;
- fonte usada com estado `pending` ou `unavailable`;
- mídia local usada sem arquivo ou sem direitos `local-preview`/`public-preview`/`public`;
- mídia usada com direitos `pending`, em qualquer modo;
- embed usado sem direitos `embed` ou `public`;
- mídia `local-preview` no modo `publish`;
- mídia `public-preview` sem registro de autorização, com arquivo/fonte fora da lista autorizada ou com destino diferente no modo `publish`;
- URL usada malformada ou sem HTTPS.

`validateLocalMediaFiles({ publicDir, media, usedContent })` complementa o gate com acesso real ao sistema de arquivos. Para cada mídia local usada, ele resolve o caminho dentro de `public`, rejeita travessia ou symlink que saia desse diretório e confirma que o destino é um arquivo regular. Imagens maiores também exigem os derivados `-480` e `-800` que a interface referencia; imagens menores que cada largura, como o logo de 128 px, não exigem uma ampliação artificial. Os códigos específicos são `LOCAL_PATH_OUTSIDE_PUBLIC`, `LOCAL_FILE_MISSING` e `LOCAL_VARIANT_MISSING`.

Cada problema possui `code`, `path` e `message`. O script executa as duas validações e converte qualquer problema em código de saída diferente de zero. O terceiro argumento opcional de `scripts/validate-content.ts` informa a URL efetiva da publicação; sem esse argumento, o CLI usa `publicationUrl` do manifesto. O build do Pages passa a URL derivada da configuração Astro para detectar mudanças acidentais de destino.

## Comandos recomendados

```bash
npm test
npm run validate:preview
npm run validate:publish
npm run check
npm run build
```

`validate:publish` passa para a proposta e o destino atualmente registrados. Continua falhando se uma mídia usada for marcada `local-preview`/`pending`, se faltar seu registro específico de prévia pública ou se o destino divergir.

## Registro TDD

- RED inicial: com a API compilável ainda sem regras, `tsx --test tests/content-validation.test.ts` apresentou 8 falhas esperadas nos cenários de fato pendente, fonte ausente, mídia local incompleta, uso em publicação e URLs inválidas; os casos válidos e não usados permaneceram verdes.
- RED incremental: o caso de fonte usada com estado `pending` falhou antes da regra `UNREADY_SOURCE` ser adicionada.
- RED de arquivos: com o verificador de I/O ainda ausente, os casos de arquivo inexistente e travessia para fora de `public` falharam; o arquivo real dentro de `public` foi o controle verde.
- RED de direitos e derivados: embeds e links usados com `rights: "pending"`, embed com direitos incompatíveis e imagem sem variante responsiva falharam antes das novas regras. Um caso incremental confirmou que o logo pequeno não deve exigir variantes maiores que o original.
- GREEN do protótipo local: a suíte isolada de conteúdo passou com 20 testes, incluindo os subtestes de URL, direitos por modo e quatro cenários reais de filesystem; a verificação integrada daquela etapa passou com 28 testes no total.
- RED de publicação: os novos casos de autorização específica, registro ausente, destino ausente/diferente e troca por original/fonte de terceiros apresentaram 7 falhas antes da implementação.
- GREEN da publicação: a suíte isolada de conteúdo passou com 27 testes. Os gates `preview` e `publish` passaram para o manifesto atual; o modo `publish` segue coberto pelos casos negativos de autorização local e pendente.
