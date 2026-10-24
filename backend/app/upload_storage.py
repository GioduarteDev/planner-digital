import os
from importlib import import_module
from contextlib import contextmanager
from functools import lru_cache
from mimetypes import guess_type
from pathlib import Path
from shutil import copyfile
from tempfile import SpooledTemporaryFile


UPLOAD_ROOT = Path(__file__).resolve().parents[1] / "uploads"

CATEGORIES = {
    "profile",
    "page_media",
    "media_library",
    "canvas_media",
    "template_media",
    "template_canvas_media",
}


def _error_code(error):
    return str(
        getattr(error, "response", {})
        .get("Error", {})
        .get("Code", "")
    )


def use_cloud():
    endpoint = os.getenv("AWS_ENDPOINT_URL_S3")
    access_key = os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")

    if os.getenv("APP_ENV") == "production":
        if not all((endpoint, access_key, secret_key)):
            raise RuntimeError(
                "Neon Storage precisa estar configurado em produção."
            )

    if any((endpoint, access_key, secret_key)):
        if not all((endpoint, access_key, secret_key)):
            raise RuntimeError(
                "As credenciais do Neon Storage estão incompletas."
            )

    return bool(endpoint)


@lru_cache(maxsize=1)
def s3_client():
    try:
        boto3 = import_module("boto3")
        from botocore.config import Config
    except ModuleNotFoundError as error:
        raise RuntimeError(
            "O armazenamento em nuvem requer a dependência boto3."
        ) from error

    return boto3.client(
        "s3",
        endpoint_url=os.environ["AWS_ENDPOINT_URL_S3"],
        region_name=os.getenv("AWS_REGION", "us-east-2"),
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
        ),
    )

def bucket_name():
    return os.getenv("UPLOADS_S3_BUCKET", "matcha-uploads")


def object_key(path):
    try:
        relative = Path(path).resolve().relative_to(
            UPLOAD_ROOT.resolve()
        )
    except ValueError as error:
        raise ValueError("Caminho de upload inválido.") from error

    if len(relative.parts) != 2:
        raise ValueError("Estrutura de upload inválida.")

    category, filename = relative.parts

    if category not in CATEGORIES:
        raise ValueError("Categoria inválida.")

    if (
        not filename
        or len(filename) > 255
        or filename in {".", ".."}
        or filename.rstrip(" .") != filename
        or any(c in filename for c in ("/", "\\", ":", "\x00"))
    ):
        raise ValueError("Nome de arquivo inválido.")

    return f"{category}/{filename}"


def file_exists(path):
    key = object_key(path)

    if not use_cloud():
        return Path(path).is_file()

    try:
        s3_client().head_object(
            Bucket=bucket_name(),
            Key=key,
        )
        return True

    except Exception as error:
        code = _error_code(error)
        if code in {"404", "NoSuchKey", "NotFound"}:
            return False

        raise


def delete_file(path):
    key = object_key(path)

    if not use_cloud():
        Path(path).unlink(missing_ok=True)
        return

    s3_client().delete_object(
        Bucket=bucket_name(),
        Key=key,
    )


def copy_file(source, destination):
    source_key = object_key(source)
    destination_key = object_key(destination)

    if not use_cloud():
        Path(destination).parent.mkdir(
            parents=True,
            exist_ok=True,
        )
        copyfile(source, destination)
        return

    s3_client().copy_object(
        Bucket=bucket_name(),
        Key=destination_key,
        CopySource={
            "Bucket": bucket_name(),
            "Key": source_key,
        },
    )


@contextmanager
def write_file(path, content_type=None):
    key = object_key(path)

    if not use_cloud():
        Path(path).parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        with Path(path).open("wb") as output:
            yield output

        return

    mime = (
        content_type
        or guess_type(Path(path).name)[0]
        or "application/octet-stream"
    )

    with SpooledTemporaryFile(
        mode="w+b",
        max_size=8 * 1024 * 1024,
    ) as output:
        yield output

        output.seek(0)

        s3_client().put_object(
            Bucket=bucket_name(),
            Key=key,
            Body=output,
            ContentType=mime,
        )


def open_file(path):
    key = object_key(path)

    if not use_cloud():
        return Path(path).open("rb")

    try:
        response = s3_client().get_object(
            Bucket=bucket_name(),
            Key=key,
        )
        return response["Body"]

    except Exception as error:
        code = _error_code(error)
        if code in {"404", "NoSuchKey", "NotFound"}:
            raise FileNotFoundError(key) from error

        raise


def file_size(path: Path) -> int:
    if use_cloud():
        response = s3_client().head_object(
            Bucket=bucket_name(),
            Key=object_key(path),
        )
        return int(response["ContentLength"])

    return path.stat().st_size