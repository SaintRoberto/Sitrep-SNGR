import csv
import hashlib
import io
import os
import re
import sys
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=BACKEND_DIR / ".env", override=True)

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.config import Config
from core.extensions import get_db_connection, init_db


# ============================================================
# CONFIGURACIÓN GOOGLE SHEET
# ============================================================

SPREADSHEET_ID = os.getenv("CUERPOS_HIDRICOS_SPREADSHEET_ID", "").strip()
GID = os.getenv("CUERPOS_HIDRICOS_SPREADSHEET_GID", "0").strip()

CSV_URL = (
    f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}"
    f"/export?format=csv&gid={GID}"
)


TABLE_NAME = "monitoreo_cuerpos_hidricos"
HASH_FILE = BACKEND_DIR / ".cuerpos_hidricos.sha256"


# ============================================================
# FUNCIONES DE LIMPIEZA
# ============================================================

def clean_text(value):
    """
    Convierte valores vacíos en None y limpia espacios.
    """
    if value is None:
        return None

    value = str(value).strip()

    if not value:
        return None

    return value


def parse_date(value):
    """
    Convierte las fechas del Sheet a YYYY-MM-DD.
    Acepta varios formatos.
    """
    value = clean_text(value)

    if not value:
        return None

    formatos = [
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y-%m-%d",
        "%d/%m/%y",
        "%d-%m-%y",
    ]

    for formato in formatos:
        try:
            return datetime.strptime(value, formato).date()
        except ValueError:
            pass

    print(f"[WARN] Fecha no reconocida: {value}")
    return None


def parse_time(value):
    """
    Convierte horas como:
    10:30
    6:45
    20:49
    """
    value = clean_text(value)

    if not value:
        return None

    formatos = [
        "%H:%M",
        "%H:%M:%S",
        "%I:%M %p",
    ]

    for formato in formatos:
        try:
            return datetime.strptime(value, formato).time()
        except ValueError:
            pass

    print(f"[WARN] Hora no reconocida: {value}")
    return None


def parse_coordinates(value):
    """
    Intenta recuperar latitud y longitud incluso con algunos
    formatos incorrectos existentes en el Sheet.

    Ejemplos:

    -2.8792791901003265, -78.96743789592637
    -2.869569, -78,920372
    -2.895145. -78.775134
    """

    value = clean_text(value)

    if not value:
        return None, None

    value = (
        value
        .replace("−", "-")
        .replace("–", "-")
        .replace(";", " ")
    )

    # Encuentra números positivos/negativos con punto o coma decimal.
    numbers = re.findall(
        r"[-+]?\d+(?:[.,]\d+)?",
        value
    )

    if len(numbers) < 2:
        print(f"[WARN] Coordenada no reconocida: {value}")
        return None, None

    try:
        latitud = float(numbers[0].replace(",", "."))
        longitud = float(numbers[1].replace(",", "."))

        # Validación geográfica básica
        if not (-90 <= latitud <= 90):
            print(
                f"[WARN] Latitud fuera de rango: "
                f"{value} -> {latitud}"
            )
            return None, None

        if not (-180 <= longitud <= 180):
            print(
                f"[WARN] Longitud fuera de rango: "
                f"{value} -> {longitud}"
            )
            return None, None

        return latitud, longitud

    except ValueError:
        print(f"[WARN] Error convirtiendo coordenadas: {value}")
        return None, None


# ============================================================
# DESCARGAR GOOGLE SHEET
# ============================================================

def descargar_sheet():
    if not SPREADSHEET_ID:
        raise RuntimeError(
            "Falta configurar CUERPOS_HIDRICOS_SPREADSHEET_ID en public_backend/.env"
        )

    print("Descargando Google Sheet...")

    response = requests.get(
        CSV_URL,
        timeout=60
    )

    response.raise_for_status()

    content_type = response.headers.get(
        "Content-Type",
        ""
    ).lower()

    # Esto normalmente significa que Google mandó a login
    if "text/html" in content_type:
        raise RuntimeError(
            "\nGoogle devolvió HTML en lugar del CSV.\n"
            "Probablemente la hoja no es accesible públicamente.\n"
            "En ese caso debemos usar la API de Google Sheets "
            "con credenciales.\n"
        )

    response.encoding = "utf-8"

    csv_content = response.text
    content_hash = hashlib.sha256(
        csv_content.encode("utf-8")
    ).hexdigest()

    reader = csv.DictReader(
        io.StringIO(csv_content)
    )

    rows = list(reader)

    print(f"Filas encontradas: {len(rows)}")

    return rows, content_hash


