# TITAN PROTOCOL 3.3.2 — Movimento, cooldown e cidade otimizada

**Base:** versão 3.3.1 (inclui correção do erro de inicialização `parkour.js`).

**Mudanças:** dash X e combos Shiro/Leo agora seguem o movimento (WASD/diagonal/joystick; impulso baseado na velocidade se o comando foi solto); personagem parado usa a direção da mira. O recuo do Shiro mantém direção oposta. Destinos continuam verificados contra colisões e pelo servidor.

**Cooldowns:** 39 técnicas revistas, aproximadamente 12 a 35 segundos (ressurreição 48), com cliente e servidor sincronizados. A janela de 12 segundos para completar sequências de Shiro/Leo/Butterfly é preservada e independente do cooldown final. Dash X segue sua recarga própria de 4,8 s (com upgrades locais).

**Cenário:** janelas, acabamento dos prédios, placas e faixas de pedestres, objetos decorativos nos telhados e vegetação arredondada, com cerca de seis meshes instanciados e quatro placas, sem novas luzes e sem alterar colisões. Visível também em BAIXO/MÉDIO.

**Validação:** 77 testes automatizados aprovados, inclusive movimentação direcional WebSocket com dois jogadores e verificação dos valores de cooldown. A inicialização visual em WebGL e o desempenho real não foram validados neste ambiente; teste em computadores e celulares antes da liberação geral.

**Deploy:** extraia os arquivos na raiz do repositório GitHub, execute `git add .`, `git commit -m "TITAN PROTOCOL 3.3.2 - Movimento e performance"`, `git push origin main`. Após Render Live, verifique `/health` para `3.3.2` e faça Ctrl+Shift+R no jogo.
