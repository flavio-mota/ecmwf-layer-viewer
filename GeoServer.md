```markdown
# 🌍 Configuração GeoServer (Método Granular)

Este guia utiliza arquivos de regex separados para Tempo e Elevação, garantindo controle total sobre a extração de dados.

---

## 1. Estrutura de Pastas
Para evitar conflitos, cada parâmetro tem a sua própria pasta raiz e o seu próprio Store no GeoServer.

```text
data/
├── icing/                          <-- 📍 Store: icing
│   ├── indexer.properties
│   ├── timeregex.properties        (Extrai a Data)
│   ├── elevationregex.properties   (Extrai o Nível)
│   └── 20251109/ ... (Dados)
│
├── wind/                           <-- 📍 Store: wind
│   ├── indexer.properties
│   ├── timeregex.properties
│   ├── elevationregex.properties
│   └── 20251109/ ... (Dados)
│
└── rain/                           <-- 📍 Store: rain
    ├── indexer.properties
    ├── timeregex.properties
    └── (SEM elevationregex)

```

---

## 2. Configuração dos Arquivos para parametros de tempo e elevação

*Estes parâmetros possuem Tempo e Nível de Pressão.*

### 📄 1. indexer.properties

Define o esquema e o formato da data.

```properties
Recursive=true
TimeAttribute=time
ElevationAttribute=elevation
Schema=*the_geom:Polygon,location:String,time:java.util.Date,elevation:Integer

# O formato da data é definido aqui (yyyyMMdd'T'HH)
PropertyCollectors=TimestampFileNameExtractorSPI[time](time,yyyyMMdd'T'HH),IntegerFileNameExtractorSPI[elevation](elevation)

```

### 📄 2. timeregex.properties

Captura a **Data Válida** (a segunda data no nome do arquivo).
*Arquivo:* `..._step0h_20251109T12_level...`

```properties
# Pega a data que está logo antes de "_level"
regex=(?i).*_([0-9]{8}T[0-9]{2})_level.*

```

### 📄 3. elevationregex.properties

Captura o Nível de Pressão.
*Arquivo:* `..._level950hPa.tif`

```properties
# Pega o número entre "level" e "hPa"
regex=(?i).*_level([0-9]+)hPa.*

```

### 📄 2. timeregex.properties (Rain)

Como não tem `_level` no nome, usamos um regex que procura o final do arquivo ou o padrão de data.
*Arquivo:* `rain_..._step0h_20251109T12.tif`

```properties
regex=(?i).*_([0-9]{8}T[0-9]{2})(?:\.tif)?$
```

---
## 4. Passo a Passo no Painel Admin (Resumo)

⚠️ **IMPORTANTE:** Antes de criar cada Store, apague arquivos de cache antigos (`.data`, `.index`, `.shp`) se existirem nas pastas.

1. **Crie o Store:**
* **Stores** -> **Add new Store** -> **ImageMosaic**.

2. **Publique a Camada:**
* Clique em **Publish**.
* Aba **Data**: Clique nos botões "Compute" para Bounding Boxes.
* Aba **Dimensions**:
* **Time**: Enabled (List).
* **Elevation**: Enabled (List) - *Quando aplicável*.
---

## 5. Frontend Config (config.js)

Mapeamento das camadas no frontend:

```javascript
layers: {
    "Icing": "ecmwf:icing",
    "Wind": "ecmwf:wind",
    "Rain": "ecmwf:rain"
}
```

```
Esta configuração é a mais robusta possível. Se precisares de ajustar como o GeoServer lê o nome do arquivo no futuro, só precisas de mexer no ficheiro regex específico (`time` ou `elevation`), sem risco de quebrar o outro.
```