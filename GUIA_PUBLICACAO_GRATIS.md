# PUBLICAÇÃO TITAN PROTOCOL 2.9 — Render Grátis

1. Descompacte o ZIP e copie o conteúdo da raiz (`package.json`, `render.yaml`, `public/`, `server/`) para a pasta local do repositório GitHub.
2. Em PowerShell, execute:
   ```powershell
   git add .
   git commit -m "TITAN PROTOCOL 2.9 - Hero Roster Light"
   git push origin main
   ```
3. A Render conectada ao `main` atualizará o serviço. Aguarde o estado **Live**.
4. Abra `https://SEU-SITE.onrender.com/health` e confirme `"version":"2.9.0"`.
5. Atualize a página do jogo sem cache. No celular, vire a tela na horizontal. Escolha um dos 10 personagens, selecione a arma e o poder inicial e inicie a campanha/sobrevivência. Para entrar numa sala, selecione o personagem no menu antes de criar/entrar.
6. No casual, pressione TAB ou PODERES para comprar os outros dois poderes do personagem com créditos de monstros. Use **Z/V/B** no PC ou os três círculos no celular.

O servidor usa Node.js >=22 sem dependências externas. Em instâncias gratuitas adormecidas/reiniciadas, as salas em memória são perdidas. O modo jogo carrega Three.js por CDN, exigindo conexão com a internet. Teste a fluidez real em dispositivos físicos antes de publicação pública.
