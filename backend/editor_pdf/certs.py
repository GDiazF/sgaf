import base64
import datetime
import re
import secrets
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import BestAvailableEncryption, pkcs12
from cryptography.x509.oid import NameOID
from django.conf import settings
from django.utils import timezone

from core.utils.encryption import decrypt_value, encrypt_value

from .models import CertificadoFuncionario

VIGENCIA_DIAS = 730
ORG = 'SLEP Iquique'


def private_root() -> Path:
    root = Path(settings.BASE_DIR) / 'private' / 'editor_pdf'
    root.mkdir(parents=True, exist_ok=True)
    return root


def safe_rut(rut: str) -> str:
    cleaned = re.sub(r'[^0-9kK\-]', '', (rut or '').strip())
    if not cleaned:
        raise ValueError('El funcionario no tiene un RUT utilizable.')
    return cleaned


def _ca_paths():
    folder = private_root() / 'ca'
    folder.mkdir(parents=True, exist_ok=True)
    return folder / 'ca.key', folder / 'ca.crt'


def _load_or_create_ca():
    key_path, cert_path = _ca_paths()
    if key_path.exists() and cert_path.exists():
        key = serialization.load_pem_private_key(key_path.read_bytes(), password=None)
        cert = x509.load_pem_x509_certificate(cert_path.read_bytes())
        return key, cert

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, 'CA Editor PDF SLEP Iquique'),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, ORG),
        x509.NameAttribute(NameOID.COUNTRY_NAME, 'CL'),
    ])
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now)
        .not_valid_after(now + datetime.timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_cert_sign=True,
                crl_sign=True,
                content_commitment=False,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .sign(key, hashes.SHA256())
    )
    key_path.write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    return key, cert


def _issue(rut: str, password: str) -> tuple[bytes, datetime.datetime]:
    ca_key, ca_cert = _load_or_create_ca()
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, rut),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, ORG),
        x509.NameAttribute(NameOID.COUNTRY_NAME, 'CL'),
    ])
    now = datetime.datetime.now(datetime.timezone.utc)
    until = now + datetime.timedelta(days=VIGENCIA_DIAS)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(ca_cert.subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now)
        .not_valid_after(until)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=True,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=False,
                crl_sign=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .sign(ca_key, hashes.SHA256())
    )
    blob = pkcs12.serialize_key_and_certificates(
        name=rut.encode('utf-8'),
        key=key,
        cert=cert,
        cas=[ca_cert],
        encryption_algorithm=BestAvailableEncryption(password.encode('utf-8')),
    )
    return blob, until


def certificado_para(rut_raw: str) -> dict:
    rut = safe_rut(rut_raw)
    folder = private_root() / 'certificados'
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f'{rut}.p12'
    now = timezone.now()
    record = CertificadoFuncionario.objects.filter(rut=rut).first()
    reusable = (
        record is not None
        and path.exists()
        and record.valido_hasta > now
    )
    if reusable:
        password = decrypt_value(record.password_cifrada)
        blob = path.read_bytes()
        until = record.valido_hasta
    else:
        password = secrets.token_urlsafe(24)
        blob, until_dt = _issue(rut, password)
        path.write_bytes(blob)
        until = timezone.make_aware(until_dt) if timezone.is_naive(until_dt) else until_dt
        CertificadoFuncionario.objects.update_or_create(
            rut=rut,
            defaults={
                'password_cifrada': encrypt_value(password),
                'valido_hasta': until,
            },
        )
    return {
        'rut': rut,
        'p12_base64': base64.b64encode(blob).decode('ascii'),
        'password': password,
        'valido_hasta': until.isoformat(),
    }
