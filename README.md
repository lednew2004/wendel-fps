# TITAN PROTOCOL 2.3 — CHRONOCLONE

Jogo FPS 3D para **PC e celular**, com parkour urbano, campanha/sobrevivência, multiplayer em salas, minimapa e **16 habilidades** equipáveis (duas por vez). Implementado em HTML/CSS/JavaScript com Three.js e um servidor HTTP + WebSocket Node.js, sem dependências npm adicionais.

## Habilidades novas e modificadas

| Poder | Recarga | Funcionamento |
|---|---:|---|
| **Clone Móvel / Clone Salto** | 9 s | Cria **um** clone que corre e desvia de obstáculos por 12 s. Toque/pressione novamente para **trocar de lugar** com ele, uma vez durante a ativação. O clone continua como distração no ponto antigo. |
| **Buraco Negro Extremo** | 10 s | Sucção forte em raio de 16 m por 4,8 s; os adversários são puxados radicalmente para o centro, respeitando colisões. |
| **Reverter Tempo** | 10 s | Volta ao estado de **10 segundos atrás** (posição, vida e escudo). É necessário aguardar a gravação dos primeiros 10 s de histórico. |
| **Teia Oscilante** | 9 s | Agarra uma **parede** a até 40 m, gera corda visível e permite balançar com física de aceleração/impulso por até **10 segundos**. PULAR solta a teia. |
| **Copiar** | 10 s | Marca um inimigo por até **14 s**. Após eliminá-lo, copia **duas habilidades** durante 25 s e depois recupera a configuração anterior. No online usa os poderes reais do adversário; no casual, pares definidos para o tipo de inimigo IA. |

## Outras 11 habilidades preservadas

Repulsão (10 s); Congelamento de 1 s (10 s); Teleporte pelo mapa completo, com retorno em até 12 s (10 s); Voo de 5 s (10 s); Invisibilidade de 3 s (10 s); Intangibilidade de 6 s (10 s); Corrente Elétrica (10 s); Gravidade Invertida (10 s); Clones Fantasmas de 8 s, que continuam sendo **três decoys estáticos** (8 s); Escudo Absoluto de 5 s (10 s); Troca Dimensional (10 s). **Clone Móvel é uma habilidade distinta de Clones Fantasmas.**

## Controles

- **PC:** `Z` ativa Poder 1; `V`, Poder 2; `Tab` abre o seletor de habilidades. Na Teia, mire numa parede e pressione o poder; pressione **ESPAÇO** para soltar a corda e ganhar impulso. No Clone Móvel, pressione o poder novamente para trocar de lugar.
- **Celular:** dois botões exclusivos de habilidade, posicionados fora da área de mira; habilidades direcionadas usam **segurar → arrastar para mirar → soltar para executar**, com arrasto para cima para cancelar. Para Teia, aponte para a parede e solte; para Clone Móvel, toque novamente para trocar de lugar. **PULAR** solta a teia.
- **Teleporte:** usa o mapa de toda a cidade, clicando ou tocando no destino válido; reative em até 12 s para voltar à origem.
- Enquanto uma habilidade está ativa, seu botão mostra os segundos restantes; quando recarrega, mostra o tempo para ficar pronta. Os controles de tamanho/posição dos dois poderes são configuráveis nos menus.

## Multiplayer e casual

- Multiplayer de até 8 jogadores por sala, códigos personalizados de 6 caracteres, campo de nickname editável, botão para limpar campos, compartilhamento de link/código e reconexão temporária.
- Minimapa multiplayer sempre visível com localização dos jogadores; barras de vida/escudo dos outros participantes.
- Servidor valida cargas/recargas, alvos de Copiar, mortes, posicionamento de clones e teleporte dos clones, duração da teia e ponto de fixação em paredes. Simulação e animação do balanço acontecem no cliente com as restrições existentes de movimentação.
- Modo casual/campanha e sobrevivência mantêm os efeitos adaptados aos inimigos de IA. Copiar habilidades de IA oferece poderes pré-configurados por tipo de inimigo, já que eles não têm equipamentos PvP.

## Instalação e publicação

Requer **Node.js 22 ou superior**. Execute `npm start` e abra `http://localhost:3000`. Para os testes automatizados, execute `npm test`.

Para usar **GitHub + Render**, o conteúdo do ZIP deve ficar na raiz do repositório: `public/`, `server/`, `render.yaml` e `package.json`. O servidor HTTP entrega o jogo e o WebSocket de `/ws` no mesmo serviço Render. Não precisa Redis. O plano gratuito pode dormir ou reiniciar; salas ficam em memória e não sobrevivem a um reinício do servidor.

**Validação:** testes Node e WebSocket, análise estática de módulos e endpoints. A execução WebGL completa e o conforto do toque/física devem ser verificados em aparelhos reais antes de considerar o balanceamento final concluído.
