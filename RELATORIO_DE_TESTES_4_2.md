# TITAN PROTOCOL 4.2 — Relatório de testes e pontos pendentes

## Verificações executadas em 24/10/2026

- `npm run build`: **PASSOU**. Recriação de `server/colliders.json` e `server/interactables.json`, seguida do conjunto de testes Node.
- `npm test`: **122 testes passaram / 0 falhas**. São 116 testes da base recuperada mais 6 verificações de regressão adicionadas para o release 4.2.
- `node --check` dos principais arquivos JS modificados: **PASSOU**.
- `HTTP GET /` e `/health` no servidor local: **PASSOU**.
- Teste de navegador Chromium headless: **NÃO CONCLUÍDO** por `net::ERR_BLOCKED_BY_ADMINISTRATOR` no ambiente de testes. Não é um erro de sintaxe confirmado do código; impede a confirmação de gráficos, botões e movimentação visual.
- Servidor WebSocket: testes automatizados existentes da base passaram. Interação manual entre dois navegadores e dash sincronizado não foram executados.

## Testes manuais obrigatórios no seu computador

| Teste | Resultado aqui |
|---|---|
| Abrir o jogo em `http://localhost:3000` sem erro de console | Pendente |
| Escolher operador e iniciar Sobrevivência | Pendente |
| Atirar e receber dano; trocar arma; recarregar | Pendente |
| Dash normal (`X`): acelerar, desacelerar e não atravessar paredes | Pendente |
| SHIRO/LEO: ativar habilidades de dash e avaliar transição | Pendente |
| Skills de todos os 20 operadores: ativação, animação, duração, cooldown | Pendente |
| Bots procuram som de tiro, recuam, perseguem com linha de visão | Pendente |
| Edifícios em x=±84,z=-50 e x=±91,z=97: `E` abre portas | Pendente |
| Entrar, subir duas escadas e chegar aos telhados sem prender a câmera | Pendente |
| Abrir duas janelas/sessões e testar combate multiplayer | Pendente |
| Mobilidade em celular horizontal e presets gráficos baixos | Pendente |
| Medir FPS em médio/alto e verificar uso de memória | Pendente |

## Riscos remanescentes e melhoria futura

Os novos interiores receberam colisores sincronizados, mas o percurso físico completo entre andares não foi percorrido no navegador neste ambiente. A IA usa um controlador de percepção/porta simples; ainda não tem navmesh geral para complexos percursos verticais. Parte das habilidades legadas continua usando lógica individual, e seus efeitos/cooldowns não passaram por teste manual exaustivo. O servidor conserva regras de combate e pode aplicar reconciliação abrupta em combos de dash multiplayer; a melhoria atual prioriza o controlador físico local.

**Recomendação:** mantenha a aplicação publicada sem alteração. Teste esta versão local e registre bugs que apareçam no console do navegador antes de publicar.
