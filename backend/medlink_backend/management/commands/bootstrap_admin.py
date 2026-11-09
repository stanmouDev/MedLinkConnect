import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Create the initial administrator from one-time environment variables'

    def handle(self, *args, **options):
        username = os.environ.get('BOOTSTRAP_ADMIN_USERNAME', '').strip()
        password = os.environ.get('BOOTSTRAP_ADMIN_PASSWORD', '')
        email = os.environ.get('BOOTSTRAP_ADMIN_EMAIL', '').strip()

        if not username or not password:
            self.stdout.write(
                'Administrator bootstrap skipped: set both '
                'BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD to enable it.'
            )
            return

        user_model = get_user_model()
        existing_user = user_model.objects.filter(username=username).first()
        if existing_user:
            if existing_user.is_superuser and existing_user.role == 'administrator':
                self.stdout.write('Bootstrap administrator already exists; no changes made.')
                return
            raise CommandError(
                f'Cannot bootstrap administrator: username "{username}" already exists.'
            )

        if len(password) < 16 or password.casefold() == username.casefold():
            raise CommandError(
                'Bootstrap password must be at least 16 characters and different from the username.'
            )

        user_model.objects.create_superuser(
            username=username,
            password=password,
            email=email,
            role='administrator',
        )
        self.stdout.write('Initial administrator created. Remove the bootstrap variables now.')
