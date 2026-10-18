# TITAN PROTOCOL 3.0 — MOBA HERO COMBOS (LIGHT EDITION)

Baseado no jogo 2.9, com o renderizador leve de 2.7. Não inclui a chuva e a cidade cyberpunk pesada da 2.8. É um FPS 3D em Three.js com exploração, parkour, campanha, sobrevivência e multiplayer WebSocket.

## Mapa MOBA

- **Base azul** em (0, -180): início da campanha e sobrevivência; jogadores pares da sala online.
- **Base vermelha** em (0, 180): adversários online em vagas ímpares.
- **TOP LANE:** contorna a cidade pelo corredor oeste.
- **MID LANE:** atravessa o centro.
- **ADC LANE:** contorna a cidade pelo corredor leste.
- **JUNGLE:** seis acampamentos/áreas de monstros distribuídos entre as rotas. Na campanha e sobrevivência, inimigos podem surgir nessas regiões.
- Rotas coloridas, núcleos de base, marcadores da jungle, minimapa e mapa de teleporte atualizados. O servidor compartilha os corredores livres com o cliente usando `mobaLayout.js` e os arquivos de colisão gerados.
- Multiplayer organizado em lados **azul e vermelho**, sem dano aliado. **Ainda não é um MOBA completo com torres destrutíveis, minions automáticos e condição de vitória pelo Nexus**: o modo online preserva a partida de combate existente e o mapa adota a geografia de um MOBA.

## Personagens e habilidades

**13 heróis, 39 técnicas distintas, todas equipadas desde o início, tanto no casual quanto no online.** A roda TAB/PODERES organiza o kit, sem gastar créditos. Antes de iniciar, escolha o herói e uma das quatro armas iniciais.

| Personagem | Especialidade | Habilidade 1 | Habilidade 2 | Habilidade 3 |
|---|---|---|---|---|
| VEX | Impacto | Repulsão | Pulso Titânico | Sobrecarga |
| NYRA | Gelo | Congelar | Crioprisão | Estase |
| KAIROS | Dimensão | Teleporte pelo mapa | Troca | Intangibilidade |
| ÍCARO | Mobilidade | Voo | Propulsão | Antigravidade |
| SOMBRA | Furtividade | Invisibilidade | Virar objeto | Camuflagem |
| ÉON | Tempo | Rewind 10 s | Ressurreição | Rewind 5 s |
| MÍMICO | Ilusão | Clones | Clone Móvel | Copiar |
| VOLTA | Eletricidade | Raio | Raio Cirúrgico | Tempestade |
| NEXUS | Gravidade | Buraco Negro | Gravidade | Armadilha do Vazio |
| ATLAS | Suporte | Cura | Escudo | Nanocura |
| **SHIRO** | Assassino | Dois avanços, o segundo causa dano | Recuo com tiro fortalecido | Ricochetes com escudo |
| **LEO** | Assassino | Dois avanços + retorno à origem | Imunidade por 1 s | Bombas globais + proteção |
| **BUTTERFLY** | Mobilidade | Dash com retorno | Orbe que orbita e permite teleporte | Cometa que empurra + teleporte |

Os três novos kits trazem **9 técnicas de combo** com reativação e estados sincronizados pelo servidor. O cliente não determina livremente o destino ou o dano dessas técnicas no multiplayer.

## Controles

- **PC:** `1`, `2`, `3` ativam os três poderes; pressione novamente para a etapa seguinte de um combo. `4` ou `F` alterna a arma, assim como a roda do mouse. `TAB` abre/fecha a roda do personagem. `X` é o Dash (com recarga), `E` interage com portas e janelas.
- **Celular:** botões PODER 1, PODER 2 e PODER 3; habilidades com mira mantêm o arraste/soltar; dash, pulo, ataque e movimento permanecem separados. Toque PODERES para abrir o menu.
- Recargas e estados ativos permanecem no HUD. Cooldowns são individuais e validados no servidor online.

## Publicação e testes

Requer Node.js >= 22. `npm start` inicia o mesmo serviço HTTP e WebSocket, sem Redis e sem dependências externas de npm. Three.js é carregado por CDN e requer acesso à internet. Para testar, rode `npm test`. O endpoint `/health` deve retornar `3.0.0`.

Na pasta do repositório GitHub (arquivos descompactados na raiz), execute:

```bash
git add .
git commit -m "TITAN PROTOCOL 3.0 - MOBA e combos"
git push origin main
```

Render gratuito pode suspender/reiniciar o processo, perdendo as salas que ficam em memória. Os testes automatizados não substituem a validação de WebGL e fluidez em aparelhos reais.
