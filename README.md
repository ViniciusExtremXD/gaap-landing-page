# GAAP — Pequenas vidas. Grandes recomeços.

Landing page para apresentação ao Grupo de Apoio Amigos do Pudim: fotografias reais, histórias verificadas no Instagram, apoio pelo Apoia.se, adoção e informações sobre o projeto.

**[Abrir a proposta no GitHub Pages](https://viniciusextremxd.github.io/gaap-landing-page/)**

Astro estático, TypeScript, CSS autoral e fontes locais. Sem backend, cadastro, checkout ou analytics próprios. A versão publicada permanece identificada como proposta em revisão e solicita não indexação; não é uma declaração de aprovação institucional do site.

## Executar

Use Node 24 LTS (ou Node 22.19+). As versões das dependências estão no `package-lock.json`.

```sh
npm ci
npm run dev
```

O servidor local abre em `http://127.0.0.1:4321/`.

```sh
npm test
npm run check
npm run build
npm run preview
```

## Build para o GitHub Pages

```sh
npm run build:pages
```

Esse comando valida o conteúdo para o destino autorizado, configura a base `/gaap-landing-page/`, gera `dist-pages/`, verifica caminhos de arquivos e âncoras das duas páginas e cria `.nojekyll`. A página de privacidade, as imagens responsivas, as fontes e os scripts usam essa mesma base. O build local permanece em `dist/`, de modo que publicar não quebra a prévia local.

O GitHub Pages publica o conteúdo estático da raiz da branch `gh-pages`. A branch `main` contém o código-fonte. Para atualizar a versão pública, execute as verificações e o build acima, copie o conteúdo de `dist-pages/` para um checkout de `gh-pages`, faça commit e push. Alterações em `main` não publicam automaticamente.

## Conteúdo e manutenção

- `src/data/gaap.ts`: informações, links oficiais, fontes datadas, histórias, FAQ e manifesto de mídias.
- `src/components/` e `src/pages/`: composição da experiência e página de privacidade.
- `src/styles/global.css`: identidade, enquadramentos, responsividade e movimento.
- `src/scripts/site.ts`: navegação, carrossel e carregamento das incorporações.
- `docs/content-contract.md`: regras de validação editorial e de arquivos.
- `docs/media-derivatives.json`: dimensões, enquadramentos e procedência dos derivados.

A pesquisa selecionou conteúdo institucional e histórias acessíveis; não é uma cópia de todo o Instagram. A prestação de contas vinculada é de **2023**. Histórias de adoções concluídas não representam disponibilidade atual.

O movimento inclui abertura com máscara, entradas em sequência, profundidade sutil nas fotografias durante a rolagem, faixa editorial em movimento e percurso de cuidado desenhado em SVG. O cabeçalho destaca a logo oficial, os canais Instagram/Linktree e o progresso de leitura. A rolagem permanece nativa; efeitos de profundidade são atualizados sob demanda a cada quadro.

O site mantém o movimento completo ativo independentemente da preferência do sistema ou de escolhas salvas anteriormente. O menu se recolhe ao descer e reaparece ao subir, repetindo a entrada de links e ícones. Não há controle global de pausa.

## Fotografias, vídeos e direitos

Os derivados das sete mídias locais usadas nesta proposta estão abrangidos pelo pedido de publicação específico no GitHub Pages. O escopo `public-preview` e os arquivos correspondentes estão em [docs/publication-authorization.md](docs/publication-authorization.md). Isso não concede uma licença irrestrita sobre as mídias ou autoriza sua reutilização em outros projetos.

Originais de alta resolução, imagens não utilizadas e arquivos locais de pesquisa não fazem parte deste repositório. O script `scripts/optimize-media.mjs` documenta a geração dos derivados e depende dos originais autorizados, mantidos separadamente.

Zion abre a publicação no Instagram. Capuccino e o vídeo creditado a `@myadventurouspigs` usam incorporações oficiais sob demanda e links de reprodução no Instagram. Nenhum vídeo completo é hospedado neste site; não há autorização presumida para músicas ou gravações de terceiros. As incorporações são removidas ao fechar, trocar de item, sair da área visível ou ocultar a aba.

As fontes Fraunces e DM Sans são servidas localmente. Suas licenças estão em `docs/licenses/`.

## Validação

`validate:preview` verifica fontes, direitos e arquivos usados. `validate:publish` também rejeita direitos pendentes ou somente locais e exige que a autorização da prévia corresponda ao destino, à fonte e ao arquivo. O build público verifica o endereço configurado, sem tratar a autorização como uma liberação genérica.

A suíte cobre conteúdo, caminhos, arquivos e interações. Os comandos `npm test`, `npm run check` e `npm run build:pages` devem passar antes de uma atualização pública. Nenhum destes comandos faz doações, envia formulários ou altera canais oficiais do GAAP.
