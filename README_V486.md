# Titan Protocol 4.8.6 — Minha Cidade removido do menu

Base: Titan Protocol 4.8.5 (completo). **Única alteração funcional: remoção temporária do modo Minha Cidade.** Nenhum personagem, habilidade, mapa dos demais modos ou sistema de combate foi modificado.

## Modos disponíveis
- Liga dos Titãs — PvP contra bots e campeões
- Treino Tático — treino e campanha contra IA
- Multijogador — salas online

## O que mudou
- Minha Cidade não aparece mais na seleção de modos; os três cards restantes ocupam a tela toda.
- Entradas antigas de Minha Cidade e configurações de localização e Google 3D foram retiradas do HTML do menu.
- Iniciar o modo removido pela interface ou por chamada `game.start('geocity')` não é mais possível.
- Os arquivos internos de geolocalização foram preservados no pacote, sem executar, para facilitar restauração futura.
- Não foi realizada nenhuma melhoria nos personagens nesta versão, conforme solicitado.

## Como iniciar

```bash
npm install
npm start
```

Teste de regressão: `npm run test:spawn` e `npm run test:league`.
