import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from establecimientos.models import Establecimiento

def delete_all():
    count = Establecimiento.objects.count()
    Establecimiento.objects.all().delete()
    print(f"Borrados {count} establecimientos satisfactoriamente.")

if __name__ == "__main__":
    delete_all()
