# Como publicar TITAN PROTOCOL 2.0 — GitHub + Render (grátis)

1. Faça backup dos arquivos atuais de seu projeto.
2. Extraia `TITAN_PROTOCOL_V20_RENDER_GITHUB.zip` e coloque o conteúdo do ZIP **na raiz do repositório**, substituindo arquivos anteriores (não crie uma pasta extra ao redor).
3. Confirme que a raiz tem `public/`, `server/`, `package.json`, `render.yaml` e `README.md`.
4. Execute estes comandos no PowerShell, dentro da pasta do repositório:

```powershell
git add .
git commit -m "TITAN PROTOCOL 2.0 - Superpoderes e minimapa"
git push origin main
```

5. No painel Render, espere o deploy automático finalizar (ou clique em **Manual Deploy → Deploy latest commit**).
6. Abra `https://SEU-SITE.onrender.com/health` e verifique que `ok` é `true`.
7. Limpe o cache da página/recarregue no celular. Crie uma sala e convide amigos. Verifique que os dois jogadores estão usando a mesma versão do jogo.
8. Escolha seus poderes no menu ou em **SALA**. Experimente Repulsão e Congelamento, depois Teleporte/Voo e Invisibilidade/Intangibilidade.

> A Render Free pode suspender o servidor quando inativo. Salas em memória podem desaparecer em reinicializações, independentemente do código. Para disponibilidade permanente é necessário um ambiente de produção mais robusto.

> O código preserva os ajustes anteriores de nickname editável, sala com código próprio, botão de compartilhamento, reconexão, minimapa, barras de vida e controles touch.

## Diagnóstico

- Se abrir o jogo mas não conectar: visite `/health`, confira os logs no Render e redeploy.
- Se os poderes não aparecerem: confirme os arquivos `public/src/powers.js` e `public/src/powers.css`; recarregue a página sem cache.
- Se o teleporte não confirmar: o marcador de destino deve ficar **verde**, sobre um piso ou telhado válido, dentro do alcance permitido.
- Se o voo ficar preso: pressione salto para subir, use Ctrl / DESCER para descer.
- Se o celular estiver lento: mantenha a qualidade Baixa e o FPS adaptativo ativado.

Os testes de rede e sintaxe passaram, mas a partida WebGL completa precisa ser validada manualmente em um dispositivo real.
