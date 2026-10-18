# Publicação gratuita — TITAN PROTOCOL 3.2 DUAL CAMERA

1. Descompacte o ZIP e copie `package.json`, `render.yaml`, `public/`, `server/` e os arquivos de documentação para a **raiz** do repositório GitHub, substituindo os antigos.
2. Na pasta do repositório, execute `git add .`, depois `git commit -m "TITAN PROTOCOL 3.2 - Terceira pessoa animada"` e `git push origin main`.
3. Aguarde o deploy da Render chegar ao estado **Live**. O projeto usa Node.js 22 ou superior, sem Redis ou outro serviço externo.
4. Acesse `https://SEU-DOMINIO.onrender.com/health` e verifique `"version":"3.2.0"`. Atualize o jogo sem cache no PC/celular.
5. Antes de jogar, escolha um dos **13 heróis** e uma das quatro armas. Todos os **3 poderes** do personagem estão disponíveis imediatamente.
6. No PC, use **1/2/3** para poderes, **4/F** ou roda do mouse para trocar de arma, **TAB** para abrir/fechar o kit. No celular, use os três botões de poderes.
7. Teste separadamente: base azul/vermelha, TOP/MID/ADC, jungle, Shiro (1 duas vezes), Leo (1 três vezes), Butterfly (2 duas vezes) e partida online com dois jogadores.
8. Se o desempenho estiver baixo, selecione qualidade gráfica **BAIXA/MÉDIA**, sem sombras no celular.

O online utiliza equipes para respawn em bases opostas e não permite dano aliado. As rotas e os acampamentos compõem a geografia MOBA, mas **não há ainda torres destrutíveis ou minions com combate de rotas automatizado**. A execução visual completa e a sensação física precisam de testes reais em navegadores.

## Teste específico da 3.2

1. Entre no modo Sobrevivência, escolha um herói e confira o personagem visível na câmera atrás do ombro.
2. Pressione **V** para voltar à primeira pessoa; pressione novamente para ativar a terceira pessoa. No celular, use o botão **CÂMERA** no HUD.
3. Caminhe, corra, salte, faça dash, atire e use habilidades em ambas as perspectivas; confira se a mira permanece alinhada.
4. Aproxime-se de uma casa, parede e passagem estreita: a câmera deve se aproximar sem atravessar o obstáculo.
5. Teste com outro jogador no multiplayer, de preferência um no PC e outro no celular.
6. Para desempenho, mantenha gráfico BAIXO/MÉDIO no celular. É normal que o desempenho real dependa do aparelho e do navegador.
