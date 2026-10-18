# TITAN PROTOCOL 3.3.1 — Correção do erro no início

## Causa

A versão 3.3.0 substituiu o mapa urbano por uma instalação de esquadrão sem pistas de parkour cronometradas. Porém, `new ParkourController()` chamava `updateHud()` ainda no construtor e acessava `this.city.courses[this.current].name` quando `courses=[]`. Isso causava `TypeError: Cannot read properties of undefined (reading 'name')` e interrompia o carregamento do jogo. Não foi um problema de inatividade da Render ou necessariamente de suporte WebGL.

## O que foi corrigido

- HUD de parkour tolera o mapa sem pistas.
- Entrada em desafio, alternância de rotas, checagem de checkpoints e respawn não acessam percursos inexistentes.
- Respawn de segurança no mapa Squad volta à base de operações.
- Tela de falha exibe a mensagem JavaScript real em vez de assumir que o WebGL está indisponível.
- Versão atualizada para 3.3.1 no site, no pacote e em `/health`.

## Como atualizar

Descompacte o ZIP completo **na raiz do repositório**, substitua os arquivos e rode:

```sh
git add .
git commit -m "TITAN PROTOCOL 3.3.1 - Corrigir inicializacao"
git push origin main
```

Aguarde a publicação ficar **Live** na Render. Abra `/health` e confirme `"version":"3.3.1"`. Em seguida faça **Ctrl + Shift + R** na página do jogo.

## Testes

73 testes automatizados aprovados, incluindo os dois novos testes de regressão. A validação WebGL completa ainda deve ser feita no navegador de jogo.
