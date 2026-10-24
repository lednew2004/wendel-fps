# TITAN PROTOCOL 3.4 — Relatório de implementação

- **20 GLB skinned locais**: 13 heróis + 7 modelos de fallback/inimigos. Esqueletos de 11 ossos, animações de idle, walk, run, dash, jump, fire, aim, hit e cast, com transições no AnimationMixer.
- **Carregamento sem bloqueio**: heróis procedurais aparecem durante o download do GLB, que é reutilizado em cache; memória dos modelos provisórios é liberada após carregamento.
- **Mapa tático**: três modelos GLB arquitetônicos originais, arcos e dutos instanciados, e mapa WebP de sombra ambiente estática. Colisões, missões e rotas de bots inalteradas.
- **Qualidade**: os detalhes arquitetônicos extras são ocultados na opção BAIXA. Mantém perfis gráficos já existentes.
- **WebGPU**: laboratório opcional `/webgpu-lab.html`, executado pelo próprio usuário, sem mudar a renderização WebGL de produção. Mede tempos de chamadas JavaScript, não tempo GPU.
- **Dependências**: Node >=22 e navegador para jogar. Não há instalação de dependências npm. Python com trimesh, numpy e Pillow só para regenerar o conteúdo já entregue.
- **Limitação**: GLBs são modelados programaticamente com geometria arredondada e silhuetas autorais, não personagens de artista ou animações capturadas. Avaliação visual e desempenho real ainda não efetuados.
