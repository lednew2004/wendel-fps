# TITAN PROTOCOL 4.8.4 — CINEMÁTICA, MENU INTEGRAL E ÁUDIO

Base: Titan Protocol 4.8.3 (Liga contínua, telhados corrigidos). Contém todos os arquivos e sistemas originais, com alterações pontuais no menu e no áudio.

## Rodar

Requer Node.js 22+ e conexão à internet para instalar o Three.js e, opcionalmente, baixar os efeitos gravados de armas.

```bash
npm install
npm start
```

Abra o endereço localhost exibido no terminal. O `npm install` executa automaticamente `node scripts/install-sfx.mjs` para tentar obter gravações reais de tiros, recargas e manuseio de armas com licença CC0. Se não conseguir baixar os arquivos (proxy, rede ou indisponibilidade), o jogo permanece funcional com as amostras acústicas locais de reserva.

Depois, para tentar baixar os sons reais novamente:

```bash
npm run sfx:install
```

## O que mudou

- `public/src/entryFlow.js`: experiência de inicialização com cinemática e barra de preparo; fluxo modo → operador → confirmar → iniciar, incluindo tratamento de carregamento da cidade e falhas.
- `public/src/entryFlow.css`: layout ocupa 100% da janela, sem painel centralizado e com versões para desktop e celulares horizontais.
- `public/src/operatorPreview.js`: prévia tridimensional de modelos GLB dos 8 operadores disponíveis.
- `public/src/heroSelection.js`: mostra todos os oito operadores na grade; nome, perfil e três habilidades são atualizados na escolha.
- `public/src/audio.js`: reprodução por buffers de áudio (WAV) em vez dos bipes de osciladores; variação sutil de tiro, limite de sobreposição e preload.
- `public/assets/sfx/*.wav`: quinze amostras locais de reserva para jogo funcional sem depender do servidor externo.
- `scripts/install-sfx.mjs`: instalador opcional de gravações CC0 que substituem amostras locais específicas.
- `public/src/game.js`: solicitação de GPS ocorre apenas ao optar pelo modo Minha Cidade, não na inicialização geral.

Modos: Liga dos Titãs (sobrevivência PvP bots), Treino Tático (campanha e prática contra IA), Minha Cidade (geolocalização) e Multijogador (sala online). O botão de tela cheia está disponível no topo; no navegador, entrar em tela cheia nativa requer ação do usuário por política de segurança.

## Licenças e limitações

Gravações reais opcionais: OpenGameArt, autores kurt (pistola / Magnum / Black Powder) e SpringySpringo (rifle reload / shotgun cock). As respectivas páginas indicam licença CC0. Consulte `SFX_SOURCES.md`.

As amostras WAV já presentes no ZIP são efeitos de reserva gerados localmente, não gravações de armas reais. Para **tiros gravados de fato**, execute `npm install` ou `npm run sfx:install` em um ambiente que consiga acessar o OpenGameArt. Não foi possível baixar os binários reais nesta sessão; a execução visual WebGL completa também não pôde ser verificada neste ambiente. Foram executadas verificações estáticas JavaScript e regressões do servidor para bots, campeões e navegação de telhados.

A prévia 3D do operador utiliza um contexto WebGL leve adicional somente quando a tela de escolha de personagem está visível. Os GLBs permanecem locais.
