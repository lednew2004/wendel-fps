# TITAN PROTOCOL 4.2 - Envio do commit ao GitHub

Este pacote contem uma copia de trabalho Git com os commits completos da
versao 3.9.1 e da restauracao de tiro 4.2, alem de um novo commit de preparacao
para GitHub. **Nenhum push e realizado automaticamente.**

## Enviar a nova branch sem alterar a branch principal

1. Crie um repositorio **vazio** no GitHub (sem README, .gitignore ou licenca inicial).
2. Extraia o arquivo `TITAN_PROTOCOL_V420_GITHUB_PRONTO_COM_GIT.zip`, mantendo
   a pasta `.git` (inclusive no Windows, onde ela pode ficar oculta).
3. Abra um terminal **dentro da pasta extraida**, onde esta `package.json`.
4. Execute os comandos abaixo, substituindo `SEU_USUARIO/SEU_REPOSITORIO`:

```bash
git status
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin restauracao-fps-4.2
```

Se o remoto `origin` ja existir, troque somente o endereco:

```bash
git remote set-url origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin restauracao-fps-4.2
```

O push envia a branch de teste `restauracao-fps-4.2` e seu historico de commits;
**nao substitui `main`/`master` no repositorio remoto**. Para integra-la a
branch principal, crie um Pull Request no GitHub, depois de validar o jogo.

Se o GitHub pedir login, autentique-se no navegador/Git Credential Manager ou
use um token pessoal / chave SSH; senhas normais de conta nao funcionam para
push via HTTPS.

## Validar localmente

```bash
npm ci
npm run build
npm start
```

Acesse `http://localhost:3000` e confira
`RELATORIO_DE_TESTES_4_2.md` antes de publicar.

O workflow `.github/workflows/verificar-jogo.yml` apenas verifica a geracao
de colisoes e executa os testes. Ele nao publica o site.

**Atencao:** o arquivo `render.yaml` do projeto original possui
`autoDeployTrigger: commit`. Se o repositorio estiver conectado ao Render,
um push para a branch configurada no servico **pode disparar uma publicacao**.
Revise/desative o auto-deploy nas configuracoes do Render antes de enviar.

## Alternativa: recuperar apenas com o Git bundle

O arquivo `.bundle` preserva o historico Git. Para clonar o bundle:

```bash
git clone TITAN_PROTOCOL_V420_GITHUB_NOVO_COMMIT.bundle titan-protocol
cd titan-protocol
git switch restauracao-fps-4.2
```

Depois configure `origin` com os comandos acima.
