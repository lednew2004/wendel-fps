# TITAN PROTOCOL 3.5.3 — Compatibilidade de tiro no celular

## O que mudou

1. O botão ATIRAR agora registra `touchstart`, `touchend` e `touchcancel` em captura, com identificação individual de cada dedo. Assim o primeiro disparo não depende do `click`, do bloqueio do ponteiro nem da atualização da renderização.
2. Se alguma camada transparente cobrir o botão, o comando ainda pode ser reconhecido pelas coordenadas da área visível de ATIRAR, desde que o jogador esteja em partida. Botões e diálogos reais permanecem prioritários.
3. Mantidos `pointerdown`, `pointerup` e `pointercancel` como compatibilidade para caneta e dispositivos sem eventos `touchstart`.
4. Enquanto ATIRAR estiver pressionado, o loop de combate consulta também o estado de toque, independentemente do botão do mouse.
5. A região de mira não registra um movimento de câmera sobre a área do botão de tiro.
6. HUD e comandos mobile têm camadas separadas; HTML/CSS/JS usam política `no-store` no servidor para reduzir a chance de carregamento da versão antiga.
7. O build exibido no menu passa a ser **3.5.3** e `/health` também informa `3.5.3`.

## Como atualizar

Substitua no repositório os arquivos do ZIP, sem remover as pastas `public/assets`, `server` ou `tools`.

```bash
git add .
git commit -m "fix: corrige disparos por toque no mobile - v3.5.3"
git push origin main
```

Confirme no celular que o menu mostra `BUILD 3.5.3`. Caso exiba versão anterior, o deploy ou o cache ainda não foi atualizado. Abra o link em uma guia anônima ou limpe os dados do site.

## Testes

- `npm test`: 96 testes passando.
- Simulação real no Chromium, paisagem 844×390, com toque rápido no disparo, dedo segurando, movimento de um segundo dedo e camada transparente artificial sobre o botão; disparos registrados em todos os casos previstos.

A validação em um telefone físico com o navegador e a instalação do usuário ainda precisa ser feita após a publicação.
