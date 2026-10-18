# Publicação gratuita — TITAN PROTOCOL 3.3.3 SQUAD OPERATIONS

1. Extraia o ZIP. Na **raiz** do repositório GitHub devem ficar `package.json`, `render.yaml`, `public/`, `server/`, `README.md` e este guia. Não coloque tudo dentro de uma subpasta.
2. Use Node.js 22+ no ambiente local. Para verificar a instalação, execute `npm test` e, depois, `npm start`. A aplicação sobe na porta indicada pela variável `PORT`, ou `3000` localmente.
3. Para atualizar o repositório, execute:

   ```bash
   git add .
   git commit -m "TITAN PROTOCOL 3.3.3 - Dash direcional e graficos leves"
   git push origin main
   ```

4. A Render executará o deploy usando `render.yaml`. Quando estiver em **Live**, visite `https://SEU-SITE.onrender.com/health` e confira `"version":"3.3.3"`. Recarregue a página do jogo sem cache após atualizar.
5. **Campanha:** escolha função, herói e arma no menu; inicie Operações Squad. Confira os três bots aliados, defesa, reconhecimento, sabotagem, chefe e extração. Use `G` para escolher ordens ao esquadrão. Cada fase acontece na instalação tática nova, não no mapa MOBA.
6. **Todos contra todos:** entre no MULTIPLAYER, selecione `PVP · TODOS CONTRA TODOS`, crie uma sala e convide até outros sete jogadores.
7. **Cooperativo:** antes de entrar no lobby, cada um dos quatro jogadores escolhe no menu um herói de função **diferente**. No multiplayer, todos selecionam `COOP · OPERAÇÃO SQUAD` e entram com o mesmo código. A missão começa quando houver um Frente, um Suporte, um Sniper e um Bomber na mesma sala.
8. Em PC e celular, teste as três habilidades (`1`, `2`, `3`), dash, tiros, primeira/terceira pessoa (`V`), minimapa e as áreas de missão. Para aparelhos fracos, use gráfico **BAIXO/MÉDIO**.

**Avisos:** Three.js é importado de uma CDN, então os jogadores precisam de internet. O plano Render gratuito pode suspender o servidor e perder partidas online, pois as salas ficam em memória. Os testes automatizados não garantem FPS ou aparência visual; valide a partida em navegadores reais antes de divulgar a atualização.

**Correção mantida desde 3.3.1:** evita a falha `Cannot read properties of undefined (reading 'name')` no `parkour.js` que impedia o menu de aparecer no mapa Squad. Após o deploy, use **Ctrl + Shift + R** para ignorar arquivos antigos em cache.

**Novidades 3.3.3:** dash lateral, traseiro e diagonal pelo teclado/joystick; reativação dos combos permanece em 12 s. Recargas reequilibradas em cliente/servidor; fachadas e sinalização visual via instancing sem novos efeitos pesados. Testes: 77 aprovados.
