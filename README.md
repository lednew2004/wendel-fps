## TITAN PROTOCOL 3.6.0 — Ambiente, VEX, ADAPT-Ω, MÍMICO e Mobile

- 14 personagens / 42 habilidades equipadas de heróis.
- Novos muros, barreiras e obstáculos físicos compartilhados entre cliente e servidor.
- VEX evoluído com salto de muro, corrida vertical e ultimate SEM LIMITES.
- ADAPT-Ω: observa eventos, aprende imunidades, contra-ataca e usa evolução automática (três categorias).
- MÍMICO: clones com aparência e animações de operador; clones comuns também andam no multiplayer.
- Cópia de poderes pós-eliminação liberada pela validação do cliente.
- HUD mobile à frente dos controles e suporte a touchstart/touchend, além de pointer events.
- Todos os efeitos de combate importantes em multiplayer continuam calculados pelo servidor.

**Limites dos testes:** os testes automatizados não substituem uma verificação em celular físico, especialmente Safari iOS.

# TITAN PROTOCOL 3.5.3 — VOXEL SQUAD + EDITOR DE HUD (SQUAD OPERATIONS)

FPS 3D com personagens e habilidades, câmera exclusivamente em **primeira pessoa (FPS)**, 13 heróis com três técnicas próprias, modos de combate e missões táticas de esquadrão. Projeto em HTML/CSS/JavaScript + Three.js com servidor HTTP/WebSocket Node.js >=22, sem dependências de npm. A biblioteca Three.js é carregada pela internet via CDN.


## Novidades 3.5 — Personagens, armas, animações e cenário

- **20 GLBs detalhados e 20 GLBs de LOD:** 13 heróis e 7 perfis genéricos/inimigos com silhuetas reforçadas, acessórios e materiais PBR. Os modelos originais leves da versão 3.4 estão em `operatives/lod/`, carregados automaticamente no perfil BAIXA. O jogador vê a malha provisória até o GLB escolhido carregar.
- **17 clipes de animação por GLB detalhado**, incluindo recarga, deslocamentos laterais e três clips apenas de braços/tronco para combinar mira, tiro e movimento do corpo.
- **Quatro armas 3D GLB** com acessórios e materiais próprios; modelos procedurais anteriores ficam como fallback se o carregamento falhar.
- **Novo kit arquitetônico visual instanciado** com colunas, portas decorativas, fachadas, placas e sombreamento de contato pré-calculado. Não há alteração de colisão, portas utilizáveis ou novos interiores.
- **Otimização:** detalhes de arquitetura ocultos em BAIXA, GLB mais leves para celulares, geometria compartilhada para traçadores e sistema adaptativo de resolução com alvo distinto por tipo de dispositivo.

A implementação e os testes estão detalhados em `GRAFICOS_3_5.md`. **Não houve benchmark real de FPS nem teste completo de WebGL neste ambiente.** Os novos personagens são modelos estilizados originais gerados por código, não assets 3D profissionais provenientes de Blender.

## Histórico — Novidades 3.4 — Personagens GLB, animações, arquitetura, iluminação e laboratório WebGPU

**Personagens 3D:** a pasta `public/assets/models/operatives/` contém 20 arquivos GLB locais: modelos exclusivos para os 13 heróis mais 7 perfis genéricos/inimigos. Cada GLB contém **11 ossos**, materiais PBR, geometria com pesos de skin e **nove animações** (`idle`, `walk`, `run`, `dash`, `jump`, `fire`, `aim`, `hit`, `cast`). O carregamento é assíncrono e armazenado em cache por tipo; o jogo usa temporariamente o modelo procedural anterior e remove suas malhas quando o GLB fica pronto. As animações passam por `THREE.AnimationMixer` com transições entre ações. As silhuetas e as cores continuam reconhecíveis nas configurações baixas. **Os GLBs deste pacote foram modelados de forma autoral e programática, portanto não devem ser confundidos com personagens esculpidos, texturizados e animados manualmente em Blender.** Para substituir por modelos de artista, use os mesmos nomes de arquivo e preserve os nomes dos clipes de animação.

**Arquitetura:** três prefabs originais `GLB` (`relay_tower`, `field_station` e `power_generator`) compõem detalhes de cobertura nas estruturas existentes, além de tubos e arcos desenhados com instanciamento. As colisões e as posições dos objetivos **não foram alteradas**. Os detalhes adicionais são ocultados na configuração **BAIXA**.

