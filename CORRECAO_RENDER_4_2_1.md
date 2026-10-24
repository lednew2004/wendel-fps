# TITAN PROTOCOL 4.2.1 — correção da tela "motor 3D não carregou"

## Diagnóstico

A captura da hospedagem mostra o título **TITAN PROTOCOL 3.8.1**. Isso indica que o HTML servido pelo Render corresponde à versão antiga, não à 4.2. Antes de qualquer alteração, confira se o Render está usando o repositório e a branch corretos.

A versão anterior exigia a importação de **Three.js 0.180.0** pela CDN `cdn.jsdelivr.net`. Uma falha nessa requisição impede que os módulos JavaScript principais iniciem. A mensagem antiga também era genérica: o temporizador de 15 segundos não identificava a causa real.

## O que foi corrigido

- Adicionada a dependência npm fixa `three@0.180.0` no `package.json` e `package-lock.json`.
- Alterados os `importmap` de `public/index.html`, `public/comparativo-grafico.html` e `public/webgpu-lab.html` para importar o Three.js pela **mesma origem do servidor Render**, no caminho `/vendor/three/`.
- Exposição limitada ao pacote `three` instalado, sem tornar todo o `node_modules/` público.
- Build do Render configurado para `npm ci`, instalando as dependências do lockfile.
- Mensagem de carregamento melhorada: o erro de JavaScript aparece na tela em vez de presumir problema na internet.
- Atualizada a versão para `4.2.1` (identificável no título e em `/health`).

## Enviar os arquivos ao GitHub

**No diretório do seu projeto que contém `.git`:** copie os arquivos desta atualização, preservando os caminhos.

```bash
git status
git add .
git commit -m "fix: corrigir carregamento do Three.js no Render (4.2.1)"
git push origin main
```

> Estes comandos funcionam se você estiver na branch `main`. Se estiver na branch `restauracao-fps-4.2`, faça `git push origin restauracao-fps-4.2` e configure o Render para utilizar essa branch, ou integre as alterações à main por Pull Request.

## Configuração Render

- Environment/Runtime: **Node**
- Build Command: **`npm ci`** (ou `npm install` se houver configuração antiga)
- Start Command: **`npm start`**
- Root Directory: diretório que contém `package.json`
- Branch: a mesma que recebeu o commit.
- Acesse `https://SEU-SERVICO.onrender.com/health` e confirme o campo `version` como `4.2.1`.
- Acesse `https://SEU-SERVICO.onrender.com/vendor/three/build/three.module.js` e confirme HTTP 200, não uma página HTML ou 404.
- Atualize a página forçando recarregamento (`Ctrl+Shift+R`).

## Limitação dos testes

125 testes automatizados passaram; o servidor respondeu nas rotas `/`, `/src/main.js` e `/health`, e a rota para o pacote Three.js retornou HTTP 200 quando testada com um arquivo JavaScript simulado. **Não foi possível obter `three@0.180.0` deste ambiente porque o registro npm não está acessível aqui, nem rodar o jogo no navegador por bloqueio do acesso HTTP local.** Assim, a renderização real no Render só pode ser confirmada após o `npm ci` do deploy e os testes no navegador. Não afirme que a correção foi comprovada visualmente antes desse teste.
