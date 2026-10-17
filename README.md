# TITAN PROTOCOL 2.1 — SUPERPOWERS EXTENDED

Versão baseada na 2.0, sem remover os modos **campanha, sobrevivência/casual ou multiplayer**. Otimizada para publicação gratuita **GitHub + Render** no mesmo serviço Node.js.

## Principais novidades

- **13 habilidades equipáveis**, duas por vez, com seletor visual durante a partida. Os poderes anteriores permanecem disponíveis.
- **Teleporte tático pelo mapa completo:** use a habilidade, toque/clique em uma rua ou telhado e confirme. O destino pode estar em qualquer ponto válido da cidade (alcance até 410 unidades). Após teleportar, pressione a mesma habilidade em até **12 segundos** para retornar à origem. Recarga de 27 segundos iniciada no primeiro teleporte. Posições são validadas no servidor online.
- **Sete poderes novos:** Buraco Negro (puxa jogadores), Reverter o Tempo (retorna à posição/vida/escudo de ~4 s atrás), Corrente Elétrica (até 3 jogadores), Gravidade Invertida (elevação temporária), Clones Fantasmas (alvos falsos que podem receber disparos online), Escudo Absoluto (bloqueia dano por 5 s) e Troca Dimensional (troca de posição com um adversário na mira).
- Cada poder novo tem efeito no modo solo contra inimigos IA ou sobre o personagem, e no online com autoridade do servidor. O servidor mantém históricos curtos, tempo de recarga e duração de escudos/efeitos.
- **Minimapa multiplayer da 1.9 preservado**, assim como saúde/escudo dos jogadores, dash sem recarga, mira por toque, sala/código personalizável e reconexão.

## Controles

- **PC:** tecla **Z** usa o Poder 1, **V** usa o Poder 2. Pressione **Tab** ou clique no botão **PODERES** para selecionar habilidades dentro da partida. Clique no poder para equipá-lo ao espaço escolhido. Para teleportar, escolha no mapa e clique em **TELEPORTAR**. Use o mesmo poder novamente em até 12 s para voltar.
- **Celular:** toque em **PODERES** para escolher duas habilidades sem adicionar 12 botões à tela. Botões compactos de habilidades ficam à esquerda. Ao usar o teleporte, toque/arraste no mapa, confirme e depois toque em **VOLTAR** no próprio botão de teleporte.
- **Esc** cancela o seletor quando ele estiver aberto; fora dele, funciona como antes. Demais teclas e ações do jogo permanecem.

## Habilidades e recargas (segundos)

| Poder | Recarga | Efeito |
|---|---:|---|
| Repulsão | 14 | Empurra jogadores próximos |
| Congelar | 18 | Paralisa um alvo por 1 s |
| Teleporte | 27 | Escolha pelo mapa; 12 s para retornar |
| Voo | 30 | Voa por 5 s |
| Invisibilidade | 24 | Fica invisível por 3 s |
| Intangibilidade | 38 | Atravessa obstáculos por 6 s |
| Buraco Negro | 39 | Atrai adversários por 4 s |
| Reverter Tempo | 42 | Retorna à situação de até 4 s atrás |
| Corrente Elétrica | 24 | Causa dano em cadeia a até 3 alvos |
| Gravidade Invertida | 33 | Eleva alvos por 2 s |
| Clones Fantasmas | 30 | Cria até 3 decoys por 8 s |
| Escudo Absoluto | 37 | Bloqueia dano recebido por 5 s |
| Troca Dimensional | 35 | Troca de posição com um adversário na mira |

## Como executar

- `npm start` com Node.js 22+; abre em `http://localhost:3000`.
- `npm test` executa a suíte automatizada.
- Para publicar, use o repositório GitHub com a raiz deste pacote e um Web Service Render com o `render.yaml` incluído. `public/` contém o frontend e `server/` contém o WebSocket multiplayer.
- Não é necessário Redis nesta hospedagem monolítica. Salas ficam na memória e podem ser perdidas se a Render gratuita hibernar ou reiniciar.

## Testes e limitações

A suíte automatizada cobre API do servidor, WebSocket com dois clientes, teleporte de longa distância/retorno, novos poderes, multiplayer, câmera, controles móveis simulados e códigos de sala. **Não substitui teste WebGL nem teste de touchscreen em aparelhos reais**. Ainda é recomendável testar combos e balanceamento em partidas reais e observar estabilidade da hospedagem.
