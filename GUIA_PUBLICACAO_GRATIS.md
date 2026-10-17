# Publicar o TITAN PROTOCOL multiplayer sem Redis e sem Vercel Pro

O projeto foi preparado para a **Render**, na modalidade de um único **Web Service** gratuito. Não utilize `Static Site`, porque o multiplayer precisa de um servidor Node.js/WebSocket rodando.

## 1 — Atualizar o repositório GitHub

Extraia o ZIP. No repositório GitHub que você já criou, **substitua a versão antiga** por estes arquivos (pastas `public`, `server`, arquivos `render.yaml`, `package.json` na raiz). Remova a pasta `api`, o antigo `vercel.json` e configurações Redis para evitar misturar as duas arquiteturas.

No terminal PowerShell dentro da pasta:

```powershell
git add -A
git commit -m "Multiplayer gratuito - Render"
git push origin main
```

A branch pode ter outro nome. Se preferir, use a interface do GitHub para enviar os arquivos.

## 2 — Render (grátis)

1. Abra https://dashboard.render.com/ e conecte seu GitHub.
2. Clique em **New → Blueprint** e selecione seu repositório.
3. A Render encontrará `render.yaml`, que já define:
   - Web Service
   - Node.js
   - plano `free`
   - `npm install`
   - `npm start`
4. Confirme o plano gratuito e aplique. Não precisa configurar Redis, banco, segredos ou outro serviço.
5. Aguarde o deploy ficar **Live**.

Se a opção Blueprint não aparecer, use **New → Web Service**, conecte o mesmo repositório e configure:

| Campo | Valor |
|---|---|
| Language/Runtime | Node |
| Branch | main ou a branch do repositório |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance type | Free |
| Health Check Path | `/health` |

## 3 — Testar

- Abra `https://SEU-ENDERECO.onrender.com/health`: deve mostrar um JSON com `ok: true`.
- Abra `https://SEU-ENDERECO.onrender.com/` para jogar.
- Jogador A: **Multiplayer Online → Criar Sala**.
- Jogador B: abre **o mesmo endereço** no celular ou PC → **Entrar na Sala** usando o código.

O jogo reconhece automaticamente o WebSocket seguro `wss://SEU-ENDERECO.onrender.com/ws`.

## Limitações importantes

- Após 15 minutos sem tráfego, o plano Free desliga o servidor temporariamente; o próximo acesso pode demorar ~1 minuto.
- Ao hibernar, reiniciar ou redeployar, as salas e partidas em memória desaparecem. Será preciso criar a sala outra vez.
- Limites mensais de uso e banda se aplicam, e cobranças podem ocorrer se você adicionar um método de pagamento e ultrapassar os limites. Confira o painel de uso da Render.
- Não garante zero travamentos ou compatibilidade total com todos os celulares; teste nos seus dispositivos.

## E a Vercel?

A Vercel continua útil para sites estáticos, inclusive no plano Hobby grátis. Mas esta solução de multiplayer **não depende dela**; usa a Render para entregar frontend e backend num único deploy. Você pode deixar o antigo site Vercel ativo, mas os jogadores devem usar o endereço da Render para acessar o multiplayer integrado.