**Luz e materiais:** `public/assets/baked/mission_ground_baked.webp` é uma textura pré-calculada de oclusão visual junto às 24 estruturas estáticas do mapa, evitando dezenas de luzes de preenchimento em tempo real. Os modelos são PBR e as texturas WebP do projeto foram preservadas. Sombras dinâmicas continuam sujeitas aos perfis de qualidade.

**WebGPU:** a página **`/webgpu-lab.html`** oferece um teste opt-in que compara tempos CPU/JS em uma cena sintética com WebGL e WebGPU **no dispositivo do usuário**. WebGPU não substituiu o renderizador principal, que permanece em WebGL. Os resultados da página **não são medições de FPS do jogo real nem de tempo de GPU**; não há conclusão de desempenho sem testes em aparelhos reais.

**Desempenho:** aproximadamente 2,1 MiB em personagens GLB compartilhados por tipo (arquivos individuais de cerca de 100–110 KiB), com reutilização de geometrias e materiais; download por demanda. O fallback procedural é liberado após a conclusão de cada GLB. Modelos detalhados distantes são ocultados e a atualização da animação distante é reduzida. Nenhuma tecnologia de streaming de backend ou dependência npm foi adicionada.

**Gerar assets novamente** (opcional para desenvolvimento):

```bash
python tools/generate_heroes_glb.py
python tools/generate_weapons_glb.py
python tools/generate_environment_assets.py
```

Requer Python com `trimesh`, `numpy` e `Pillow` **somente para gerar os assets**. Publicar o projeto não exige Python: todos os GLBs e texturas estão incluídos no ZIP.

**Validação de código/arquivos:** `npm test` verifica multiplayer, missões, 20 GLB, esqueletos, clipes, materiais e arquivos de iluminação. A compatibilidade WebGL/WebGPU, a fluidez real das animações e o desempenho em celulares **ainda exigem testes gráficos em dispositivos reais**.

## Histórico 3.3.3 — Dash direcional, recargas e cenário otimizado

- **Dash comum (X) e habilidades de avanço:** agora usam a direção do movimento no teclado ou joystick. Aceitam frente, trás, lados e diagonais. Se o jogador soltar os controles durante um deslizamento, conservam a direção da velocidade; parado, usam a direção da mira. Os combos de Shiro e Leo têm o mesmo comportamento no casual e no multiplayer; seus trajetos continuam respeitando as colisões, enquanto o servidor calcula destinos e valida a distância. O recuo de Shiro permanece no sentido contrário ao comando de movimento, conforme sua identidade.
- **39 recargas reequilibradas, idênticas no cliente e no servidor:** técnicas básicas 12–23 s, técnicas intensas 20–32 s, ultimates 30–35 s e Ressurreição 48 s. Cada poder mantém a duração do próprio efeito e sua identidade. As reativações permanecem abertas por **12 segundos**, separadas do tempo de recarga da próxima sequência.
- **Mapa tático com gráficos mais definidos e leves:** janelas de fachada, acabamentos, objetos sobre telhados, faixa de pedestres, vegetação arredondada e placas de operação. São detalhes de baixo custo com materiais compartilhados e instanciamento (`THREE.InstancedMesh`); não há iluminação dinâmica nova, chuva nem pós-processamento pesado. A geometria de colisão e a disposição dos objetivos são as mesmas.
- **Validação:** 77 testes automatizados, incluindo novas verificações de dash nas quatro direções, combos online, paridade de recargas e estrutura visual leve. Não é uma medição de FPS real; valide no PC e no celular.

## Correção 3.3.1 — Erro ao iniciar o motor 3D

A tela de erro era causada por uma exceção JavaScript no `ParkourController.updateHud`: o novo mapa Squad não tem percursos de parkour cronometrados e a interface tentava acessar `route.name` de uma rota inexistente. Agora o HUD lida com ausência de percursos e as ações `T` / `m-trial` não ativam rotas inexistentes. Os recursos de salto, corrida e parkour livre permanecem disponíveis. O erro na tela também identifica a exceção real para facilitar futuros diagnósticos.

**Validação da correção original:** 73 testes automatizados, incluindo 2 regressões específicas de inicialização, aprovados. A renderização WebGL completa ainda deve ser testada em um navegador real.

