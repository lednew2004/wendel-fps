# TITAN PROTOCOL 2.8 — CYBERCITY

Esta atualização modifica o jogo executável em `public/` e mantém o servidor multiplayer em `server/`.

## Atualizações gráficas

- Visual noturno de ficção científica inspirado no gênero cyberpunk: névoa azul/roxa, iluminação fria e letreiros neon.
- Fachadas com detalhes luminosos, placas publicitárias e outdoors gerados por código.
- Chuva leve criada com partículas, novos tons de metal/asfalto e reflexos do ambiente PBR já usado.
- Bloom, anti-aliasing e oclusão ambiental conforme o nível gráfico, com controle de qualidade e desempenho.
- Novas cores, nomes e identidade das seis classes de inimigos e do operador. Os personagens ainda são procedurais (Three.js), não GLB esculpidos.
- HUD com cores neon coordenadas com o novo cenário.

## Preservado

Jogo casual, campanha, sobrevivência, progressão por créditos, as 18 habilidades, roda TAB, dash com cooldown, minimapa, cidade e interiores, multiplayer WebSocket e salas personalizadas.

## Limitações

- O cenário real é 3D procedural e não atinge a complexidade da imagem conceitual gerada na conversa. Essa imagem **não** é uma captura real do jogo.
- Não houve validação visual fim-a-fim em navegador gráfico neste ambiente; recomendamos validar no PC e no celular.
- Alterações de pós-processamento podem reduzir FPS em aparelhos antigos; use qualidade BAIXA ou MÉDIA se necessário.

## Publicação no Render

1. Descompacte na raiz do repositório GitHub, de modo que `package.json`, `render.yaml`, `public/` e `server/` fiquem na raiz.
2. `git add .`
3. `git commit -m "TITAN PROTOCOL 2.8 - Cybercity"`
4. `git push origin main`
5. Confirme no endpoint `/health` a propriedade `"version":"2.8.0"`.

Verificação automatizada executada: `node --test server/tests/*.test.mjs` — 48 testes aprovados. Essa verificação não equivale a testes de gameplay WebGL reais.
