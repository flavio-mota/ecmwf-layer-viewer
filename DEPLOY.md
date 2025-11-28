# Guia de Deploy no Netlify

Este guia mostra passo a passo como fazer deploy da aplicação no Netlify.

## Pré-requisitos

1. ✅ Repositório criado no GitHub (`ecmwf-layer-viewer`)
2. ✅ Arquivos GeoTIFF na pasta `data/`
3. ✅ `config.js` gerado (execute `python generate_config.py`)

## Método 1: Drag & Drop (Mais Rápido)

### Passo 1: Preparar o Projeto

```bash
# Certifique-se de que tudo está commitado
git add .
git commit -m "Preparar para deploy"
git push
```

### Passo 2: Fazer Deploy

1. Acesse [app.netlify.com](https://app.netlify.com)
2. Faça login com sua conta GitHub
3. Na página inicial, encontre a seção "Sites"
4. **Arraste e solte** a pasta `ecmwf-layer-viewer` na área indicada
5. Aguarde alguns segundos
6. ✅ Pronto! Você receberá uma URL como `https://random-name-123.netlify.app`

### Passo 3: Personalizar URL (Opcional)

1. No site do Netlify, vá em **Site settings** > **Change site name**
2. Escolha um nome personalizado (ex: `ecmwf-icing-viewer`)
3. Sua URL será: `https://ecmwf-icing-viewer.netlify.app`

---

## Método 2: Conectar Repositório GitHub (Recomendado)

Este método permite deploy automático a cada push.

### Passo 1: Conectar Repositório

1. No Netlify, clique em **"Add new site"** > **"Import an existing project"**
2. Escolha **"Deploy with GitHub"**
3. Autorize o Netlify a acessar seus repositórios
4. Selecione o repositório `ecmwf-layer-viewer`

### Passo 2: Configurar Build

O Netlify detectará automaticamente que é um site estático. Configure:

- **Branch to deploy**: `main` (ou `master`)
- **Build command**: (deixe vazio - não precisa build)
- **Publish directory**: `.` (ponto = raiz do projeto)

### Passo 3: Deploy

1. Clique em **"Deploy site"**
2. Aguarde o deploy (alguns segundos)
3. ✅ Pronto! A URL será exibida

### Passo 4: Deploy Automático

Agora, a cada `git push`, o Netlify fará deploy automaticamente! 🚀

---

## Método 3: Netlify CLI

### Instalação

```bash
# Instale o Netlify CLI globalmente
npm install -g netlify-cli

# Ou use npx (sem instalar)
npx netlify-cli
```

### Login

```bash
netlify login
```

Isso abrirá o navegador para autenticação.

### Deploy

```bash
# Deploy de produção
netlify deploy --prod

# Ou deploy de preview (para testar)
netlify deploy
```

---

## Verificando o Deploy

Após o deploy, verifique:

1. ✅ A página carrega corretamente
2. ✅ O mapa aparece
3. ✅ Os controles funcionam
4. ✅ Os GeoTIFFs carregam (verifique o console do navegador)

### Troubleshooting

**Problema: Página em branco**
- Verifique o console do navegador (F12)
- Confirme que `config.js` existe e está correto
- Verifique se os caminhos dos arquivos estão corretos

**Problema: GeoTIFFs não carregam**
- Verifique se os arquivos estão na pasta `data/`
- Confirme que os caminhos em `config.js` estão corretos
- Verifique o console para erros de CORS ou 404

**Problema: Arquivo muito grande**
- Netlify tem limite de 100MB por arquivo no plano gratuito
- Considere usar Git LFS ou hospedar dados externamente

---

## Atualizando o Site

### Com Deploy Automático (Método 2)

```bash
# Faça suas alterações
git add .
git commit -m "Atualizar dados"
git push
# Netlify fará deploy automaticamente!
```

### Com Drag & Drop

1. Faça suas alterações localmente
2. Arraste a pasta novamente no Netlify
3. Ou use o CLI: `netlify deploy --prod`

---

## Configurações Avançadas

O arquivo `netlify.toml` já está configurado com:

- ✅ Redirecionamento SPA
- ✅ Cache otimizado
- ✅ CORS habilitado
- ✅ Headers apropriados

Você pode personalizar editando `netlify.toml`.

---

## Próximos Passos

- 🔗 Adicione um domínio personalizado (Netlify > Site settings > Domain management)
- 📊 Configure analytics (Netlify > Site settings > Analytics)
- 🔒 Configure HTTPS (já vem habilitado por padrão)

