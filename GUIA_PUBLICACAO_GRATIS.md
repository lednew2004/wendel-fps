# Publicar TITAN PROTOCOL 2.2 gratuitamente (GitHub + Render)

1. Descompacte o arquivo ZIP e substitua os arquivos da versão anterior no repositório GitHub atual. Mantenha `public/`, `server/`, `package.json` e `render.yaml` na raiz.
2. Envie os arquivos para o GitHub usando:

   ```powershell
   git add .
   git commit -m "TITAN PROTOCOL 2.2 - Teleporte por mapa e 13 superpoderes"
   git push origin main
   ```

3. No painel da Render, abra o Web Service existente. Se o deploy automático estiver ativado, aguarde `Live`; caso contrário, use **Manual Deploy → Deploy latest commit**.
4. Confira o status em `https://SEU-ENDERECO.onrender.com/health` e jogue abrindo o endereço principal.
5. Teste com dois navegadores: um cria sala com código de seis caracteres, outro entra. Abra **PODERES**, equipe as novas habilidades e teste o teleporte pelo mapa.

O servidor roda com Node.js 22+ e utiliza a porta definida automaticamente pela variável `PORT` da Render. O WebSocket `/ws` usa o mesmo endereço do site (WSS em HTTPS). Não há Redis na versão gratuita integrada.

**Importante:** o plano gratuito pode hibernar ou reiniciar. O servidor preserva salas durante reconexões breves, mas não após reinicialização do processo. Para uso público de longa duração, considere um plano sem suspensão ou armazenamento persistente. Testes de sintaxe e rede não substituem testes em Android, iOS e navegadores WebGL reais.


## NOVO: MOBILE COMBAT 2.2

- 14 habilidades, incluindo **Clone Salto** (3 hologramas; reative e escolha um para teleportar).
- **Todos os cooldowns têm teto de 10 segundos** para partidas mais intensas; durações e janelas de retorno permanecem específicas.
- Mobile horizontal: PODER 1/PODER 2 à direita, com **segurar → arrastar mira → soltar** para poderes direcionais. Deslize para cima para cancelar sem recarga. Poderes instantâneos ativam com um toque.
- Clones: primeiro toque cria 3 hologramas; reativação durante 7,5 s envia você para o da esquerda, centro ou direita. No celular, deslize horizontalmente antes de soltar; no PC, o jogo seleciona o clone central.
- Barra de duração e tempo restante durante poderes ativos, recarga numérica após término.
- ATIRAR deslocado para a esquerda e acima do botão PULAR no celular; minimapa e painel SALA preservados.
- Servidor autoritativo para teleporte de clone, recarga, colisão e status multiplayer.
