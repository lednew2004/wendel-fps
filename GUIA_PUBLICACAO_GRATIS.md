# Publicar TITAN PROTOCOL 2.4.1 gratuitamente (GitHub + Render)

1. **Descompacte o ZIP** e substitua os arquivos da versão anterior no repositório GitHub. Mantenha as pastas `public/`, `server/` e os arquivos `render.yaml`, `package.json` e `README.md` na **raiz**.
2. Use os comandos abaixo na pasta do projeto:

   ```powershell
   git add .
   git commit -m "TITAN PROTOCOL 2.4.1 - Correcao TAB da roda"
   git push origin main
   ```

3. No painel **Render**, abra seu serviço Web existente. Aguarde o deploy automático aparecer como **Live**. Se o deploy não começar, use **Manual Deploy → Deploy latest commit**.
4. Abra `https://SEU-ENDERECO.onrender.com/health`. Se aparecer `"ok":true` e `"version":"2.4.1"`, o servidor atualizado está ativo.
5. Abra o site e teste com **dois dispositivos/navegadores**, criando uma sala com código de seis caracteres e entrando com outro jogador.

## Como testar as novas habilidades

- **Clone Móvel:** equipe o clone e pressione uma vez. Um holograma percorre o mapa. Durante 12 s, pressione novamente e os dois trocam de lugar. Diferente de Clones Fantasmas, essa habilidade cria **um** clone que se movimenta.
- **Buraco Negro Extremo:** aponte para uma área próxima de outros jogadores e ative. O efeito deve puxá-los intensamente durante 4,8 s.
- **Reverter Tempo:** jogue por pelo menos 10 s, mude de posição ou sofra dano e ative. A posição, a vida e o escudo retornam aos valores de dez segundos antes.
- **Teia Oscilante:** mire numa parede a até 40 m. No PC, pressione `Z` ou `V`; no celular, segure o botão do poder, arraste para mirar e solte. Balance por até 10 s; **PULAR** solta a corda com impulso.
- **Copiar:** mire em um jogador e marque-o. Elimine **o mesmo jogador** em até 14 s; seus dois poderes equipados serão copiados por 25 s. Contra inimigos da campanha, são copiados dois poderes determinados pelo tipo do inimigo.

## Estrutura técnica

- Hospedagem Render: **um único serviço Node.js** com HTTP e WebSocket; Node 22+, porta `PORT` automática, `/ws` no mesmo domínio do site.
- Não é necessário Redis. O plano gratuito pode suspender ou reiniciar; como salas ficam em memória, serão perdidas após um reinício do processo.
- Mantenha o minimapa, o painel SALA, as barras de vida e os controles de mira móveis. A recarga máxima das 19 habilidades continua em 10 s.
- **Testes automatizados não substituem validar a física da teia e os efeitos 3D em celulares e desktops reais.**

## TAB da roda (2.4.1)

No PC, **pressione TAB uma vez para abrir e outra para fechar**. A seleção é feita clicando no poder. Não é necessário segurar a tecla; soltar TAB não fecha a roda. Dentro de formulários e fora da partida, TAB continua com a função normal do navegador.
