# Publicação gratuita — TITAN PROTOCOL 2.8

- Repositório GitHub: extraia **todos** os arquivos diretamente na raiz (não coloque a pasta inteira como subdiretório).
- Render: mantenha o Web Service Node existente conectado ao repositório. `npm start` inicia HTTP e WebSocket na mesma URL. É possível usar o `render.yaml` como blueprint gratuito.
- Após atualizar: `git add .` → `git commit -m "Titan Protocol 2.8 - Personagens 3D"` → `git push origin main`.
- Aguarde o deploy e abra `/health`; a versão deve ser `2.8.0`. Faça recarregamento completo no celular para eliminar cache antigo.
- Teste duas pessoas numa mesma sala: aproxime-se de uma casa, pressione **E** (PC) ou **USAR** (celular) e confirme que portas/janelas abrem para ambos.
- Se alterar o desenho das casas, gere os colliders com `node server/build_colliders.mjs`.
- Limites do gratuito: salas e portas em memória desaparecem se o servidor for reiniciado/suspenso. Há dependência de acesso à CDN do Three.js no navegador.
