# TITAN PROTOCOL 2.9 — HERO ROSTER (LIGHT EDITION)

Esta versão parte do motor gráfico **2.7**, anterior ao cenário cyberpunk pesado da versão 2.8. NÃO inclui chuva, os vários painéis luminosos ou o bloom noturno pesado. O foco é manter a jogabilidade em celular.

## O que foi implementado

- **10 personagens jogáveis**, cada um com nome, especialidade, cor exclusiva, silhueta/acessórios próprios e **3 habilidades**.
- **30 técnicas** no total: 18 existentes e 12 variantes novas com diferentes recargas, distâncias e durações.
- Tela de escolha do personagem, arma inicial (M4A1, M870, M24, M249) e **primeira habilidade** antes de começar.
- **Casual (campanha/sobrevivência):** a partida começa com o primeiro poder escolhido; mate monstros para obter créditos e compre os outros **dois** poderes desse mesmo personagem pela roda TAB/PODERES.
- **Multiplayer:** o personagem entra com o trio completo. O servidor valida a seleção e ignora tentativas de equipar poderes de outro personagem.
- **3 habilidades no HUD:** PC usa Z, V e B; celular possui três botões com mira por arrasto nas habilidades direcionadas e indicadores de recarga/duração.
- Avatares dos outros jogadores mantêm cor e silhueta selecionadas mesmo em qualidade baixa; o FPS usa um pequeno detalhe luminoso na arma para indicar a cor do operador.
- Preservados o mapa expandido, as casas, portas e janelas, minimapa, dano e escudo, controles móveis, código de sala, reconexão, dash com cooldown e modo casual.

## Os 10 personagens

| Operador | Especialidade | Habilidades |
| --- | --- | --- |
| VEX | Impacto cinético | Repulsão, Pulso Titânico, Sobrecarga |
| NYRA | Gelo | Congelar, Crioprisão, Toque de Estase |
| KAIROS | Dimensão | Teleporte no mapa, Troca Dimensional, Intangibilidade |
| ÍCARO | Voo | Voar, Propulsão Vetorial, Onda Antigravidade |
| SOMBRA | Furtividade | Invisibilidade, Virar Objeto, Camuflagem Óptica |
| ÉON | Tempo | Rewind 10 segundos, Ressurreição automática, Retrocesso Rápido 5 segundos |
| MÍMICO | Ilusão | Clones Fantasmas, Clone Móvel, Copiar habilidade após eliminação |
| VOLTA | Energia | Raio, Raio Cirúrgico, Tempestade Eletro |
| NEXUS | Gravidade | Buraco Negro, Gravidade, Armadilha do Vazio |
| ATLAS | Suporte | Cura, Escudo Absoluto, Nanocura |

## Publicação

No diretório raiz do projeto execute `npm test` para verificar os testes automatizados e `npm start` para iniciar Node. Na Render, Node >= 22, com um único servidor HTTP e WebSocket sem banco de dados.

O ZIP contém `package.json`, `render.yaml`, `public/` e `server/` na raiz. Publique esses arquivos no seu repositório GitHub e envie com `git add .`, `git commit -m "TITAN 2.9 - 10 herois"`, `git push origin main`.

## Limitações

Personagens utilizam malhas 3D estilizadas feitas com Three.js, não modelos GLB profissionais de alta densidade. Os 51 testes automatizados verificam regras, rede e integração estática; **a sensação da jogabilidade em dispositivos reais e a execução WebGL completa ainda precisam ser testadas**. O desempenho dependerá do aparelho.
