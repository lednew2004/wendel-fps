# TITAN PROTOCOL 4.8.8 — Correções prioritárias do Vex

Base: projeto completo 4.8.7. Esta versão corrige as habilidades existentes, sem trocar ainda o motor de física ou reconstruir todos os personagens.

## Correções

**1 / Garra**: 3 cargas; agora o cabo recolhe automaticamente e exerce tração na direção real da âncora, em vez de depender apenas de uma mola que podia não deslocar o personagem até a parede. **W** acelera o recolhimento, **S** solta um pouco de cabo para balançar; **A/D** controla o balanço. Outra pressão de **1** mirando em outra fachada troca a âncora sem zerar a velocidade. **Espaço** solta.

**2 / Escalada**: a posição horizontal não é mais recalculada a partir do centro geométrico do prédio. Passos laterais e verticais agora são curtos e verificados contra colisores; o salto para o telhado só ocorre quando o topo está realmente ao alcance. **W/S** sobe/desce, **A/D** desloca, **Espaço** salta.

**3 / Lâminas**: o controlador preserva a velocidade da investida, ajusta a direção durante a aproximação e corrige a altitude do alvo para operadores humanos e bots em diferentes pavimentos. Um golpe local confirmado libera novo ataque em 0,08s (antes 0,22s). No PvP o servidor mantém validação do dano, estende a janela para compensar latência e envia a confirmação do acerto; ataques errados mantêm a punição de cooldown de 40s.

**Parkour**: os movimentos da ultimate deixam de ser desacelerados pelo controlador normal; o limite vertical de altura do Vex foi ampliado para permitir alcançar prédios altos.

## Instalação

```bash
npm install
npm start
```

## Testes

```bash
npm run test:vex
npm run test:spawn
npm run test:league
```

Os testes adicionais verificam: a garra aproxima da âncora sem W; troca de âncora conserva momentum; escalada numa parede grande não teleporta o jogador; subida vertical tem progresso; um golpe nas lâminas confirmado permite a segunda investida.

## Limitações honestas

- Esta é uma correção do controlador existente **cinemático**; ainda não há Rapier/Jolt integrado.
- O Three.js continua sendo instalado por `npm install`; este ambiente não tem a dependência instalada para validar uma partida WebGL em navegador real. Os testes são de lógica/colisão simulada e regressão do servidor.
- Para um resultado visual e físico de padrão comercial, recomenda-se migrar gradualmente o controlador para Rapier, animar modelos esqueléticos com `AnimationMixer` e fazer sessões de testes reais em máquina do jogador.
- Google Maps / Minha Cidade continua removido dos modos visíveis.
