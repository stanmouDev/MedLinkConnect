# MedLink Connect API Documentation

## Authentication
- Session authentication and basic auth are enabled for local development.
- Future production deployments should use JWT or OAuth2 with MFA.

## Resources
- /api/hospitals
- /api/users
- /api/patients
- /api/encounters
- /api/vitals
- /api/appointments
- /api/lab-orders
- /api/prescriptions
- /api/messages
- /api/sync-records
- /api/audit-logs

## Notes
- The API is designed for CRUD operations around core hospital workflows.
- Sync records are used to queue changes for later reconciliation when connectivity is restored.
