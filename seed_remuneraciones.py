import django
import os
import sys

# Add the current directory to sys.path to allow absolute imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from remuneraciones.models import MapeoBanco, MapeoMedioPago, MapeoBancoDirecto, ValeVistaConfig

BANK_CODE_MAP = {
    "BANCO BICE": "028",
    "BANCO CONSORCIO": "055",
    "BANCO DE CHILE-A EDWARDS-CITI": "001",
    "BCI-TBANC": "016",
    "BANCO ESTADO": "012",
    "BANCO FALABELLA": "051",
    "BANCO INTERNACIONAL": "009",
    "BANK BOSTON - ITAU": "039",
    "BANCO RIPLEY": "053",
    "BANCO SANTANDER - SANTIAGO": "037",
    "BANCO SECURITY": "049",
    "CAJA DE COMPENSACION LOS HEROES": "729",
    "BANCO COOPEUCH": "672",
    "HSBC BANK CHILE": "031",
    "BANCO SCOTIABANK": "014",
    "TENPO PREGAGO": "730",
    "CAJA DE COMPENSACION LOS ANDES-CUEN TAP": "732",
    "MERCADO PAGO": "875",
}

PAYMENT_METHOD_MAP = {
    "CUENTA PRIMA": "01",
    "CUENTA CORRIENTE / VISTA": "01",
    "CUENTA RUT": "30",
    "CUENTA DE AHORRO": "02",
    "CHEQUERA ELECTRONICA": "22",
}

DIRECT_BANK_CODE_MAP = {
    "1": "001",
    "01": "001",
    "12": "012",
    "14": "014",
    "16": "016",
    "28": "028",
    "37": "037",
    "39": "039",
    "51": "051",
    "53": "053",
    "55": "055",
    "672": "672",
    "729": "729",
    "730": "730",
    "732": "732",
}

def seed():
    print("Seeding Bank Code Map...")
    for k, v in BANK_CODE_MAP.items():
        MapeoBanco.objects.get_or_create(nombre=k, defaults={'codigo': v})

    print("Seeding Payment Method Map...")
    for k, v in PAYMENT_METHOD_MAP.items():
        MapeoMedioPago.objects.get_or_create(nombre=k, defaults={'codigo': v})

    print("Seeding Direct Bank Code Map...")
    for k, v in DIRECT_BANK_CODE_MAP.items():
        MapeoBancoDirecto.objects.get_or_create(segmento=k, defaults={'codigo_completo': v})

    print("Seeding Vale Vista Config...")
    ValeVistaConfig.objects.get_or_create(clave="VALE_VISTA_COL_7", defaults={'valor': "29", 'descripcion': "Columna 7 (Código Operación?)"})
    ValeVistaConfig.objects.get_or_create(clave="VALE_VISTA_COL_8", defaults={'valor': "012", 'descripcion': "Columna 8 (Banco?) "})
    ValeVistaConfig.objects.get_or_create(clave="VALE_VISTA_COL_9", defaults={'valor': "0", 'descripcion': "Columna 9"})

    print("Done!")

if __name__ == "__main__":
    seed()