def leer_hash_anterior():
    if not HASH_FILE.exists():
        return None

    return HASH_FILE.read_text(
        encoding="utf-8"
    ).strip() or None


def guardar_hash(content_hash):
    temporary_file = HASH_FILE.with_suffix(
        f"{HASH_FILE.suffix}.tmp"
    )
    temporary_file.write_text(
        f"{content_hash}\n",
        encoding="utf-8",
    )
    temporary_file.replace(HASH_FILE)


# ============================================================
# TRANSFORMAR FILAS
# ============================================================

def transformar_fila(row, numero_fila):
    try:

        latitud, longitud = parse_coordinates(
            row.get("Latitud_Longitud")
        )

        return (
            clean_text(row.get("Provincia ")),
            clean_text(row.get("Cantón")),
            clean_text(row.get("Parroquía")),
            clean_text(row.get("Sector")),

            parse_date(
                row.get("Fecha del Reporte")
            ),

            parse_time(
                row.get("Hora del Reporte")
            ),

            clean_text(row.get("Tipo ")),
            clean_text(row.get("Nombre de Río")),
            clean_text(row.get("Estado")),

            parse_date(
                row.get("Fecha de Desbordamiento")
            ),

            clean_text(row.get("Antecedente")),
            clean_text(row.get("Acciones ")),

            clean_text(
                row.get("Responsable del Registro")
            ),

            clean_text(
                row.get("Observaciones")
            ),

            clean_text(
                row.get("Codigo R-M Nacional")
            ),

            clean_text(
                row.get("Codigo R-M Nacional2")
            ),

            clean_text(
                row.get(
                    "Novedad Identificada en GeoGlows"
                )
            ),

            parse_date(
                row.get(
                    "Fecha de la novedad identificada en GeoGlows"
                )
            ),

            latitud,
            longitud,
        )

    except Exception as e:
        print(
            f"[ERROR] Fila {numero_fila}: {e}"
        )

        return None


# ============================================================
# SINCRONIZAR MYSQL
# ============================================================

def preparar_registros(rows):
    registros = []
    errores = 0

    for index, row in enumerate(rows, start=2):
        registro = transformar_fila(row, index)

        if registro:
            registros.append((len(registros) + 1, *registro))
        else:
            errores += 1

    print(f"Registros preparados: {len(registros)}")
    print(f"Filas con error: {errores}")

    if errores:
        raise RuntimeError(
            "La sincronización fue cancelada porque existen "
            f"{errores} filas con errores."
        )

    if not registros:
        raise RuntimeError(
            "La hoja no contiene registros válidos. "
            "La tabla MySQL no fue modificada."
        )

    return registros


def importar_mysql(rows):
    registros = preparar_registros(rows)

    init_db({
        "MYSQL_HOST": Config.MYSQL_HOST,
        "MYSQL_PORT": Config.MYSQL_PORT,
        "MYSQL_USER": Config.MYSQL_USER,
        "MYSQL_PASS": Config.MYSQL_PASS,
        "MYSQL_DB": Config.MYSQL_DB,
    })
    connection = get_db_connection()
    connection.autocommit(False)

    try:

        with connection.cursor() as cursor:
            sql = f"""
                INSERT INTO `{TABLE_NAME}` (
                    id,
                    provincia,
                    canton,
                    parroquia,
                    sector,
                    fecha_reporte,
                    hora_reporte,
                    tipo,
                    nombre_rio,
                    estado,
                    fecha_desbordamiento,
                    antecedente,
                    acciones,
                    responsable_registro,
                    observaciones,
                    codigo_rm_nacional,
                    codigo_rm_nacional2,
                    novedad_geoglows,
                    fecha_novedad_geoglows,
                    latitud,
                    longitud
                )
                VALUES (
                    %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s
                )
            """

            print("Sincronizando registros en MySQL...")

            cursor.execute(
                f"DELETE FROM `{TABLE_NAME}`"
            )

            cursor.executemany(
                sql,
                registros
            )

        connection.commit()

        print("")
        print("================================")
        print("IMPORTACIÓN FINALIZADA")
        print("================================")
        print(
            f"Registros sincronizados: "
            f"{len(registros)}"
        )

        return len(registros)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# ============================================================
# MAIN
# ============================================================

def main():

    print("")
    print("================================")
    print("IMPORTACIÓN CUERPOS HÍDRICOS")
    print("================================")
    print("")

    rows, content_hash = descargar_sheet()

    if content_hash == leer_hash_anterior():
        print("Sin cambios en Google Sheet. No se actualizó MySQL.")
        return

    importar_mysql(rows)
    guardar_hash(content_hash)


if __name__ == "__main__":
    main()
