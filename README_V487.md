# TITAN PROTOCOL 4.8.7 — VEX / PREDADOR VERTICAL

Base: projeto completo 4.8.6. Esta versão modifica especificamente o Vex, sua física de parkour, animações em primeira pessoa, HUD e validação multiplayer. Os outros operadores, modos e cenário foram mantidos. O modo Minha Cidade continua removido do menu.

## Executar

```bash
npm install
npm start
```

Abra o endereço local exibido pelo servidor (normalmente `http://localhost:3000`). Requer Node.js 22+.

## Vex — três habilidades que formam um combo

**1 — Garras de Travessia**

- Três cargas independentes; cada carga é recuperada em 8,5 segundos.
- Mire na parede, fachada, quina ou telhado em até 42 metros e acione **1**.
- O personagem é puxado por uma corda com aceleração, gravidade, tensão, limite de comprimento, direção tangencial e preservação de inércia (simulação fixa do controlador de parkour, a 90 Hz).
- **Durante o balanço**, mire em outra fachada e acione **1** novamente para trocar o ponto de ancoragem. A velocidade transversal anterior é mantida. Trocar de âncora consome outra carga.
- **W** recolhe corda; **S** libera comprimento; **A/D** orientam o movimento; **Espaço** solta o cabo com impulso, preservando a velocidade.
- Se a mira não atingir uma superfície sólida válida, a garra não é consumida.

**2 — Escalada Predatória**

- Com uma parede próxima, acione **2** para aderir a ela por até **5,3 segundos**.
- **W/S** sobe/desce, **A/D** desloca lateralmente; sem W há subida lenta, e **Espaço** salta para fora.
- Ao alcançar uma borda segura, Vex sobe ao telhado com uma transição. A escalada tem **13 segundos** de recuperação.
- No meio da escalada, lance uma garra ou use a investida de lâminas para sair da parede.

**3 — Lâminas Predadoras (ultimate)**

- Aponte para um inimigo em até **28 metros** e acione **3**. Vex dispara seu corpo na direção do alvo com até **38 m/s**, mantendo colisão e movimento físico (sem teleporte).
- **Acerto confirmado:** causa 85 de dano básico, cria impacto visual/sonoro, recupera a investida após uma pequena janela de **0,22 s**. Dá para repetir em alvos sucessivos.
- **Erro, alvo fora da mira ou colisão no caminho:** a carga é perdida e entra em recarga de **40 s**.
- No online, acertos e recargas são confirmados no servidor. Um pacote com ID de inimigo não causa dano por si só.

## Física e animações

- Novo módulo `public/src/vexPhysics.js`: interseção matemática de raio com colisor, linha de visão, seleção angular de alvo, aceleração por mola/tensão de corda e limite de velocidade.
- Novo módulo `public/src/vexMobility.js`: máquina de estados de gancho, escalada e lâminas; recargas por carga, colisões e trajetória por passos fixos.
- Cabo de garra renderizado do braço até a âncora, com folga e tensão dinâmicas; ponta de âncora animada.
- Braços e lâminas procedurais em primeira pessoa, reação corporal a cada movimento, inclinação da câmera, balanço e ajuste de FOV por velocidade.
- O modelo de arma é ocultado temporariamente ao escalar ou golpear, sem bloquear sua recuperação após o movimento.
- Próxima âncora, fuga aérea e golpes mantêm os vetores de velocidade; as colisões existentes continuam sendo usadas.
- Física do Vex e lógica do servidor são restritas ao personagem VEX.

## Testes

```bash
npm run test:vex
npm run test:spawn
npm run test:league
```

Os testes de física e habilidades do Vex, validação autoritativa no servidor, geração/navegação dos bots e progressão da Liga passaram no ambiente de desenvolvimento. A navegação do menu foi verificada em Chromium com um teste DOM isolado. O teste completo de renderização/partida WebGL em navegador real **não foi concluído**, pois a instalação local da dependência Three.js exigia acesso ao registry npm, que não estava disponível neste ambiente.

**Limite técnico:** o movimento usa um controlador cinemático com restrições e mola próprias sobre os colisores existentes; não é uma simulação de corpo rígido Rapier/Jolt, nem uma animação de captura de movimento. As novas mãos/lâminas e a reação da câmera são animações procedurais em primeira pessoa. A qualidade exata da movimentação e as colisões em todos os cantos do mapa precisam de teste jogável no navegador.
