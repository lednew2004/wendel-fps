# TITAN PROTOCOL 2.6 — CIDADE VIVA

FPS 3D para PC e celular, com campanha, sobrevivência e salas online via Node.js 22 + WebSocket. Projeto completo baseado na versão 2.5, **sem remover** os 18 poderes, progressão por créditos, roda de habilidades, dash com recarga, minimapa, barras de vida e controles móveis.

## O que mudou nesta versão

- **Mapa ampliado:** de aproximadamente 298 × 298 m para **438 × 438 m**, mais que o dobro da área útil. Bairros periféricos com edifícios coloridos e variados, região industrial, distritos residenciais, centro de prédios mais altos, vias conectadas, praças, lagoas, árvores e sinalização.
- **8 casas jogáveis:** portas, 16 janelas com abertura, interiores mobiliados (sala, mesas, cama, cozinha), paredes reais, pisos, telhados acessíveis e escadas de acesso externo. Há mais de 60 novos prédios no perímetro, além das casas.
- **Abrir e fechar:** no PC, aproxime-se e pressione **E**; no celular, use **USAR**. Interaja com portas e janelas. O HUD mostra `ABRIR`/`FECHAR`; as portas giram em dobradiças e as janelas se abrem. Uma janela aberta pode ser atravessada com um salto; a fechada bloqueia a passagem. Há apoio de impulso no salto perto de janelas abertas.
- **Casual e online:** mesmo mundo nos dois modos. O servidor valida proximidade das interações, sincroniza portas/janelas entre os participantes e envia as já abertas a jogadores que entram depois. Não permite fechar uma passagem ocupada. Colisões do mundo expandido também estão no servidor.
- **Visual:** vegetação verde mais vibrante, fachadas em várias cores, telhados coloridos, iluminação mais quente e céu azul, nuvens móveis, água levemente animada e luminárias internas. Interface com acentos ciano, dourado e verde. Mantivemos as texturas PBR originais do projeto.
- **Parkour:** saltos e janela de tolerância no salto melhorados, colisão de móveis/partições, telhados e escadas, transposição de janela aberta.
- **Desempenho:** o mapa usa blocos/chunks já existentes e descarte visual por distância; árvores com `InstancedMesh`, geometria de ruas reutilizada, sombras configuráveis. Smartphones continuam com configuração de qualidade e distância de renderização reduzidas.
- **Minimapa e teleporte:** cobrem os novos limites. A habilidade Teleporte continua selecionando o destino pelo mapa completo, inclusive as novas regiões, com retorno ao ponto de origem.

## Controles

PC: WASD movimenta, mouse mira, **E** abre/fecha porta ou janela, **Espaço** pula/janelas, **X** dash, **TAB** abre/fecha roda, **Z/V** ativa habilidades. No celular, analógico esquerdo e controles de combate anteriores, com **USAR** para interações. A física de movimento também se aplica ao multiplayer. Consulte `GUIA_PUBLICACAO_GRATIS.md`.

## Deploy GitHub + Render

1. Extraia o ZIP na **raiz do repositório**: `package.json`, `render.yaml`, `public/`, `server/` e arquivos `.md` devem estar juntos.
2. Faça `git add .`, `git commit -m "Titan Protocol 2.6 - Cidade viva"` e `git push origin main`.
3. Confira o deploy automático e visite `https://SEU-SITE/health`: `"version":"2.6.0"`.
4. Se editar a planta da cidade em `public/src/worldLayout.js`, execute `node server/build_colliders.mjs` para reconstruir o arquivo de colisões do servidor antes de publicar.

`npm test` roda os testes automatizados. Não requer pacotes npm externos; os módulos Three.js são importados pela rede CDN no navegador.

## Limites de validação

Os testes Node/WebSocket verificam geometrias declarativas, sala online, portas, janelas, poderes e recargas, mas não substituem testes manuais de WebGL, sensação de parkour, renderização e desempenho em modelos reais de smartphone. O ambiente atual bloqueou a conexão local do navegador automatizado, por isso **não** há validação visual completa da cena nesta entrega. O servidor Render gratuito guarda salas e estados em memória — reinícios descartam esses dados.
