#!/usr/bin/env python3
"""
Gera configuração JavaScript (config.js) para o visualizador web
baseado nos arquivos GeoTIFF encontrados na pasta data/.
"""

import json
import re
from pathlib import Path
from collections import defaultdict
from datetime import datetime

def parse_tif_filename(filename):
    """Parse do nome do arquivo TIF para extrair data, step e nível."""
    # Padrão: icing_20251109T00_step0h_20251109T00_level150hPa.tif
    # Formato: icing_YYYYMMDDTHH_stepXh_YYYYMMDDTHH_levelYhPa.tif
    pattern = r"icing_(\d{8}T\d{2})_step(\d+)h_\d{8}T\d{2}_level(\d+)hPa\.tif"
    match = re.match(pattern, filename)
    
    if match:
        date_str = match.group(1)[:8]  # YYYYMMDD (primeira data - forecast time)
        step = match.group(2)  # step em horas
        level = match.group(3)  # nível de pressão
        return date_str, step, level
    return None

def generate_config(viewer_dir="."):
    """Gera o arquivo config.js baseado nos TIFs existentes."""
    
    viewer_path = Path(viewer_dir)
    data_path = viewer_path / "data"
    
    if not data_path.exists():
        print(f"❌ Diretório de dados não encontrado: {data_path}")
        print(f"   Criando diretório...")
        data_path.mkdir(parents=True, exist_ok=True)
        print(f"   ✓ Diretório criado. Adicione seus GeoTIFFs em {data_path}")
        return
    
    data_structure = defaultdict(lambda: defaultdict(dict))
    
    # Varre todos os arquivos TIF
    tif_files = list(data_path.rglob("*.tif"))
    
    if not tif_files:
        print(f"⚠️  Nenhum arquivo TIF encontrado em {data_path}")
        print(f"   Adicione seus GeoTIFFs seguindo o padrão:")
        print(f"   data/YYYYMMDD/step_Xh/icing_YYYYMMDDTHh_stepXh_levelYhPa.tif")
        return
    
    for tif_file in tif_files:
        parsed = parse_tif_filename(tif_file.name)
        if parsed:
            date, step, level = parsed
            # Caminho relativo ao index.html
            rel_path = tif_file.relative_to(viewer_path)
            data_structure[date][step][level] = str(rel_path).replace("\\", "/")
        else:
            print(f"⚠️  Arquivo não corresponde ao padrão: {tif_file.name}")
    
    if not data_structure:
        print("❌ Nenhum arquivo válido encontrado!")
        return
    
    # Extrai lista de níveis únicos
    levels = set()
    for date_data in data_structure.values():
        for step_data in date_data.values():
            levels.update(step_data.keys())
    levels = sorted([int(l) for l in levels], reverse=True)
    
    # Gera JavaScript
    config_js = f"""// Configuração gerada automaticamente por generate_config.py
// Última atualização: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
// Total de arquivos: {sum(len(steps) for date in data_structure.values() for steps in date.values())}

const CONFIG = {{
    // Estrutura de dados: data -> step -> nível -> caminho do arquivo
    data: {json.dumps(dict(data_structure), indent=8)},
    
    // Níveis de pressão disponíveis (hPa)
    levels: {json.dumps(levels)},
    
    // Configurações do mapa
    map: {{
        center: [-15, -50],  // Centro da América do Sul
        zoom: 4,
        maxZoom: 10,
        minZoom: 3
    }},
    
    // Configurações de animação
    animation: {{
        interval: 1000  // ms entre frames
    }},
    
    // Paleta de cores (viridis por padrão)
    colorScale: 'viridis'
}};
"""
    
    # Salva config.js
    js_path = viewer_path / "js"
    js_path.mkdir(exist_ok=True)
    
    config_file = js_path / "config.js"
    config_file.write_text(config_js, encoding="utf-8")
    
    print(f"✓ Configuração gerada: {config_file}")
    print(f"  📅 Datas encontradas: {len(data_structure)} - {', '.join(sorted(data_structure.keys()))}")
    print(f"  📊 Níveis: {levels}")
    print(f"  📁 Total de arquivos: {sum(len(steps) for date in data_structure.values() for steps in date.values())}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Gera config.js para o visualizador ECMWF Icing",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python generate_config.py
  python generate_config.py --viewer-dir ../ecmwf-layer-viewer
        """
    )
    parser.add_argument(
        "--viewer-dir",
        default=".",
        help="Diretório do repositório visualizador (padrão: diretório atual)"
    )
    
    args = parser.parse_args()
    generate_config(args.viewer_dir)

