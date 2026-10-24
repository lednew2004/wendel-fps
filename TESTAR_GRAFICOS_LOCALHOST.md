# TITAN PROTOCOL 3.9.0 — Laboratório gráfico local

Esta é uma **versão experimental**, separada da versão publicada no Render. Não publique antes de verificar os gráficos e o desempenho no seu computador e em um celular.

## Como iniciar no Windows

1. Instale o **Node.js 22 ou superior** (https://nodejs.org/), se não tiver.
2. Descompacte o ZIP inteiro em uma pasta, como `C:\\TITAN-PROTOCOL-3.9`.
3. Clique duas vezes em `INICIAR_LOCALHOST_WINDOWS.bat`. Mantenha a janela aberta.
4. Abra **http://localhost:3000** no navegador. Não abra `public/index.html` com dois cliques.
5. Para testar a jogabilidade, selecione **Treinamento**, entre na partida e percorra a cidade.

## Como iniciar com terminal (Windows/macOS/Linux)

Abra um terminal na pasta onde está `package.json`:

```bash
node server/server.mjs
```

Se a porta 3000 já estiver ocupada, no PowerShell use `$env:PORT=3001; node server/server.mjs`, e abra `http://localhost:3001`.

## Compare os gráficos

- **F8** alterna NOVO ↔ ORIGINAL durante o jogo no PC.
- No PC ou celular, toque no botão `GRÁFICOS 3.9 · NOVO` / `GRÁFICOS · ORIGINAL` na parte superior direita da tela.
- No menu de pausa, qualidade gráfica: **Média** ou **Alta** para começar; **Ultra/Cinematográfica** exige GPU mais forte.
- Na opção **ALTA** aparecem equipamentos adicionais em telhados e floreiras. Na **BAIXA**, parte dos detalhes é ocultada para celular.
- O FPS pode ser visto no HUD. Compare na **mesma posição, com a mesma qualidade e a mesma resolução de renderização**.

## Comparadores independentes

- **http://localhost:3000/comparativo-grafico.html**: cena visual simplificada lado a lado (Three.js × PlayCanvas).
- **http://localhost:3000/webgpu-lab.html**: backend WebGL × WebGPU experimental.

Os comparadores não representam a renderização completa do TITAN e **não migramos o jogo para PlayCanvas**. A versão jogável usa Three.js. Os módulos 3D são carregados pelo CDN e, portanto, você precisa de **acesso à internet na primeira carga**. O servidor do jogo (HTTP + WebSocket) roda inteiramente no `localhost`; contas online e Render não são necessários para o treino.

## Alterações de 3.9

- Fachadas com janelas de vidro PBR, molduras e iluminação interna simulada.
- Letreiros e LEDs, telhados com equipamentos de manutenção e parapeitos.
- Objetos urbanos decorativos: floreiras, arbustos, luminárias, guias e pintura da pista.
- Detalhes via `THREE.InstancedMesh` com geometria reaproveitada; sem novos colisores e sem luzes dinâmicas por janela.
- A/B dentro da partida sem reiniciar, com opção salva localmente.
- Preservados personagens, habilidades, construção do FORGE, jogo solo e multiplayer da versão 3.8.1.

## O que ainda não está nesta versão

- **Não houve migração** para PlayCanvas, Babylon ou Unity.
- Esta versão **não incorpora ainda** as reformulações dos personagens da proposta 3.9 (BLOOM, CIPHER, ultimates etc.).
- Sem ray tracing, sombras físicas de vidro ou SSR em tempo real.
- Os modelos dos personagens e as animações originais foram mantidos. O foco desta experiência é melhorar a aparência da cidade e comparar performance de renderização.

## Publicação posterior

Depois de validar, substitua os arquivos da sua pasta do GitHub/Render pelo conteúdo do ZIP, então execute `git add .`, `git commit -m "feat: graphics lab 3.9 - city rendering and A/B test"` e `git push origin main`. O teste no localhost não publica o projeto automaticamente.
