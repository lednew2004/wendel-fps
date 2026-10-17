# TITAN PROTOCOL 2.0 — SUPERPOWERS

Atualização da versão 1.9 com seis poderes utilizáveis na campanha, sobrevivência (modo casual) e multiplayer online.
O minimapa multiplayer, a cidade, o parkour, o dash livre, as barras de vida, a mira mobile, a reconexão e as correções de nickname/código de sala foram preservados.

## Poderes (equipe dois por partida)

| Poder | Duração / alcance | Recarga |
| --- | --- | --- |
| REPULSÃO | Empurra jogadores e NPCs a até 11m | 14 s |
| CONGELAR | Paralisa adversário por 1 segundo; no casual afeta inimigos próximos | 18 s |
| TELEPORTE | Escolha destino a até 35m; pode voltar ao ponto inicial por 5s | 25 s |
| VOAR | 5 segundos de voo controlável | 30 s |
| INVISIBILIDADE | 3s invisível; some do minimapa adversário; disparar quebra invisibilidade online | 24 s |
| INTANGIBILIDADE | 6s: atravessa paredes e não recebe tiros, mas não pode disparar | 38 s |

**Para equipar:** configure PODER 1 e PODER 2 no menu inicial, lobby, painel SALA ou pausa.
A escolha fica salva no navegador. Dois poderes iguais não podem ser equipados juntos.

## Controles

- **PC:** `Z` (poder 1) e `V` (poder 2). Teleporte: aperte a tecla, aponte a mira e clique para confirmar (ou aperte a tecla novamente). Aperte de novo nos próximos 5s para retornar. Voo: `Espaço` sobe, `Ctrl` desce.
- **Celular:** dois botões discretos de poderes, à esquerda, evitando a região de tiro/mira. Teleporte: mantenha o botão pressionado, arraste para escolher a posição e solte para confirmar. Se o botão exibir VOLTAR, pressione novamente dentro dos 5s. Voo: PULAR sobe, DESCER desce (aparece durante o voo).
- Os controles anteriores continuam ativos: WASD/analógico, tiro, mira, salto, dash infinito, reload, escadas e parkour.

## Servidor multiplayer

O servidor Node implementa e valida **recargas, duração, seleção, congelamento, intangibilidade, invisibilidade, alcance do teleporte, retorno e efeitos de empurrão**.
O minimapa esconde usuários com invisibilidade ou intangibilidade em vigor; vida e escudo dos adversários continuam sincronizados. Não há custo extra por habilidade nem dependência Redis.

## Publicação no Render Free

Consulte `GUIA_PUBLICACAO_GRATIS.md`. Descompacte o projeto e copie os arquivos para a raiz do repositório GitHub, preservando `public/`, `server/`, `package.json` e `render.yaml`.

**Executar localmente**: Node.js 22+ e `npm start`. Abra http://localhost:3000.

**Testes**: `npm test` — 22 testes automatizados passaram, incluindo duas conexões WebSocket para os seis poderes, tests de nickname/código de sala, layout estrutural, reconexão e minimapa.

**Limitações:** não foi possível abrir uma partida 3D neste ambiente: o navegador automatizado bloqueou conexões locais (`ERR_BLOCKED_BY_ADMINISTRATOR`). A jogabilidade, desempenho do aparelho e aparência visual final exigem validação manual em PC, Android e iPhone. As salas usam memória do servidor no plano gratuito da Render; a plataforma pode reiniciar o servidor e perder partidas temporariamente. O Three.js é carregado pela CDN e requer internet.
