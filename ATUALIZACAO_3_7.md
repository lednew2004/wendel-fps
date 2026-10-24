# TITAN PROTOCOL 3.7.0 — VEX extremo, FORGE, munição e troca no treino

## VEX — mobilidade overpower

- Habilidade 1 **SALTO ABSOLUTO** (12 s): projeta uma trajetória física, animada e visível em primeira pessoa sobre muros ou no topo de telhados próximos. Pode alcançar construções de até aproximadamente 34 m de desnível, dentro de 17 m de alcance horizontal. Necessita de destino seguro e acessível; não atravessa objetos sólidos e não é teleporte.
- Habilidade 2 **PROPULSOR INFINITO** (16 s): impulsão vertical, velocidade e corrida prolongada por paredes durante 8 s.
- Habilidade 3 **SEM LIMITES** (48 s): 18 s de mobilidade extrema, aceleração e salto duplo. O jogador controla direção e aterrissagem.
- A previsão do salto e o movimento gradual são compartilhados entre o cliente e o servidor.

## FORGE — novo personagem de construção (15º herói)

- Modelo voxel GLB próprio com versão leve/LOD. Role Bomber e três poderes:
1. **MODO CRIATIVO** (23 s): durante 12 s, apontar e pressionar ATIRAR coloca blocos 1,8 m encaixados em grade. Criar paredes, escadas, pontes e coberturas usando posições livres; visualização prévia verde/vermelha. Limite de 36 blocos, duração máxima de 42 s.
2. **REDSTONE EXPLOSIVA** (26 s): arma todas as estruturas do jogador e encerra o modo construção; agora tiros nelas geram explosões e reação em cadeia entre blocos próximos. No online, o servidor calcula quais blocos foram atingidos e o dano.
3. **DOMÍNIO VOXEL** (55 s): por 16 s, permite construção mais veloz e aumenta o limite do jogador a 60 blocos. Pode ser encerrado antecipadamente ao acionar Redstone.

No PC, usar os botões/teclas das três habilidades e o mouse para colocar blocos; no celular, usar o HUD de habilidades e o botão ATIRAR para construir ou detonar. A colocação e as explosões são limitadas para preservar fluidez do jogo.

## Munição automática

- No PvE (Campanha e Treino/Sobrevivência): caixas aparecem periodicamente em locais caminháveis próximos do personagem, começando poucos segundos após o início. Intervalo normalmente de 16 s, reduzido quando a reserva estiver baixa; no máximo 7 caixas de munição ativas. Inimigos também podem deixar munição como recompensa.
- No multiplayer: caixas distribuídas ao criar a sala, com reposição progressiva a cada 10 s até o limite de 10. Coleta por proximidade é verificada pelo servidor; a caixa desaparece para todos e apenas quem coletou recebe munição.
- Caixas recebem material emissivo, contornos brilhantes e animação de flutuação para melhor visibilidade.

## Troca de herói durante o Treino

- Em **Treino · Sobrevivência**, clique **⇄ TROCAR PERSONAGEM** na HUD ou pressione `P` no teclado.
- Selecione qualquer um dos 15 heróis e continue de onde parou: preserva posição, pontuação, onda, eliminações e vida, mas troca kit/poderes e arma para o personagem escolhido. A seleção pausa o combate enquanto aberta.
- Opção exclusiva do modo Treino: as regras de identidade dos personagens nas salas multiplayer permanecem.

## Aprimoramentos gráficos

- FORGE recebe GLB voxel e versão otimizada, materiais PBR, cores ciano/laranja e padrão de bloco pixelado próximo ao Minecraft.
- Blocos explosivos têm emissividade de Redstone, indicação visual de colocação permitida/bloqueada e partículas de detonação.
- Caixas de munição douradas com contorno/brilho e animação simples; leve aumento do brilho/exposição do cenário.
- Qualidade BAIXA continua com geometria compartilhada para reduzir draw calls.

## Validação e limitações

- `npm test` — testes automatizados de regressão, incluindo construção compartilhada entre dois clientes WebSocket, explosão de blocos e coleta sincronizada de munição.
- A validação automatizada não substitui um teste real de sensibilidade de toque, desempenho ou jogabilidade em celulares físicos (Android e iPhone).
- O editor de blocos é uma mecânica de habilidade por tempo limitado; NÃO substitui o mapa completo por mundo voxel totalmente destrutível ou persistente.

## Publicação

Copie os arquivos de todo o ZIP para a raiz do repositório (incluindo `public`, `server`, `package.json`, `render.yaml`). No terminal:

```sh
git add .
git commit -m "feat: Titan Protocol v3.7.0 - VEX, FORGE, municao e treino"
git push origin main
```

Acesse a página e confirme **BUILD 3.7.0**. Arquivos HTML, CSS e JavaScript são publicados com `Cache-Control: no-store` para facilitar a atualização.
