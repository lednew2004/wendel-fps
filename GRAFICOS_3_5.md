# TITAN PROTOCOL 3.5.0 — GRAPHICS REVOLUTION

## Implementado sobre a versão 3.4.0

**Personagens — 13 heróis e 7 classes genéricas/inimigos:** gerados novamente como GLB 2.0 originais com materiais PBR, estrutura de 11 juntas e equipamentos visuais por identidade. Shiro recebe ombreiras e equipamentos de combate, Leo placas de energia, Butterfly extensões de traje e acessórios luminescentes, e os outros dez modelos recebem diferenciações de visor, proteção, detalhes de uniforme e acessórios. Os modelos são **estilizados, criados programaticamente**, e NÃO representam personagens de um estúdio de arte, escultura manual em Blender, captura de movimento ou fotorrealismo.

**Animações:** 17 clipes por GLB detalhado — `idle`, `walk`, `run`, `dash`, `jump`, `fire`, `aim`, `hit`, `cast`, `strafe_left`, `strafe_right`, `crouch`, `land`, `reload`, `aim_upper`, `fire_upper`, `cast_upper`. O runtime mistura animação de locomoção com clipes que alteram apenas os ossos do tronco/braços. A transição possui crossfade. Animações de recarga, dash e poder são conectadas ao jogador local em terceira pessoa. O LOD de celular usa os nove clipes antigos e trata os novos clipes como opcionais.

**Armas:** quatro GLBs 3D originais em `public/assets/models/weapons/` (`rifle`, `shotgun`, `sniper`, `lmg`), feitos com partes separadas por material PBR. Carregamento por demanda e fallback para as armas anteriores. Ponto de disparo em terceira pessoa passa a acompanhar a junta do braço do modelo GLB; o modelo visual antigo pode ser removido sem deslocar o traçador de bala. Recuo, mira, recarga, áudio e danos anteriores são mantidos. O flash do cano recebe um pequeno sprite radial sem iluminação extra no perfil BAIXA, e a origem do efeito respeita o comprimento da arma.

**Ambiente:** kit de fachadas com InstancedMesh para colunas, acabamentos, portas **decorativas**, janelas, coberturas, luzes simuladas e avisos, além da sombra de contato WebP pré-calculada. Os detalhes são ocultados em **BAIXA**. O cenário continua com **a mesma geometria de colisão** e os mesmos caminhos e objetivos. As novas portas são DECORATIVAS; não são novos interiores atravessáveis.

**PC e celular:** com qualidade BAIXA, modelos GLB v3.4 mais leves são usados como LOD, sem baixar os novos modelos pesados; qualidade MÉDIA e superior recebe os modelos novos. Geometria compartilhada para traçadores, limite de efeitos desenhados no celular, sombra de muzzle flash dinâmica desativada no perfil BAIXA. O ajuste automático de resolução usa limites diferentes para celular (29/39 FPS) e computador (43/58 FPS); esses são limiares do sistema de adaptação, **não resultados medidos**.

**Renderizador:** Three.js WebGL segue como modo de produção. A página `/webgpu-lab.html` continua sendo uma avaliação experimental **separada**, não habilitada automaticamente. Nenhuma promessa de ganho de FPS com WebGPU.

## O que continua igual

13 heróis e 39 habilidades; dash multidirecional; combos, cooldowns e kits; quatro classes; três operações PvE com três bots; cooperativo online para quatro; PvP todos contra todos; parkour, mira, controles móveis, câmera em primeira/terceira pessoa; salas WebSocket e deploy GitHub/Render.

## Arquivos relevantes

- `tools/generate_heroes_glb.py`: modelos GLB autorais com variantes e 17 clipes.
- `tools/generate_weapons_glb.py`: quatro armas 3D GLB.
- `public/src/skinnedOperatives.js`: runtime das animações em camadas, LOD, cache e fallback.
- `public/src/sceneDetails35.js`: detalhes arquitetônicos instanciados.
- `public/src/weapons.js` e `public/src/thirdPersonCamera.js`: armas, animação e origem do disparo.
- `public/assets/models/operatives/lod/`: personagens de baixa complexidade para hardware modesto.
- `public/assets/baked/architecture_contact_shadow.webp`: sombreamento pré-calculado.

## Verificação e limitações

Rodar `npm test` valida regressões e formatos de assets; os modelos de arma foram lidos como cenas glTF, e a API HTTP pode ser conferida localmente em `/health`. Não foi possível testar interativamente uma partida WebGL nesta infraestrutura, porque o Chromium local bloqueia navegação por política. É **necessário testar os modelos, a direção do muzzle, o visual, a memória e o FPS** em PC e celular, especialmente a transição de câmera e todos os heróis. Não há benchmarks FPS reais incluídos no pacote.

Os assets GLB usam PBR sem mapas de textura fotografados ou lightmaps complexos de um pipeline Blender profissional. A arquitetura extra não possui interiores jogáveis novos. Os arquivos PBR WebP pré-existentes permanecem no projeto. O desempenho depende do aparelho e da conexão para carregar o Three.js pela CDN.
