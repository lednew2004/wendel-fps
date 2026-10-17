# TITAN PROTOCOL 1.4 — MULTIPLAYER GRATUITO (Render)

Versão do TITAN PROTOCOL adaptada para publicar **jogo + servidor de salas PvP juntos**, em um único Web Service Node.js gratuito na Render, **sem Redis** e sem URL de WebSocket manual.

## Publicação

Leia o guia [GUIA_PUBLICACAO_GRATIS.md](GUIA_PUBLICACAO_GRATIS.md).

1. Substitua os arquivos do repositório GitHub pelo conteúdo deste pacote (na raiz).
2. Abra https://dashboard.render.com/ → New → Blueprint e selecione o repositório GitHub.
3. Revise o plano `Free` indicado no arquivo `render.yaml`.
4. Clique em Apply / Deploy e aguarde `Live`.
5. Acesse `https://seu-jogo.onrender.com/health` e depois o próprio endereço.
6. No jogo, use **MULTIPLAYER ONLINE** para criar uma sala e compartilhar o código.

## Localmente

Com Node.js 22+:

```sh
npm start
```

Abra http://localhost:3000.

## Testes

```sh
npm test
```

## O que já existe

- Campanha, sobrevivência, cidade com parkour e quatro armas.
- Dash sem recarga.
- Controle com mouse e teclado no PC e touch em celular (orientação horizontal recomendada).
- Salas PvP de 2 a 8 jogadores com código.
- Movimento e dano sincronizados por WebSocket no mesmo domínio (`/ws`).
- Um único processo Node serve HTML, CSS, JS, modelos e WebSocket.

## Limitações reais

- Hospedagem gratuita da Render hiberna após 15 minutos sem tráfego; a primeira abertura pode levar aproximadamente um minuto.
- Salas e placares são mantidos **somente em memória**: reinícios/deploys/hibernação apagam as salas.
- A Render gratuita tem limites mensais de uso; excedê-los pode suspender o serviço ou gerar cobrança conforme a conta.
- Esta solução é apropriada para testes entre amigos. Não há persistência, autenticação ou anticheat profissional.
- O Three.js é carregado por CDN e os jogadores precisam de internet.
- Testes automatizados de rede não substituem testes reais com navegadores e telefones.
