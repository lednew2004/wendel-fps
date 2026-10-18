# TITAN PROTOCOL 3.3.3 — SQUAD OPERATIONS (MOVIMENTAÇÃO E EQUILÍBRIO)

FPS 3D com personagens e habilidades, câmera em **primeira ou terceira pessoa**, 13 heróis com três técnicas próprias, modos de combate e missões táticas de esquadrão. Projeto em HTML/CSS/JavaScript + Three.js com servidor HTTP/WebSocket Node.js >=22, sem dependências de npm. A biblioteca Three.js é carregada pela internet via CDN.

## Novidades 3.3.3 — Dash direcional, recargas e cenário otimizado

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
- **V:** alternar entre primeira e terceira pessoa (salvo no navegador).
- **X:** dash; **TAB:** roda de habilidades; **Esc:** pausar ou abrir painel da sala.
- **G:** ordens do esquadrão na campanha; **H:** granada na campanha; **G:** granada fora da campanha.
- **Celular:** mirar pelo toque, botão de disparo, habilidades 1/2/3, DASH, ARMA, CÂMERA e SQUAD.

## Instalar e publicar

```bash
npm start
```

O servidor entrega o frontend e as salas WebSocket na mesma origem. Acesse `http://localhost:3000` e `/health` (deve informar `3.3.1`). Para rodar testes:

```bash
npm test
```

Para regenerar colisões depois de editar `public/src/squadLayout.js`:

```bash
npm run build:colliders
```

A pasta pode ser publicada na **Render** usando `render.yaml` e um repositório GitHub. Veja `GUIA_PUBLICACAO_GRATIS.md`.

## Notas técnicas e limitações

- Os gráficos foram mantidos leves para dispositivos móveis, sem o pós-processamento pesado da antiga versão cyberpunk. Os avatares são humanoides **procedurais em Three.js**, não modelos realistas externos com captura de movimento.
- As missões solo combinam bots e objetivos por função com regras simplificadas; os bots não usam ainda todos os poderes exclusivos dos personagens e não possuem comportamento de IA equivalente a títulos AAA.
- O PvE cooperativo funciona com estado de missão e inimigos autoritativos no servidor; é uma implementação básica, não uma simulação idêntica à campanha solo.
- No plano gratuito da Render, o serviço pode hibernar/reiniciar; salas e partidas online estão em memória e podem se perder com o reinício.
- Testes automatizados Node/WebSocket verificam protocolos, poderes, caminhos e progressão lógica, mas **não substituem testes WebGL reais** no PC e no celular. O navegador automatizado deste ambiente restringe o acesso ao jogo servido localmente.
