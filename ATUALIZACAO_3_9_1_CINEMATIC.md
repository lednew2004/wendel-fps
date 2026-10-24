# TITAN PROTOCOL 3.9.1 — Cinematic Urban Lab (localhost)

## Objetivo
Uma **prova de conceito gráfica** para o navegador, ainda com Three.js e JavaScript. **Não é uma migração para Unity, não inclui modelos humanos realistas, não altera a física nem reprograma as habilidades**. A arte atual continuará estilizada até que os GLBs dos personagens e a arquitetura sejam substituídos por modelos profissionais.

## Novidades implementadas
- Materiais de fachada PBR locais com arquivos de albedo, normal e rugosidade (`assets/pbr/facade_*.webp`).
- Nova paleta de concreto, aço e vidro; as fachadas coloridas originais podem ser restauradas no comparador.
- Cena urbana adicionada sem colisores: caixilhos com profundidade, juntas, pilares, cornijas, marquises, arcos, escadas de entrada, tubulações, equipamentos de telhado, painéis inclinados e saídas de emergência.
- Detalhes nas ruas: grelhas, refletores, balizadores, pequenos arbustos e poças com acabamento especular simples (não são reflexos reais por ray tracing).
- Painéis e botões HUD com bordas retas, cantos chanfrados, paleta mais discreta. Controles de toque continuam utilizáveis; o analógico visual foi redesenhado em octógono.
- Desktop inicia em qualidade ALTA para observar o resultado. Mobile inicia em BAIXA por desempenho; o jogador pode elevar manualmente nas configurações.
- Comparação A/B com F8 ou botão à direita, ainda no jogo.

## Testar
1. Instale Node.js 22 ou superior.
2. Descompacte tudo e execute `INICIAR_LOCALHOST_WINDOWS.bat` no Windows.
3. Acesse http://localhost:3000 no navegador (é necessário ter internet para os módulos Three.js da CDN).
4. Entre no treino, pressione **F8** para trocar **Visual original ↔ Cinemático**. Compare na mesma posição.
5. Em pausa > Qualidade gráfica: teste **ALTA** primeiro; depois **ULTRA** se a GPU suportar. Meça o FPS.
6. Não faça deploy de produção antes da validação no navegador real e no celular.

## Garantias e limitações
- 116 testes Node automatizados passaram.
- HTTP do servidor `/api/health` e rotas dos novos arquivos responderam normalmente.
- O navegador automatizado disponível neste ambiente bloqueou `127.0.0.1`; **o resultado 3D não foi validado visualmente aqui**.
- Não foram modificados modelos de personagem, animações, tiro, poderes, colisão ou regras de servidor; apenas paleta de materiais da cena, detalhes 3D e UI.
- Não foi instalado outro motor: Unity-like é alcançável com ativos 3D profissionais, materiais e arte, não por substituição automática de motor.
