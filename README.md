# TITAN PROTOCOL 2.5 — SOBREVIVÊNCIA & ECONOMIA DE PODERES

Jogo FPS 3D em HTML/CSS/JavaScript + Three.js com campanha, sobrevivência e salas online via Node.js + WebSocket, pronto para GitHub e Render.

## Alterações v2.5

- **Teia removida** da roda, dos menus, do servidor e do controle de parkour. Carregamentos antigos que usavam Teia são sanitizados e substituídos por poderes válidos.
- **Dash com recarga** de 4,8 s (tecla **X** e botão **DASH** no celular), reduzível por melhorias de mobilidade, mas nunca inferior a 2,5 s. O HUD indica o tempo restante. Não é possível ativar o dash enquanto recarrega ou congelado.
- **Progressão no casual (campanha e sobrevivência)**: o jogador começa cada nova partida com **Repulsão** no primeiro espaço e o segundo espaço vazio. Cada monstro abatido rende **créditos de combate**, separados da pontuação geral e dos créditos permanentes da campanha. Cada poder tem **preço próprio**; a roda exibe preço, saldo e estado de desbloqueio. Clique ou toque no poder bloqueado para **comprar e equipar**. Uma vez comprado, você pode alterná-lo livremente durante a mesma partida. A compra só é realizada se houver saldo e o poder não estiver no outro espaço. Não é possível contornar a compra pelos seletores do menu de pausa. A carteira e os desbloqueios reiniciam quando a partida recomeça.
- **Recompensas por eliminação**: Scout 55 CR; Gunner 75; Sniper 90; Tank 125; Hunter 115; Boss 450. Valores por habilidade variam de 140 a 850 CR conforme impacto. A Repulsão inicial custa 0 CR.
- **Recarga por impacto**: poderes comuns 12–22 s, mobilidade/furtividade 21–30 s, habilidades decisivas 28–65 s. Cura com HP a 30% ou menos: +6 s extras. Buraco Negro que alcança pelo menos dois adversários: +7 s. Rewind que recupera 35 HP ou mais: +9 s no online. As durações e tempos continuam visíveis nos botões. Recast de Teleporte/Clone Móvel durante janela ativa continua funcionando.
- **Multiplayer**: mantém escolha livre de dois poderes e o minimapa; os tempos e as penalidades críticas são validados pelo servidor. Progresso econômico é local à campanha/sobrevivência e **não** concede privilégios no PVP.

## Controles

PC: **WASD** mover, mouse mirar/atirar, **X** dash, **Z / V** poderes, **TAB** abre/fecha a roda sem interferir no navegador durante a partida. Clique no poder para comprar ou equipar. Celular: use o analógico esquerdo, mire e atire com a mão direita, pressione **DASH**, toque em **PODERES** para abrir a roda, selecione o espaço e toque no poder. Habilidades direcionadas usam segurar → arrastar → soltar. Nenhuma compra é realizada sem confirmação pelo clique/toque no poder.

## Publicação

Requer Node.js 22+. `npm start` para rodar, `npm test` para testar. Faça o upload do conteúdo do ZIP diretamente à raiz do repositório GitHub, incluindo `package.json`, `render.yaml`, `public/` e `server/`. Um único servidor Render entrega HTTP + WebSocket, sem Redis. No plano gratuito, salas armazenadas em memória podem desaparecer quando a instância reinicia.

**Verificações:** testes automatizados Node/WebSocket. A sensação de jogo, os controles de toque e a execução WebGL completa devem ser testados em aparelhos reais.