## Mudanças da versão 3.3

A jogabilidade e o mapa MOBA foram substituídos por uma **instalação de operações táticas**. Não há Top/Mid/ADC, jungle, torres nem bases opostas. O cenário possui base de operações, perímetro defensivo, posto de reconhecimento, geradores a sabotar, arena do Titã, ponto de extração e coberturas/edifícios para mobilidade vertical. Colisões compartilham a mesma geometria simplificada no cliente e no servidor.

Os **13 heróis** foram divididos em **quatro funções**, com armas iniciais e troca de armas específicas para a categoria durante as operações:

| Função | Heróis | Armamento da categoria |
|---|---|---|
| **Frente** | Vex, Nexus, Shiro | Escopeta e rifle |
| **Suporte** | Nyra, Mímico, Atlas | Metralhadora leve e rifle |
| **Sniper** | Kairos, Ícaro, Sombra | Rifle de precisão e rifle |
| **Bomber** | Éon, Volta, Leo, Butterfly | Rifle, sniper e metralhadora leve |

Cada herói mantém **suas três habilidades gratuitas** (39 técnicas no total), incluindo os combos com reativação de Shiro, Leo e Butterfly. Não existem compras de habilidades. A roda mostra o kit e os temporizadores. O modo PvP permanece livre para trocar armas.

## Modos de jogo

### 1. OPERAÇÕES SQUAD — campanha solo PvE

Escolha a função, o personagem e uma arma antes de iniciar. A partida reúne **quatro operadores**: você e **três companheiros com IA**, cobrindo as funções restantes. Os bots usam modelos 3D e têm movimentação com planejamento de rotas, tiro, busca de alvos, proteção, suporte de cura e reagregação automática quando caem. O jogador pode emitir ordens: **Seguir / Defender / Atacar / Ir ao objetivo** (tecla `G` ou botão SQUAD no celular).

Existem **três operações sequenciais** em dificuldade crescente:

1. **A Invasão Titã** — primeiro contato na Instalação Delta.
2. **Cortina de Ferro** — contra-ataque sobre a estação de energia.
3. **Protocolo Extinção** — cerco final ao núcleo Titã.

Cada operação percorre **cinco etapas**: defender um reator com o Suporte, reconhecimento da posição com o Sniper, desativar geradores com o Bomber, enfrentar o chefe Titã e, finalmente, reagrupar-se para extração. O Frente contém ameaças e abre caminho. As tarefas mudam conforme a função do jogador: um bot de outra função pode assumir a tarefa especializada. Se um bot falhar, há assistência de interação para evitar bloqueios de progresso. O progresso da campanha e o arsenal de melhorias permanentes são salvos no navegador.

### 2. SOBREVIVÊNCIA — PvE solo

Combate por ondas no novo mapa, com progressão e inimigos. Mantém a escolha de herói e três técnicas; este modo **não** acrescenta os três companheiros da campanha Squad.

### 3. TODOS CONTRA TODOS — online PvP

Salas com até **oito jogadores**, cada jogador contra os outros, com apelidos, códigos de sala, reconexão e dano validado pelo servidor. Herói e arma livres antes da partida. O modo PvP não exige funções complementares nem usa o sistema de missão PvE.

### 4. OPERAÇÃO SQUAD — cooperativo online

Escolha `COOP` no lobby multiplayer e compartilhe o código da sala. Entram **quatro jogadores** com funções distintas (Frente, Suporte, Sniper e Bomber). A missão só inicia após as quatro posições estarem presentes. O servidor controla as etapas, inimigos, HP, acertos, ações de suporte e vitória. O cooperativo possui um ciclo de missão compartilhado (defesa → reconhecimento → sabotagem → chefe → extração), com mecânicas mais simples que a campanha com bots. Não substitui a campanha solo e não inclui substituição automática por bots online caso um participante desconecte.

## Controles

- **WASD / mouse:** movimentação, mira e disparo; **Espaço:** salto/parkour.
- **1 / 2 / 3:** os três poderes do personagem, incluindo reativações de combos.
- **4 / F / roda do mouse:** trocar arma dentro das opções da função durante operações; livre no PvP.
- **CÂMERA:** primeira pessoa fixa, sem alternância para terceira pessoa.
- **X:** dash; **TAB:** roda de habilidades; **Esc:** pausar ou abrir painel da sala.
- **G:** ordens do esquadrão na campanha; **H:** granada na campanha; **G:** granada fora da campanha.
- **Celular:** mirar pelo toque, botão de disparo, habilidades 1/2/3, DASH, ARMA, CÂMERA e SQUAD.

