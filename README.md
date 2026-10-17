# TITAN PROTOCOL 2.2 — SUPERPOWERS EXTENDED

Versão baseada na 2.0, sem remover os modos **campanha, sobrevivência/casual ou multiplayer**. Otimizada para publicação gratuita **GitHub + Render** no mesmo serviço Node.js.

## Principais novidades

- **14 habilidades equipáveis**, duas por vez, com seletor visual durante a partida. Os poderes anteriores permanecem disponíveis.
- **Teleporte tático pelo mapa completo:** use a habilidade, toque/clique em uma rua ou telhado e confirme. O destino pode estar em qualquer ponto válido da cidade (alcance até 410 unidades). Após teleportar, pressione a mesma habilidade em até **12 segundos** para retornar à origem. Recarga de 10 segundos iniciada no primeiro teleporte. Posições são validadas no servidor online.
- **Habilidades da 2.1 preservadas:** Buraco Negro (puxa jogadores), Reverter o Tempo (retorna à posição/vida/escudo de ~4 s atrás), Corrente Elétrica (até 3 jogadores), Gravidade Invertida (elevação temporária), Clones Fantasmas (alvos falsos que podem receber disparos online), Escudo Absoluto (bloqueia dano por 5 s) e Troca Dimensional (troca de posição com um adversário na mira).
- Cada poder novo tem efeito no modo solo contra inimigos IA ou sobre o personagem, e no online com autoridade do servidor. O servidor mantém históricos curtos, tempo de recarga e duração de escudos/efeitos.
- **Minimapa multiplayer da 1.9 preservado**, assim como saúde/escudo dos jogadores, dash sem recarga, mira por toque, sala/código personalizável e reconexão.

## Controles

- **PC:** tecla **Z** usa o Poder 1, **V** usa o Poder 2. Pressione **Tab** ou clique no botão **PODERES** para selecionar habilidades dentro da partida. Clique no poder para equipá-lo ao espaço escolhido. Para teleportar, escolha no mapa e clique em **TELEPORTAR**. Use o mesmo poder novamente em até 12 s para voltar.
- **Celular:** toque em **PODERES** para escolher duas habilidades sem adicionar 12 botões à tela. Botões grandes PODER 1 e 2 ficam à direita, em área própria, com deslize para mirar e soltar para executar. Ao usar o teleporte, toque/arraste no mapa, confirme e depois toque em **VOLTAR** no próprio botão de teleporte.
- **Esc** cancela o seletor quando ele estiver aberto; fora dele, funciona como antes. Demais teclas e ações do jogo permanecem.

## Habilidades e recargas (segundos)

| Poder | Recarga | Efeito |
|---|---:|---|
| Repulsão | 10 | Empurra jogadores próximos |
| Congelar | 10 | Paralisa um alvo por 1 s |
| Teleporte | 10 | Escolha pelo mapa; 12 s para retornar |
| Voo | 10 | Voa por 5 s |
| Invisibilidade | 10 | Fica invisível por 3 s |
| Intangibilidade | 10 | Atravessa obstáculos por 6 s |
| Buraco Negro | 10 | Atrai adversários por 4 s |
| Reverter Tempo | 10 | Retorna à situação de até 4 s atrás |
| Corrente Elétrica | 10 | Causa dano em cadeia a até 3 alvos |
| Gravidade Invertida | 10 | Eleva alvos por 2 s |
| Clones Fantasmas | 8 | Cria até 3 decoys por 8 s |
| Escudo Absoluto | 10 | Bloqueia dano recebido por 5 s |
| Troca Dimensional | 10 | Troca de posição com um adversário na mira |
| Clone Salto | 9 | Cria três clones; mire no escolhido e pressione novamente para teleportar |

## Como executar

- `npm start` com Node.js 22+; abre em `http://localhost:3000`.
- `npm test` executa a suíte automatizada.
- Para publicar, use o repositório GitHub com a raiz deste pacote e um Web Service Render com o `render.yaml` incluído. `public/` contém o frontend e `server/` contém o WebSocket multiplayer.
- Não é necessário Redis nesta hospedagem monolítica. Salas ficam na memória e podem ser perdidas se a Render gratuita hibernar ou reiniciar.

## Testes e limitações

A suíte automatizada cobre API do servidor, WebSocket com dois clientes, teleporte de longa distância/retorno, novos poderes, multiplayer, câmera, controles móveis simulados e códigos de sala. **Não substitui teste WebGL nem teste de touchscreen em aparelhos reais**. Ainda é recomendável testar combos e balanceamento em partidas reais e observar estabilidade da hospedagem.


## NOVO: MOBILE COMBAT 2.2

- 14 habilidades, incluindo **Clone Salto** (3 hologramas; reative e escolha um para teleportar).
- **Todos os cooldowns têm teto de 10 segundos** para partidas mais intensas; durações e janelas de retorno permanecem específicas.
- Mobile horizontal: PODER 1/PODER 2 à direita, com **segurar → arrastar mira → soltar** para poderes direcionais. Deslize para cima para cancelar sem recarga. Poderes instantâneos ativam com um toque.
- Clones: primeiro toque cria três hologramas; reativação durante 7,5 s envia você para o clone escolhido. No celular, deslize para a esquerda, centro ou direita e solte; no PC, mire no clone desejado e pressione o poder novamente.
- Barra de duração e tempo restante durante poderes ativos, recarga numérica após término.
- ATIRAR deslocado para a esquerda e acima do botão PULAR no celular; minimapa e painel SALA preservados.
- Configurações no painel de pausa ou na SALA para ajustar o tamanho e o deslocamento dos dois botões de habilidades (salvos no navegador).
- Servidor autoritativo para teleporte de clone, recarga, colisão e status multiplayer.
