# TITAN PROTOCOL 4.4.0 — Atualização de jogabilidade

Base: TITAN PROTOCOL 4.3.0. Esta atualização preserva as salas PvP/cooperativas e os sistemas de armas, heróis, poderes, portas, escadas e colisões existentes.

## Alterações
- **Mira óptica:** FOV do rifle passa a 18° durante ADS, escopeta a 28°, M249 a 22° e sniper a 11°. A arma em primeira pessoa é ocultada ao completar o ADS, deixando o adversário visível no centro. Pequena assistência de centralização funciona somente contra bots e exige linha de visão; não atua no PvP.
- **Inserção aérea:** campanha e sobrevivência começam a ~82 m de altura. A queda acelera sob gravidade até velocidade terminal. Pressione **Espaço ou E** (ou salto/interagir no mobile) para abrir o paraquedas; ele abre automaticamente a 32 m para evitar travamentos de iniciante. **WASD** ou controle touch dirige a queda. O pouso usa as mesmas superfícies físicas do mapa; pouso sem desaceleração suficiente provoca dano.
- **Bots:** maior velocidade e cadência (mantendo dispersão de disparos), intervalos menores entre verificações de visibilidade, mudança de direção ao sofrer dano e busca ocasional de cobertura quando feridos. Não rastreiam jogador escondido sem linha de visão.
- **Chefes:** modo sobrevivência apresenta chefe a cada 3 ondas e gera reforços mais rapidamente. Na campanha, fases de defesa, reconhecimento, sabotagem e extração são mais curtas; a atuação do esquadrão ainda acelera os objetivos.
- **Armas no chão:** pickups 3D aparecem em diversos pontos do mapa e podem cair de inimigos. Aproxime-se ou pressione **E** para coletar; só é possível alternar com **F** as armas encontradas, além da inicial. Multiplayer mantém arsenal e validação próprios do servidor.

## Desenvolvimento e publicação
```bash
npm ci
npm test
npm run build
npm start
```

Render: build `npm ci && npm run build`, start `npm start`; branch GitHub conforme configuração do serviço. Os arquivos `package.json` e `package-lock.json` foram mantidos alinhados na versão 4.4.0. Após deploy, `/health` deve retornar `version: 4.4.0`. A versão publicada não foi alterada automaticamente.

## Validação
- Testes Node e integridade das rotas HTTP: ver registro da entrega.
- O ambiente deste pacote não tem o módulo `three` instalado (rede npm indisponível); a renderização e interações gráficas precisam ser validadas no navegador após `npm ci` em um ambiente com acesso ao npm.
- Queda e alvos são locais na campanha/sobrevivência. Em multiplayer, novas mecânicas de drop/loot não estão habilitadas para evitar divergência do servidor autoritativo.
