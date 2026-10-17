# TITAN PROTOCOL 1.8 — Mobile Smooth Combat

**Atualização sobre a versão 1.7**, mantendo o deploy gratuito GitHub → Render, multiplayer, controles PC, painel SALA, reconexão, dash livre, modo campanha e parkour.

## Alterações

- Mira do celular mais previsível, com filtro de tremor leve e sem aceleração variável.
- Sensibilidade de toque padrão 3.8× e ajuste de 0.8× a 6× no painel SALA (persistente no aparelho).
- Comandos principais afastados da região de mira: disparar, pular, dash à direita; arma, recarregar, mira e usar à esquerda.
- Botão **USAR** reúne a ação de escadas/parkour e objetivos da campanha.
- Controles secundários ficam ocultos; o analógico já inicia corrida quando empurrado para a frente.
- Barras de **HP e escudo sobre os outros jogadores**, atualizadas por evento de dano enviado pelo servidor (vida do jogador local permanece no HUD).
- Mantidas as correções 1.7: apagar/editar nickname e código, gerar código automático quando vazio e criar com código personalizado de 6 caracteres.

## Publicação

Extraia os arquivos na raiz do seu repositório GitHub, substitua os anteriores, commit e push. O `render.yaml` mantém o mesmo serviço e comando de inicialização. Faça recarregamento completo da página após o deploy.

## Limites de teste

Rode `npm test` em Node.js 22+; são testes de lógica e rede, não garantem ergonomia perfeita em aparelho real. O WebGL e o multitouch precisam ser conferidos em Android/iPhone. O plano gratuito da Render pode hibernar/reiniciar, interrompendo salas em memória.