## Instalar e publicar

```bash
npm start
```

O servidor entrega o frontend e as salas WebSocket na mesma origem. Acesse `http://localhost:3000` e `/health` (deve informar `3.5.3`). Para rodar testes:

```bash
npm test
```

Para regenerar colisões depois de editar `public/src/squadLayout.js`:

```bash
npm run build:colliders
```

A pasta pode ser publicada na **Render** usando `render.yaml` e um repositório GitHub. Veja `GUIA_PUBLICACAO_GRATIS.md`.

## Notas técnicas e limitações

- Os gráficos foram mantidos leves para dispositivos móveis, sem o pós-processamento pesado da antiga versão cyberpunk. Os avatares carregam GLB leves com esqueleto e animações autorais após o primeiro quadro. Durante o carregamento, aparece o modelo procedural anterior como fallback. Os modelos GLB são autorais e estilizados, não esculturas realistas feitas por artistas nem captura de movimento.
- As missões solo combinam bots e objetivos por função com regras simplificadas; os bots não usam ainda todos os poderes exclusivos dos personagens e não possuem comportamento de IA equivalente a títulos AAA.
- O PvE cooperativo funciona com estado de missão e inimigos autoritativos no servidor; é uma implementação básica, não uma simulação idêntica à campanha solo.
- No plano gratuito da Render, o serviço pode hibernar/reiniciar; salas e partidas online estão em memória e podem se perder com o reinício.
- Testes automatizados Node/WebSocket verificam protocolos, poderes, caminhos e progressão lógica, mas **não substituem testes WebGL reais** no PC e no celular. O navegador automatizado deste ambiente restringe o acesso ao jogo servido localmente.


## v3.5.3 — VOXEL SQUAD + CONFIGURAR HUD

- **Heróis:** 13 modelos GLB originais, cabeça, tronco e membros quadrados, com os uniformes e cores diferentes para cada classe. Mesmo padrão nos NPCs e no fallback 3D simples. Animações esqueléticas mantidas.
- **Cidade:** prédios em seis cores, céu azul vivo, marcações turquesa, vegetação mais verde, sem novas luzes dinâmicas nem efeitos pesados.
- **FPS exclusivo:** removida a opção de câmera em terceira pessoa e o botão anterior foi substituído por **⚙ HUD**.
- **Configurar HUD:** abrir pelo menu principal, pela pausa ou pelo painel da sala no online. Selecione os elementos, arraste na prévia, ajuste tamanho e opacidade; também é possível ocultar indicadores secundários, restaurar o padrão, cancelar ou salvar.
- **Segurança da interface:** pausa e comandos essenciais não podem ser ocultados. Valores de posição, tamanho e opacidade possuem limites seguros. Salvo localmente na chave `titan-hud-layout-v1` (não sincroniza com outras contas/dispositivos).
- **No celular:** pause a partida usando `Ⅱ` e toque em `⚙ HUD`. Os botões de tiro, mira, dash, corrida, arma, ação e joystick podem ser realocados. O editor não dispara tiros porque edita uma prévia separada.
- **Observações:** o HUD novo não altera hitboxes do cenário, a simulação ou o servidor. Todos os personagens permanecem originalizados, não são cópias do Steve do Minecraft. A aparência e o desempenho reais devem ser testados no navegador do usuário.


## v3.5.3 — correção reforçada do botão ATIRAR mobile

- `touchstart` e `touchend` registrados em captura na página inteira; detecção por coordenadas do botão evita que uma camada transparente intercepte o tiro.
- `pointerdown` preservado para caneta e navegadores sem suporte a Touch Events.
- O estado de tiro acompanha identificadores individuais de dedos, mesmo durante multitoque ou pointercapture perdido.
- O loop consulta também o estado dos dedos do mobile; a área de mira ignora toques sobre ATIRAR.
- Camada de combate acima da câmera; HUD superior continua acessível.
- Novas alterações visíveis como BUILD 3.5.3 no menu e no endpoint /health, para conferir que o deploy foi atualizado.
- CSS/JS/HTML enviados com Cache-Control no-store pelo servidor para evitar instalações antigas.
