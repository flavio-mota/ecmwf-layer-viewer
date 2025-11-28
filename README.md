# ECMWF Icing Index Viewer

Visualizador interativo web para índices de icing do ECMWF gerados a partir de dados GRIB2.

## Features

- 🗺️ Visualização interativa em mapa (Leaflet)
- 📊 Múltiplos níveis de pressão (150-950 hPa)
- ⏱️ Animação temporal através de steps
- 🎨 Escala de cores configurável (viridis)
- 📱 Responsivo
- 🚀 Deploy fácil no Netlify

## Como Usar

### Rodar Localmente

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/ecmwf-layer-viewer.git
cd ecmwf-layer-viewer

# Sirva localmente (Python)
python -m http.server 8000

# Ou use qualquer servidor HTTP
# npx http-server
# php -S localhost:8000
```

Abra http://localhost:8000 no navegador.

## Estrutura de Dados

Os GeoTIFFs devem ser organizados por:
- **Data**: YYYYMMDD (ex: 20251109)
- **Step**: horas de forecast (0h, 3h, 6h, ...)
- **Nível**: pressão em hPa (950, 900, 850, ...)

**Formato esperado:**
```
data/
└── YYYYMMDD/
    └── step_Xh/
        └── icing_YYYYMMDDTHh_stepXh_levelYhPa.tif
```

**Exemplo:**
```
data/
└── 20251109/
    ├── step_0h/
    │   ├── icing_20251109T00_step0h_level950hPa.tif
    │   ├── icing_20251109T00_step0h_level900hPa.tif
    │   └── ...
    └── step_3h/
        └── ...
```

## Gerar Configuração

Após adicionar novos GeoTIFFs, regenere o `config.js`:

```bash
python generate_config.py
```

Este script:
- Varre a pasta `data/` procurando arquivos `.tif`
- Extrai data, step e nível dos nomes dos arquivos
- Gera o arquivo `js/config.js` automaticamente

## Deploy no Netlify

### Opção 1: Drag & Drop (Mais Fácil)

1. Acesse [app.netlify.com](https://app.netlify.com)
2. Faça login com GitHub
3. Arraste a pasta `ecmwf-layer-viewer` para a área de deploy
4. Aguarde o deploy (alguns segundos)
5. Pronto! Você receberá uma URL como `https://seu-site.netlify.app`

### Opção 2: Netlify CLI

```bash
# Instale o Netlify CLI
npm install -g netlify-cli

# Faça login
netlify login

# Deploy
netlify deploy --prod
```

### Opção 3: Conectar Repositório GitHub

1. No Netlify, clique em "Add new site" > "Import an existing project"
2. Conecte seu repositório GitHub
3. Configure:
   - **Build command**: (deixe vazio - não precisa build)
   - **Publish directory**: `.` (raiz)
4. Clique em "Deploy site"

### Configuração Automática

O arquivo `netlify.toml` já está configurado com:
- ✅ Redirecionamento SPA (todas as rotas → index.html)
- ✅ Cache otimizado para arquivos estáticos
- ✅ CORS habilitado para GeoTIFFs
- ✅ Headers apropriados

## Estrutura do Projeto

```
ecmwf-layer-viewer/
├── index.html              # Página principal
├── netlify.toml           # Configuração do Netlify
├── generate_config.py     # Script para gerar config.js
├── package.json          # Metadados do projeto
├── js/
│   ├── app.js            # Lógica da aplicação
│   └── config.js        # Configuração (gerado automaticamente)
├── css/                  # Estilos (opcional)
└── data/                 # GeoTIFFs organizados por data/step
```

## Tecnologias

- [Leaflet](https://leafletjs.com/) - Mapas interativos
- [GeoTIFF.js](https://geotiffjs.github.io/) - Leitura de GeoTIFFs no navegador
- [Plotty.js](https://github.com/santilland/plotty) - Renderização de dados científicos

## Workflow Completo

1. **Processar dados GRIB2** (no projeto `ecmwf-bucket`):
   ```bash
   cd ../ecmwf-bucket
   ./docker-run.bat --date-start 2025-11-09 --organize-by-date
   ```

2. **Copiar GeoTIFFs para o visualizador**:
   ```bash
   # Copie os arquivos de output/ para ecmwf-layer-viewer/data/
   ```

3. **Gerar configuração**:
   ```bash
   cd ecmwf-layer-viewer
   python generate_config.py
   ```

4. **Commit e push**:
   ```bash
   git add .
   git commit -m "Update: novos dados"
   git push
   ```

5. **Deploy automático no Netlify** (se conectado ao GitHub)

## Limitações e Dicas

### Tamanho dos Arquivos

- Netlify tem limite de **100MB por arquivo** no plano gratuito
- Se seus GeoTIFFs forem muito grandes:
  - Considere usar **Git LFS** (Large File Storage)
  - Ou hospede os dados em **cloud storage** (S3, Cloudflare R2) e atualize `config.js` com URLs

### Performance

- GeoTIFFs grandes podem demorar para carregar
- Considere criar **tiles pré-renderizados** ou usar **COG** (Cloud Optimized GeoTIFF)

## Licença

MIT