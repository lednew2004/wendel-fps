# TITAN PROTOCOL 3.8.0 — FORGE manual e dez novos operadores

## Construção livre FORGE

A habilidade **Modo Criativo** deixa o jogador posicionar seus próprios blocos — não existem estruturas pré-fabricadas ou geradas automaticamente. A barra de construção permite escolher **PEDRA, MADEIRA, METAL, VIDRO, TNT e FOLHAS**, além de **COLOCAR**, **REMOVER** e **SAIR**. As texturas são geradas com pixel art local, sem download adicional. A mira mostra o bloco transparente e fica vermelha em posições bloqueadas.

- **PC:** ative Habilidade 1 e mire para colocar com clique esquerdo; tecla **B** ou botão **REMOVER** para apagar um bloco seu. Use a barra para trocar materiais. Na Habilidade 2 (Redstone), os blocos próprios tornam-se armadilhas: tiro detona e ativa reação em cadeia. A Ultimate acelera o posicionamento manual; nada é construído sem comando do jogador.
- **Mobile:** ative o Poder 1, escolha material na paleta, mire e toque em **COLOCAR**. Toque em **REMOVER** apontando para o seu bloco; **SAIR** encerra o modo. Ações não utilizam o overlay de mira e não exigem pointer lock.
- **Treino/Sobrevivência:** até 160 blocos locais ativos, por até 60 minutos. Esse limite evita travamento em dispositivos com memória limitada e substitui o antigo desaparecimento em poucos segundos. Bloqueios do cenário ou das posições de personagens são respeitados.
- **Online:** até 36 blocos normais, expiração e posições validadas pelo servidor. Apenas o criador remove seus próprios blocos. Construções, tipos de material, dano, armadilhas e remoções são sincronizados pela sala. Regras evitam bloquear objetivos e colocar blocos dentro dos jogadores.

## Novos personagens

Os **15 personagens anteriores continuam disponíveis**; entraram **10 novos**, totalizando **25 personagens jogáveis** e **75 técnicas equipadas** (3 por personagem). Todos receberam GLBs voxel originais locais com silhuetas e acessórios próprios; continuam usando esqueleto/animações do motor já existente.

| Novo personagem | Habilidade 1 | Habilidade 2 | Ultimate | Implementação |
|---|---|---|---|---|
| TERRA | Escavar bloco | Dique de pedra | Falha sísmica | Remove construções voxel; cria barreira e terremoto. Não altera o terreno estático original. |
| PUPPET | Marionetes | Mudança de corpo | Batalhão fantasma | Reaproveita clones móveis do MÍMICO com quantidade e troca próprias. |
| THREAD | Cabo de impulso | Fio aprisionador | Asa de cabos | Reutiliza salto animado/voo e congelamento; ainda não há física de corda oscilante. |
| MIRROR | Escudo refletor | Raio rebatido | Sala de reflexos | Reutiliza escudo, encadeamento de alvos e clones; ainda não implementa espelhos geométricos para balística. |
| PIXEL | Microforma | Expansão brusca | Titã colossal | Ajusta altura visual e caixa de acerto, afasta alvos e ganha defesa. Não abre passagens em tubos finos. |
| CIPHER | Varredura digital | Controle remoto | Apagão de rede | Varre jogadores durante 5 s; interage com portas/janelas disponíveis e desarma TNT adversária. |
| VECTOR | Caminhada vetorial | Campo vetorial | Núcleo gravitacional | Reutiliza locomoção aérea, campos gravitacionais e buraco negro. Ainda não permite caminhar em tetos. |
| BLOOM | Semente estrutural | Raízes aprisionadoras | Floresta viva | Crescimento de blocos vegetais colisíveis e imobilização de alvos. |
| FUSION | Extração | Mistura elemental | Reator triplo | Lê materiais de blocos próximos, dando cura, proteção ou impacto conforme amostra. |
| ECHO | Registrar trajetória | Eco reproduzido | Três linhas temporais | Grava os movimentos do servidor e gera hologramas que seguem trajetórias reais. Não reproduzem dano de tiros anteriores. |

### Reaproveitamento intencional

Os motores originais de `clones`, `clonejump`, `flight`, `freeze`, `shield`, `chain`, `gravity`, `blackhole` e o parkour **não foram duplicados**. Cada novo personagem possui um kit próprio (IDs, recargas e combinação), e efeitos novos passam pela mesma validação de posição, colisões e cooldowns do servidor.

### Limitações explícitas desta entrega

O objetivo é ter 10 novos personagens **jogáveis** e um editor voxel funcional sem reescrever o motor de mundo inteiro. Recursos que exigiriam outro subsistema — escavação de malha nativa com túneis permanentes, portais físicos para balas, espelhos de ray tracing, cordas com física real, gravidade 360º, replay de projéteis ou salvamento de construções entre sessões — não são apresentados como concluídos. Não há persistência remota de construções depois de fechar a sala. Recomenda-se testar a velocidade de construção e os controles com um celular físico.

## Testes e publicação

Execute `npm test` dentro do projeto, e `npm start` para iniciar o servidor web/WebSocket. Para publicar no Render, envie a pasta completa ao GitHub; o `render.yaml` e `package.json` estão incluídos. Verifique **BUILD 3.8.0** no menu depois de publicar.
