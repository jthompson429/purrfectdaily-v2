# PurrTaskDaily

PurrTaskDaily is a collaborative pet-care web application for households, foster families, and rescue organizations. It helps teams coordinate daily care while reducing missed, duplicated, or memory-dependent work.

## Core capabilities

- At-a-glance care dashboard focused on current, upcoming, and overdue needs
- Pet profiles and shared medical history
- Scheduled care tasks with completion records and exception reporting
- Medication schedules, dose tracking, and duplicate prevention
- Vaccinations, preventatives, veterinary visits, reminders, and follow-ups
- Neonatal and foster care, including groups, kittens, feeding schedules, and growth tracking
- Digital Clipboard for workspace handoffs and urgent care communication
- Emergency information and workspace-specific escalation instructions
- Role-based workspaces for owners, administrators, caregivers, and viewers
- Optional workspace branding for households and rescue organizations

## Product links

- Application: [purrtaskdaily.com](https://purrtaskdaily.com)
- How-to guide: [how-to.purrtaskdaily.com](https://how-to.purrtaskdaily.com)
- Questions and support: [no-reply@purrtaskdaily.com](mailto:no-reply@purrtaskdaily.com)

## Technology

The frontend is built with React and Vite. Application data, authentication, file storage, integrations, backend functions, and entity schemas are provided through Base44.

Key application resources are organized under:

- `src/pages/` — route-level screens
- `src/components/` — shared interface and feature components
- `src/lib/` — application services and workspace context
- `base44/entities/` — data schemas and row-level security
- `base44/functions/` — permission-aware backend operations

## Local development

Install dependencies:

```bash
npm install
```

Create an `.env.local` file with the Base44 application configuration:

```text
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

## Security and privacy

PurrTaskDaily uses authenticated, role-based workspaces. Workspace-scoped records are protected by entity rules and permission-aware backend operations. Do not commit credentials, private keys, production environment files, or exported animal and caregiver data to this repository.

Urgent Clipboard email notifications intentionally omit workspace, pet, author, and medical details; recipients must sign in to review the item securely.

## Project status

The application is in active pre-release testing with rescue and household workflows. Product feedback and operational questions can be sent to [no-reply@purrtaskdaily.com](mailto:no-reply@purrtaskdaily.com).
