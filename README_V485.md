# Titan Protocol 4.8.5 — Menu otimizado

Base: código completo 4.8.4, sem remoção dos modos, operadores, mapas ou sons.

## Redução de travamentos no menu

- Enquanto o menu em tela cheia está aberto, o renderizador do cenário 3D principal não desenha nenhum quadro, e os updates de mundo/partida ficam suspensos.
- Menus secundários que permitem ver a cidade desenham o cenário a no máximo 8 FPS e sem simulação de combate.
- Seleção de personagens começa com retrato 2D rápido. Clique em **ATIVAR PRÉVIA 3D** para carregar o modelo 3D somente quando desejar. A prévia usa resolução interna de até 440 px, cerca de 16 FPS e é pausada quando fica oculta.
- Cliques rápidos para trocar de operador não forçam downloads ou decodificações de todos os modelos: 110 ms de debounce e cache de modelos vistos.
- Cinemática preservada com efeitos CSS mais leves (sem blur grande, sombras complexas nem feixe animado).
- Áudios WAV não são mais todos decodificados ao entrar no menu: são buscados sob demanda. A primeira reprodução de um efeito ainda não carregado pode não tocar enquanto o áudio é carregado; reproduções seguintes usam o WAV real já decodificado.

## Executar

```bash
npm install
npm start
```

No navegador, abra `http://localhost:3000` (ou a porta indicada pelo servidor).

## Testes

```bash
npm run test:spawn
npm run test:league
```

A responsividade efetiva varia conforme o dispositivo e o navegador. Testar em hardware real.
