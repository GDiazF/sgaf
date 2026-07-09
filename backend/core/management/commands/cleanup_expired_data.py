from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import EmailOTP, MFASession
import datetime

class Command(BaseCommand):
    help = "Purges expired transient privacy data (EmailOTP and MFASession) from database to satisfy Art. 14 bis (retention policy)."

    def handle(self, *args, **options):
        now = timezone.now()
        
        # 1. Purge OTPs older than 1 hour
        otp_cutoff = now - datetime.timedelta(hours=1)
        deleted_otps, _ = EmailOTP.objects.filter(created_at__lt=otp_cutoff).delete()
        self.stdout.write(self.style.SUCCESS(f"Purged {deleted_otps} expired EmailOTP records."))

        # 2. Purge expired MFA Sessions
        deleted_sessions, _ = MFASession.objects.filter(expires_at__lt=now).delete()
        self.stdout.write(self.style.SUCCESS(f"Purged {deleted_sessions} expired MFASession records."))
