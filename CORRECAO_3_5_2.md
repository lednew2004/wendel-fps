# TITAN PROTOCOL 3.5.2 — Correção dos controles mobile

- Corrigida a ordem das camadas: a região transparente de mira não bloqueia os botões ATIRAR / PULAR / DASH.
- ATIRAR executa o primeiro disparo imediatamente ao pressionar, inclusive nos toques rápidos, e mantém o disparo contínuo ao segurar; respeita recarga, cooldown, habilidades e estado multiplayer.
- Botões distinguem ponteiros simultâneos para evitar que outro dedo cancele ou dispare a ação.
- Analógico responde melhor a arrastos menores; movimentação mobile acelerada em 18% na caminhada e 10% na corrida, com corrida acionada por deslocamento amplo em qualquer direção.
- Quedas de FPS no celular deixam de limitar a física a apenas 40 ms por quadro: teto de até 90 ms (desktop mantém 40 ms). Não compensa pausas muito grandes, para preservar estabilidade.
- Não foram alterados gráficos, personagens, missões, gameplay desktop, parâmetros do servidor e formato de mensagens do multiplayer.

Validação: testes automatizados do projeto e regressões específicas; a sensação de jogo em aparelhos reais deve ser confirmada após implantação.
