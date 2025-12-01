// Configuração gerada automaticamente por generate_config.py
// Última atualização: 2025-11-28 15:08:00
// Total de arquivos: 11

const CONFIG = {
    // Estrutura de dados: data -> step -> nível -> caminho do arquivo
    data: {
        "20251109": {
                "0": {
                        "150": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level150hPa.tif",
                        "200": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level200hPa.tif",
                        "250": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level250hPa.tif",
                        "300": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level300hPa.tif",
                        "400": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level400hPa.tif",
                        "500": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level500hPa.tif",
                        "600": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level600hPa.tif",
                        "700": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level700hPa.tif",
                        "800": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level800hPa.tif",
                        "900": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level900hPa.tif",
                        "950": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level950hPa.tif"
                }
        }
},
    
    // Níveis de pressão disponíveis (hPa)
    levels: [950, 900, 800, 700, 600, 500, 400, 300, 250, 200, 150],
    
    // Configurações do mapa
    map: {
        center: [-15, -50],  // Centro da América do Sul
        zoom: 3,
        maxZoom: 10,
        minZoom: 3
    },
    
    // Configurações de animação
    animation: {
        interval: 1000  // ms entre frames
    },
    
    // Paleta de cores (viridis por padrão)
    colorScale: 'viridis',
    
    // Threshold de transparência: valores <= este serão transparentes (0..1)
    // 0 = apenas zero exato é transparente
    transparentZeroThreshold: 0,
    
    // Percentual visual da faixa transparente na legenda (0..100)
    // Se omitido, será calculado automaticamente com base no threshold
    //legendTransparentPercent: 10
};
