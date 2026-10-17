# TITAN PROTOCOL 1.6 — Multiplayer estável + Mira móvel

Atualização incremental sobre a **1.5**. Preserva campanha, sobrevivência, parkour, armas, dash sem recarga, salas por código, menu SALA, cópia/compartilhamento de convites e o serviço gratuito Render.

## Melhorias realizadas

### Multiplayer
- Heartbeat WebSocket de controle ping/pong a cada 15s, sem depender do frame rate do jogo; acompanhamento de inatividade real.
- Keepalive do navegador a cada 8s, mesmo em telas com FPS muito baixo ou quando o painel de sala está aberto.
- **Retomada de sessão por até 90 segundos** quando a conexão cai: sala, identificação, pontuação, mortes e posição são preservadas em RAM no servidor.
- Reconexão progressiva com a sessão anterior sem reiniciar a câmera e a partida quando ela ainda está carregada.
- Redução de snapshots de 15 para 10 por segundo e de posições do cliente para ~11/s, descartando snapshots obsoletos sob fila de rede acumulada.
- Código da sala salvo temporariamente na aba do navegador, facilitando voltar após recarregar a página.
- Estado da conexão e ping acessíveis pelo painel **SALA**, sem bloquear o campo de visão.
- Arquivos HTML/CSS/JS usam cache com revalidação para evitar telas antigas após atualizar o deploy.

### Jogabilidade no celular
- Sensibilidade de mira inicial aumentada de 1.9× para **3.3×**, com pequena aceleração para deslizes rápidos.
- Ajuste de **0.8× a 6.0×**, salvo no celular e disponível no painel SALA durante o multiplayer.
- Analógico flutuante, com centro no ponto do toque, zona morta menor e deslocamento melhor aproveitado.
- Mira por deslize na área direita **ou pelo dedo que mantém ATIRAR**, mantendo movimentação simultânea com outro dedo.
- Controles, câmera, modos de jogo e interface da versão 1.5 preservados.

## Deploy gratuito Render

1. Substitua no seu repositório GitHub os arquivos com os deste ZIP (a raiz deve conter `public/`, `server/`, `render.yaml` e `package.json`).
2. Rode `git add .`, `git commit -m "TITAN 1.6 estabilidade multiplayer e mira"` e `git push origin main` (ajuste a branch se necessário).
3. Aguarde a Render concluir o deploy automático, ou faça **Manual Deploy → Deploy latest commit**.
4. Abra `https://SEU-SERVICO.onrender.com/health` e confirme `ok: true`.
5. Atualize o jogo no computador e no telefone; abra **MULTIPLAYER ONLINE**, crie uma sala, copie o convite pelo botão **SALA** e teste com dois ou mais jogadores.
7. No celular, entre na sala e clique em **SALA → VELOCIDADE DA MIRA** para ajustar os dedos (comece com 3.3×).

## Limitações importantes

- **Render Free não garante partidas sem quedas.** O servidor pode adormecer quando ocioso, reiniciar, ou sofrer interrupções de rede. A reserva de sessão funciona apenas enquanto **o mesmo processo Node.js permanece em execução**; em reinicializações completas, as salas mantidas em RAM são perdidas. Persistência de partidas entre reinicializações requer armazenamento externo.
- A reconexão preserva a vaga por até 90s, porém, ao ultrapassar o limite, o usuário precisará criar ou entrar em uma nova sala.
- Não foi possível verificar FPS, toque e WebGL em um Android/iPhone real neste ambiente; o desempenho deve ser validado no dispositivo.

## Testes

Com **Node.js 22+**:

```bash
npm test
```

Testes automatizados de criação de salas, tiros, respawn, reconexão de 3 jogadores, retomar identificação/pontuação, sair da sala, controles touch e anatomia do deploy.
