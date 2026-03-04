"""
Management command para cargar el personal TI desde el Excel.
Busca los establecimientos por RBD. Si no existe el RBD exacto,
intenta buscar por nombre parcial. Reporta los casos no encontrados.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from establecimientos.models import Establecimiento
from personal_ti.models import PersonalTI


# ── Mapa de función Excel → código del modelo ──────────────────────────────
FUNCION_MAP = {
    'TECNICO DE ENLACES':       'TECNICO_ENLACES',
    'TECNICO ENLACES':          'TECNICO_ENLACES',
    'TECNICO DE ENLACE':        'TECNICO_ENLACES',
    'TECNICO/A ENLACES':        'TECNICO_A_ENLACES',
    'TECNICO/A ENLACE':         'TECNICO_A_ENLACES',
    'COORDINADOR(A) DE ENLACES':'COORDINADOR_ENLACES',
    'COORDINADOR DE ENLACES':   'COORDINADOR_ENLACES',
    'ENCARGADO(A) ENLACE':      'ENCARGADO_ENLACE',
    'ENCARGADO ENLACE':         'ENCARGADO_ENLACE',
}

# ── Mapa de contrato Excel → código del modelo ─────────────────────────────
CONTRATO_MAP = {
    '24_PROFESOR TITULAR':                      '24',
    '25_PROFESOR CONTRATA':                     '25',
    '27_ASISTENTES EDUCACIÓN PLAZO FIJO':       '27',
    '28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO': '28',
    '24_PROFESOR TITULAR':                       '24',
}

# ── Datos extraídos de la imagen Excel ────────────────────────────────────
# Formato: (RBD, nombre_establecimiento, funcion_raw, rut, nombre_completo, contrato_raw)
DATOS = [
    (97,    "INST. COM. DE IQUIQUE BALDOMERO WOLNITZKY",          "TECNICO DE ENLACES",        "20756650-0", "AMARO ANDRES LOPEZ SALAS",                         "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (107,   "LICEO LIBERT. GRAL.BERNARDO O' HIGGINS",             "TECNICO ENLACES",           "18265400-0", "YENDERY ANDREA VERA SOZA",                         "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (12538, "ESCUELA CHIPANA",                                    "COORDINADOR(A) DE ENLACES", "13365032-6", "XIMENA ELISA RUIZ OGAZ",                           "25_PROFESOR CONTRATA"),
    (123,   "COLEGIO ESPAÑA",                                     "TECNICO DE ENLACES",        "20504575-9", "VICTOR HUGO MANCHEGO CASTILLO",                    "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (122,   "ESCUELA THILDA PORTILLO OLIVARES",                   "COORDINADOR(A) DE ENLACES", "12439288-8", "SERGIO ENRIQUEZ RUIZ OLIVOS",                      "24_PROFESOR TITULAR"),
    (122,   "ESCUELA THILDA PORTILLO OLIVARES",                   "TECNICO DE ENLACE",         "18128661-K", "SEBASTIAN ALBERTO SANCHEZ SUAZO",                  "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (111,   "ESCUELA GABRIELA MISTRAL",                           "COORDINADOR(A) DE ENLACES", "10904410-5", "ROMAN ENRIQUE DELGADO MATURANA",                   "24_PROFESOR TITULAR"),
    (124,   "LICEO LUIS CRUZ MARTINEZ",                           "TECNICO DE ENLACES",        "21665122-7", "ROCIO BELEN MORAN PUEBLA",                         "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (124,   "LICEO LUIS CRUZ MARTINEZ",                           "COORDINADOR(A) DE ENLACES", "10830545-2", "RICARDO ANTONIO ARNES CESPEDES",                   "24_PROFESOR TITULAR"),
    (119,   "ESCUELA CENTENARIO",                                 "TECNICO DE ENLACES",        "10161044-6", "RENE ARTURO BALBONTIN ECHEVERRIA",                 "25_PROFESOR CONTRATA"),
    (40429, "LICEO TECNICO PROFESIONAL DE ADULTOS",               "TECNICO DE ENLACES",        "21791842-1", "PEDRO IVAN ARISMENDI LIENDO",                      "27_ASISTENTES EDUCACIÓN PLAZO FIJO"),
    (10916, "ESCUELA CALETA CHANAVAYITA",                         "COORDINADOR(A) DE ENLACES", "13008314-5", "PATRICIA ALEJANDRA SAUMANN GALLARDO",               "25_PROFESOR CONTRATA"),
    (12758, "LICEO C.E.I.A. JOSE ALEJANDRO SORIA VARAS",         "TECNICO DE ENLACES",        "20657086-5", "MAYKOL ANTONIO MACPHERZO CAYO",                    "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (123,   "COLEGIO ESPAÑA",                                     "COORDINADOR(A) DE ENLACES", "13413616-2", "MARIO RENE CAIPA AVALOS",                          "24_PROFESOR TITULAR"),
    (12758, "LICEO C.E.I.A. JOSE ALEJANDRO SORIA VARAS",         "COORDINADOR(A) DE ENLACES", "14121717-8", "MARCO ANTONIO SANTANDER ALFARO",                   "24_PROFESOR TITULAR"),
    (125,   "ESCUELA PROFESOR MANUEL CASTRO RAMOS",               "COORDINADOR(A) DE ENLACES", "16349481-7", "MARCO ANTONIO JESUS AREVALO CORTES",               "25_PROFESOR CONTRATA"),
    (114,   "ESCUELA PLACIDO VILLARROEL",                         "COORDINADOR(A) DE ENLACES", "18899732-5", "LUIS ENRIQUE CASTILLO GODOY",                      "25_PROFESOR CONTRATA"),
    (102,   "ESC.EDUC.ESPECIAL FLOR DEL INCA",                   "COORDINADOR(A) DE ENLACES", "12437012-4", "LORENA DEL CARMEN VILCA GARCIA",                   "24_PROFESOR TITULAR"),
    (97,    "INST. COM. DE IQUIQUE BALDOMERO WOLNITZKY",          "COORDINADOR(A) DE ENLACES", "7237002-3",  "JUAN CARLOS MARTINEZ ACUÑA",                       "24_PROFESOR TITULAR"),
    (40429, "LICEO TECNICO PROFESIONAL DE ADULTOS",               "COORDINADOR(A) DE ENLACES", "7084647-0",  "LEONARDO JOAQUIN FIBLAS ARAMAYO",                  "24_PROFESOR TITULAR"),
    (40429, "LICEO TECNICO PROFESIONAL DE ADULTOS",               "COORDINADOR(A) DE ENLACES", "7084647-0",  "LEONARDO JOAQUIN FIBLAS ARAMAYO",                  "25_PROFESOR CONTRATA"),
    (109,   "COLEGIO DEPORTIVO TEC. PROF. ELENA DUVAUCHELLE CABEZON", "TECNICO/A ENLACES",    "19434370-1", "KIMBERLY VANESSA ESCOBAR GALLEGUILLOS",             "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (126,   "COLEGIO REPUBLICA DE ITALIA",                        "TECNICO DE ENLACE",         "18007155-5", "KATHERINE ANDREA TORRES DIAZ",                     "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (108,   "LICEO POLITEC. JOSE GUTIERREZ DE LA FUEN",           "COORDINADOR(A) DE ENLACES", "12835558-8", "JUAN HUMBERTO GARCES MARCHANT",                    "24_PROFESOR TITULAR"),
    (12542, "ESCUELA CALETA SAN MARCOS",                          "COORDINADOR(A) DE ENLACES", "14106089-9", "JUAN CARLOS SILVA MENA",                           "25_PROFESOR CONTRATA"),
    (102,   "ESC.EDUC.ESPECIAL FLOR DEL INCA",                   "TECNICO DE ENLACES",        "18899426-1", "JOSE MIGUEL ORUE TAPIA",                           "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (112,   "ESCUELA EDUARDO LLANOS",                             "TECNICO DE ENLACES",        "19737992-8", "JORDAN PATRICIO JORQUERA ORTIZ",                   "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (116,   "COLEGIO REPUBLICA DE CROACIA",                       "COORDINADOR(A) DE ENLACES", "13866987-4", "JONATHAN ANDRES GUILLEN COFRE",                    "25_PROFESOR CONTRATA"),
    (110,   "LICEO BICENTENARIO DOMINGO SANTA MARIA DE IQQ.",     "COORDINADOR(A) DE ENLACES", "18143732-4", "JAVIERA ALEJANDRA PEÑA SALAS",                     "24_PROFESOR TITULAR"),
    (103,   "ESC.EDUC.GRAL.BAS.Y DES.ART.VIOLETA PARRA",         "COORDINADOR(A) DE ENLACES", "12835324-0", "JAVIER ANTONIO CABRERA ZEPEDA",                    "24_PROFESOR TITULAR"),
    (107,   "LICEO LIBERT. GRAL.BERNARDO O' HIGGINS",             "TECNICO ENLACES",           "21307295-1", "JAVIER ALEJANDRO PEÑA ESCALANTE",                  "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (126,   "COLEGIO REPUBLICA DE ITALIA",                        "COORDINADOR(A) DE ENLACES", "10197582-7", "GUADALUPE DEL CARMEN PEYRAU NORAMBUENA",            "24_PROFESOR TITULAR"),
    (107,   "LICEO LIBERT. GRAL.BERNARDO O' HIGGINS",             "COORDINADOR(A) DE ENLACES", "15000039-4", "GONZALO ANTONIO VARAS TAPIA",                      "24_PROFESOR TITULAR"),
    (116,   "COLEGIO REPUBLICA DE CROACIA",                       "TECNICO DE ENLACE",         "17799538-K", "FELIPE ANDRES LOPEZ BRUNA",                        "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (119,   "ESCUELA CENTENARIO",                                 "COORDINADOR(A) DE ENLACES", "16350027-2", "FABIOLA ANDREA MORENO MARQUEZ",                    "25_PROFESOR CONTRATA"),
    (107,   "LICEO LIBERT. GRAL.BERNARDO O' HIGGINS",             "TECNICO ENLACES",           "26558985-5", "ESTRELLA MARINA BERNAL ESTRADA",                   "27_ASISTENTES EDUCACIÓN PLAZO FIJO"),
    (111,   "ESCUELA GABRIELA MISTRAL",                           "TECNICO ENLACES",           "17798098-6", "DIEGO FELIPE BARRAZA SANCHEZ",                     "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (112,   "ESCUELA EDUARDO LLANOS",                             "TECNICO DE ENLACES",        "19432735-8", "DAVID FERNANDO FERNANDEZ MALEBRAN",                "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (117,   "ESCUELA PAULA JARAQUEMADA ALQUIZAR",                 "COORDINADOR(A) DE ENLACES", "10742136-K", "DAISY GERALDINA PAEZ ROJAS",                       "25_PROFESOR CONTRATA"),
    (12538, "ESCUELA CHIPANA",                                    "TECNICO DE ENLACE",         "14105672-7", "CLAUDIO ANTONIO BRAVO PONCE",                      "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (116,   "COLEGIO REPUBLICA DE CROACIA",                       "COORDINADOR(A) DE ENLACES", "16593893-3", "CLAUDIA ANDREA ARAVENA TIRADO",                    "25_PROFESOR CONTRATA"),
    (113,   "ESCUELA ALMIRANTE PATRICIO LYNCH",                   "ENCARGADO(A) ENLACE",       "17430834-9", "CATALINA VALENTINA DEL CARMEN LAFUENTE VALDIVIA",  "24_PROFESOR TITULAR"),
    (126,   "COLEGIO REPUBLICA DE ITALIA",                        "TECNICO DE ENLACE",         "21450823-0", "CAROLINA ISABEL VILCHES GUTIERREZ",                "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (117,   "ESCUELA PAULA JARAQUEMADA ALQUIZAR",                 "TECNICO DE ENLACES",        "20729667-8", "BRYAN ALEJANDRO CONTRERAS VILLAGRA",               "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (97,    "INST. COM. DE IQUIQUE BALDOMERO WOLNITZKY",          "TECNICO DE ENLACES",        "17861014-7", "WILLIAMS ALEJANDRO GODOY DIAZ",                    "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (108,   "LICEO POLITEC. JOSE GUTIERREZ DE LA FUEN",           "TECNICO DE ENLACES",        "15686764-0", "ALONSO PATRICIO ALFONSO CISTERNAS SUAREZ",         "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (124,   "LICEO LUIS CRUZ MARTINEZ",                           "TECNICO DE ENLACES",        "19432947-4", "ALEXSANDER SEBASTIAN IGNACIO RODRIGUEZ",           "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
    (125,   "ESCUELA PROFESOR MANUEL CASTRO RAMOS",               "TECNICO DE ENLACES",        "19180413-9", "ALEJANDRO ENRIQUE MONTALVAN MALLEGAS",             "28_ASISTENTES EDUCACIÓN PLAZO INDEFINIDO"),
]


def buscar_establecimiento(rbd, nombre_excel):
    """Busca el establecimiento por RBD exacto; si no lo encuentra, por RBD en los nombres existentes."""
    # 1. Búsqueda por RBD exacto
    qs = Establecimiento.objects.filter(rbd=rbd)
    if qs.exists():
        return qs.first(), None

    # 2. Si no hay RBD, avisar para crearlo
    return None, f"RBD {rbd} no encontrado — E.E: «{nombre_excel}»"


class Command(BaseCommand):
    help = "Carga el personal TI desde el Excel de la imagen proporcionada."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula la carga sin guardar en base de datos.',
        )
        parser.add_argument(
            '--limpiar',
            action='store_true',
            help='Elimina todos los registros de PersonalTI antes de cargar.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limpiar = options['limpiar']

        if dry_run:
            self.stdout.write(self.style.WARNING("⚠️  MODO DRY-RUN — sin cambios en la BD"))

        if limpiar and not dry_run:
            eliminados, _ = PersonalTI.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"🗑️  Se eliminaron {eliminados} registros previos."))

        creados = 0
        duplicados = 0
        errores = []

        with transaction.atomic():
            for (rbd, nombre_excel, funcion_raw, rut, nombre, contrato_raw) in DATOS:

                # Mapear función
                funcion = FUNCION_MAP.get(funcion_raw.strip().upper())
                if not funcion:
                    funcion = FUNCION_MAP.get(funcion_raw.strip())
                if not funcion:
                    errores.append(f"  Función desconocida: «{funcion_raw}» ({nombre})")
                    continue

                # Mapear contrato
                contrato = CONTRATO_MAP.get(contrato_raw.strip())
                if not contrato:
                    errores.append(f"  Contrato desconocido: «{contrato_raw}» ({nombre})")
                    continue

                # Buscar establecimiento
                estab, error_msg = buscar_establecimiento(rbd, nombre_excel)
                if error_msg:
                    errores.append(f"  {error_msg}")
                    if not dry_run:
                        continue
                    else:
                        self.stdout.write(self.style.WARNING(f"  SKIP: {error_msg}"))
                        continue

                # Verificar duplicado (mismo RUT + mismo establecimiento + misma función)
                if PersonalTI.objects.filter(
                    rut=rut,
                    establecimiento=estab,
                    funcion=funcion
                ).exists():
                    duplicados += 1
                    self.stdout.write(f"  ⤷ Duplicado omitido: {nombre} [{rut}] en {estab.nombre}")
                    continue

                if not dry_run:
                    PersonalTI.objects.create(
                        establecimiento=estab,
                        funcion=funcion,
                        rut=rut,
                        nombre_completo=nombre,
                        tipo_contrato=contrato,
                        activo=True,
                    )

                creados += 1
                self.stdout.write(f"  ✔ {'[DRY] ' if dry_run else ''}Creado: {nombre} — {estab.nombre}")

            if dry_run:
                raise Exception("DRY RUN — no se confirman cambios.")  # rollback

        # Resumen
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"✅ Registros creados : {creados}"))
        self.stdout.write(self.style.WARNING(f"⚠️  Duplicados omitidos: {duplicados}"))
        if errores:
            self.stdout.write(self.style.ERROR(f"❌ Errores ({len(errores)}):"))
            for e in errores:
                self.stdout.write(self.style.ERROR(e))
        else:
            self.stdout.write(self.style.SUCCESS("   Sin errores de mapeo."))
