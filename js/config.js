// Configuração gerada automaticamente por generate_config.py
// Última atualização: 2025-12-08 09:35:22
// Total de arquivos: 22

const CONFIG = {
    // Estrutura de dados: data -> run_time (horário) -> step -> nível -> caminho do arquivo
    data: {
        "20251109": {
                "12": {
                        "0": {
                                "200": "data/20251109/step_0h/icing_20251109T12_step0h_20251109T12_level200hPa.tif",
                                "300": "data/20251109/step_0h/icing_20251109T12_step0h_20251109T12_level300hPa.tif",
                                "800": "data/20251109/step_0h/icing_20251109T12_step0h_20251109T12_level800hPa.tif",
                                "900": "data/20251109/step_0h/icing_20251109T12_step0h_20251109T12_level900hPa.tif",
                                "150": "data/20251109/step_0h/icing_20251109T12_step0h_20251109T12_level150hPa.tif",
                                "500": "data/20251109/step_0h/icing_20251109T12_step0h_20251109T12_level500hPa.tif",
                                "400": "data/20251109/step_0h/icing_20251109T12_step0h_20251109T12_level400hPa.tif",
                                "600": "data/20251109/step_0h/icing_20251109T12_step0h_20251109T12_level600hPa.tif",
                                "700": "data/20251109/step_0h/icing_20251109T12_step0h_20251109T12_level700hPa.tif",
                                "950": "data/20251109/step_0h/icing_20251109T12_step0h_20251109T12_level950hPa.tif",
                                "250": "data/20251109/step_0h/icing_20251109T12_step0h_20251109T12_level250hPa.tif"
                        }
                },
                "00": {
                        "0": {
                                "700": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level700hPa.tif",
                                "600": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level600hPa.tif",
                                "950": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level950hPa.tif",
                                "250": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level250hPa.tif",
                                "300": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level300hPa.tif",
                                "200": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level200hPa.tif",
                                "900": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level900hPa.tif",
                                "800": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level800hPa.tif",
                                "150": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level150hPa.tif",
                                "400": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level400hPa.tif",
                                "500": "data/20251109/step_0h/icing_20251109T00_step0h_20251109T00_level500hPa.tif"
                        }
                }
        }
    },
    
    // Horários de run disponíveis (HH)
    runTimes: ["00", "12"],
    
    // Níveis de pressão disponíveis (hPa)
    levels: [950, 900, 800, 700, 600, 500, 400, 300, 250, 200, 150],
    
    // Configurações do mapa
    map: {
        center: [-15, -50],  // Centro da América do Sul
        zoom: 4,
        maxZoom: 10,
        minZoom: 3
    },
    
    // Configurações de animação
    animation: {
        interval: 1000  // ms entre frames
    },
    
    // Paleta de cores (viridis por padrão)
    colorScale: 'viridis'
};
