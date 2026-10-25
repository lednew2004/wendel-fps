# TITAN PROTOCOL 4.8.9 — ASCEND VISUAL EDITION

## Objetivo

Retornar integralmente ao **FPS de Titan Protocol**, aproveitando exclusivamente o *visual da cidade* e a paleta de ASCEND: ORIGINS 1.1. Este pacote parte de Titan Protocol 4.8.8 e contém o projeto completo (servidor Node, cliente Three.js, modelos GLB, sons, mapas e modos).

## Mudanças visuais

- **Paleta urbana:** asfalto grafite, fachadas azul-acinzentadas, concreto neutro, estruturas em aço escuro e reflexos azulados. Sinalização e barras de interface em verde-lima, com iluminação do sol em âmbar.
- **Cidade:** preservadas todas as ruas jogáveis, coberturas, escadas, passagens, caixas, prédios com interior e posições de inimigos do Titan. As laterais ganham janelas com vidros frios e algumas células iluminadas.
- **Profundidade visual:** prédios extras *fora da área jogável*, com janelas instanciadas. São apenas cenário visual, sem colisores nem falsos caminhos de parkour.
- **Céu:** gradiente atmosférico baseado na aparência de ASCEND, renderizado em shader leve que acompanha a câmera. Não precisa de serviço externo.
- **HUD e menu:** interface escura azul-petróleo, contrastes melhores e detalhes em verde-lima. Mantida a seleção original de modos e personagens em tela cheia.

## O que **não** foi mudado

- Câmera e controles **em primeira pessoa (FPS)**.
- Armas, tiros, recargas, tiros de bots e personagens.
- Sistemas de combate, habilidades do Vex, campanha, Liga e multiplayer.
- **SQUAD_BLOCKS** e outros volumes de colisão compartilhados com o servidor: não foram alterados; a nova paisagem não muda a geometria navegável.
- O modo Minha Cidade / Google Maps continua ausente do menu.

## Instalação

Node.js 22+:

```bash
npm install
npm start
```

No navegador, acesse o endereço local exibido pelo servidor (habitualmente `http://localhost:3000` ou a porta definida em `PORT`).

## Testes disponíveis

```bash
npm run test:visual
npm run test:vex
npm run test:spawn
npm run test:league
```

A verificação das dependências NPM não foi concluída no ambiente de criação, portanto a cena WebGL final ainda precisa de teste visual em navegador real. Os testes automatizados e a verificação de sintaxe passaram.

## Arquivos alterados / criados

- `public/src/squadWorld.js` — materiais, janelas e panorama distante.
- `public/src/world.js` — luz, atmosfera e tonalidade.
- `public/src/ascendAtmosphere.js` — **novo** shader do céu.
- `public/src/ascendPalette.css` — **nova** paleta de interface.
- `public/index.html` — importa o CSS novo.
- `public/src/entryFlow.js` — texto da identificação da versão no menu.
- `package.json`, `package-lock.json` — identificador da versão e teste adicional.
- `tests/visual_ascend_489.test.mjs` — 8 verificações da migração estética.

## Importante

Esta é uma **migração de direção de arte**, não uma substituição do mapa de FPS por outra cidade nem uma alteração de física. Os arranha-céus do horizonte são decorativos. Assim, um jogador continua usando exatamente os mesmos caminhos e pontos de confronto da 4.8.8.
