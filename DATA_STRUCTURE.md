# Estrutura de Dados

Este documento descreve a estrutura esperada dos arquivos GeoTIFF no diretório `data/`.

## Estrutura de Pastas

```
data/
└── YYYYMMDD/              # Data do forecast (formato: YYYYMMDD)
    └── step_Xh/            # Step em horas (ex: step_0h, step_3h, step_6h)
        └── icing_*.tif     # Arquivos GeoTIFF
```

## Formato dos Nomes de Arquivo

Os arquivos GeoTIFF devem seguir o padrão:

```
icing_YYYYMMDDTHh_stepXh_levelYhPa.tif
```

Onde:
- `YYYYMMDD` = Data (ex: 20251109)
- `T` = Separador literal
- `Hh` = Hora (ex: 00, 12)
- `stepXh` = Step em horas (ex: step0h, step3h, step120h)
- `levelYhPa` = Nível de pressão em hPa (ex: level950hPa, level850hPa)

### Exemplos

```
icing_20251109T00_step0h_level950hPa.tif
icing_20251109T00_step0h_level900hPa.tif
icing_20251109T00_step0h_level850hPa.tif
icing_20251109T00_step3h_level950hPa.tif
icing_20251109T12_step120h_level700hPa.tif
```

## Exemplo Completo

```
data/
├── 20251109/
│   ├── step_0h/
│   │   ├── icing_20251109T00_step0h_level950hPa.tif
│   │   ├── icing_20251109T00_step0h_level900hPa.tif
│   │   ├── icing_20251109T00_step0h_level850hPa.tif
│   │   ├── icing_20251109T00_step0h_level800hPa.tif
│   │   └── ...
│   ├── step_3h/
│   │   ├── icing_20251109T00_step3h_level950hPa.tif
│   │   └── ...
│   └── step_6h/
│       └── ...
└── 20251110/
    └── ...
```

## Níveis de Pressão Comuns

Os níveis de pressão típicos são (em ordem decrescente):
- 950 hPa
- 900 hPa
- 850 hPa
- 800 hPa
- 700 hPa
- 600 hPa
- 500 hPa
- 400 hPa
- 300 hPa
- 250 hPa
- 200 hPa
- 150 hPa

## Geração Automática do Config

O script `generate_config.py` varre automaticamente a pasta `data/` e gera o arquivo `js/config.js` com a estrutura correta.

Execute após adicionar novos arquivos:

```bash
python generate_config.py
```

## Notas Importantes

1. **Case-sensitive**: Os nomes são case-sensitive. Use exatamente:
   - `step_0h` (não `Step_0h` ou `STEP_0H`)
   - `level950hPa` (não `Level950hPa`)

2. **Separadores**: Use underscores (`_`) e hífens (`-`) conforme o padrão

3. **Extensão**: Arquivos devem terminar com `.tif` (não `.tiff`)

4. **Estrutura**: Mantenha a estrutura de pastas `data/YYYYMMDD/step_Xh/`

