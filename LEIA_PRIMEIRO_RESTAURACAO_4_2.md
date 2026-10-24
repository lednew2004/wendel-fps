# TITAN PROTOCOL 4.2 — Restauração de FPS (pacote local)

**Este pacote é uma atualização experimental da última base de tiro recuperada (3.9.1), não uma versão publicada.** O código da 3.9.1 foi preservado em um commit local antes das mudanças, que foram desenvolvidas na branch `restauracao-fps-4.2`. Nenhuma publicação foi executada.

## Rodar no seu computador

Requisitos: **Node.js 22 ou superior**, navegador recente com WebGL habilitado, conexão com internet para carregar a biblioteca Three.js pelo CDN do jogo original. Não é necessário Docker nem PostgreSQL.

1. Descompacte o ZIP.
2. Abra o terminal na pasta que contém `package.json`.
3. Execute `npm install` (a base original não usa pacotes Node externos).
4. Execute `npm start`.
5. Abra `http://localhost:3000` no computador ou no celular conectado à mesma rede (ajuste firewall/endereço IP, se necessário).

No Windows também é possível usar `INICIAR_LOCALHOST_WINDOWS.bat`; no macOS/Linux, `sh INICIAR_LOCALHOST_MAC_LINUX.sh`.

**Regerar mapa / testar / gerar release estático de servidor:**

```bash
npm run build:colliders
npm test
npm run build
```

Este é um jogo estático servido por um backend WebSocket nativo de Node, **sem etapa de bundling**. `npm run build` regenera os JSONs de colisão do servidor e executa todos os testes automatizados. A versão de produção executa o mesmo comando `npm start`, atrás de HTTPS/WSS quando estiver publicada; confira `render.yaml` e `GUIA_PUBLICACAO_GRATIS.md`. **Não alteramos a hospedagem automaticamente.**

## O que mudou nesta restauração

- **Combate preservado:** base de tiro 3.9.1, armas, dano, HUD, bots offline, esquadrão, modos locais e servidor de salas multiplayer. O desafio de parkour não substitui as partidas.
- **Dash mais natural:** as habilidades SHIRO/LEO que utilizavam deslocamentos instantâneos no cliente passaram a reutilizar a física de dash comum, com desaceleração e colisão com paredes. As habilidades que são teleporte de fato permanecem distintas.
- **Personagens:** 20 operadores visíveis no menu, reduzindo cinco kits considerados parecidos sem excluir seus dados antigos ou invalidar IDs legados.
- **Mapa:** quatro blocos que antes eram sólidos agora são edifícios com casco de paredes, abertura frontal, **portas operáveis**, cobertura, andar parcial, objetos de proteção e escadas visuais + superfícies de rampa. Colisão e portas compartilham coordenadas com o servidor.
- **Inimigos offline:** percepção intermitente, campo de visão, bloqueio de visão, audição de disparos, memória curta da última posição, dispersão de mira e passos de navegação para aproximar-se das portas.
- **Gráficos/UI:** correção na criação de materiais de fachadas, conservação das texturas e modelos 3.9.1, identidade mais colorida e ajustes de contraste nos menus/HUD.
- **Servidor:** endpoint `/health` passa a informar a versão `4.2.0` e conserva o protocolo original de salas e WebSocket.

## Controles principais

- `W A S D`: movimentar; mouse: mirar; clique esquerdo: atirar; `R`: recarregar.
- `Shift`: correr; `Espaço`: saltar; `X`: dash comum; `E`: interagir/abrir porta/usar escada próxima.
- `1`, `2`, `3`: habilidades equipadas do personagem; `G`: granada; `Esc`: pausar.

## Limites conhecidos / o que ainda precisa de validação

Esta entrega **não deve ser confundida com todos os 14 itens da especificação integral concluídos**. Ainda precisam de inspeção e testes práticos: todas as habilidades individuais (incluindo cooldowns e animações exclusivas), dash sincronizado de ponta a ponta com outros clientes conectados, movimentação nos 2 níveis de todos os edifícios, navegação complexa de bots em escadas e coberturas, otimização/FPS em máquinas diferentes e gráficos no navegador real.

O teste de navegador headless neste ambiente falhou por bloqueio administrativo de acesso HTTP (`ERR_BLOCKED_BY_ADMINISTRATOR`), embora o servidor tenha respondido às verificações HTTP no terminal. **Não foi validada uma partida jogável renderizada em WebGL aqui.** Para aprovação, rode localmente e percorra o checklist em `RELATORIO_DE_TESTES_4_2.md` antes de publicar.

Caso prefira voltar instantaneamente à versão antiga, utilize o ZIP original 3.9.1 fornecido separadamente, sem substituir o ambiente de produção.
