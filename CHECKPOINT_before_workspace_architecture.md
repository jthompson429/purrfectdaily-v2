# Checkpoint: Before Workspace Architecture
**Date:** 2026-08-04
**Purpose:** Snapshot of app state before introducing Workspace Architecture changes.

## App Identity
- **Name:** Purrfect Daily v2
- **App ID:** 6a712de617e488e601ea5834
- **Config file:** `base44/config.jsonc`

## Pages (src/pages/)
- Home.jsx — landing / entry
- Dashboard.jsx — mission-based care dashboard with XP rewards & proof photos
- PetProfile.jsx — per-pet health profile (care status, reminders, medical timeline)
- Emergency.jsx — emergency contacts management with direct-dial
- Manage.jsx — admin/settings (renamed "Pay & Alerts" → "Notifications")
- Medications.jsx — medication tracking
- NeonatalFoster.jsx — neonatal kitten foster care
- NeonatalGrowth.jsx — neonatal kitten growth charts
- Login.jsx, Register.jsx, ForgotPassword.jsx, ResetPassword.jsx — auth pages

## Components (src/components/)
- Layout.jsx — responsive shell (SidebarNav on lg+, BottomNav on mobile)
- SidebarNav.jsx — neumorphic desktop sidebar (sn3n design system)
- care/ — care task cards, dialogs, assignment migration, daily summary
- neonatal/ — kitten profile, feeding, weight, elimination, mother logs
- petprofile/ — overview, weight, vaccinations, vet visits, medications, preventatives
- dashboard/ — mission cards, filters, progress bar, reward toast, pet profile cards

## Entities (base44/entities/)
- PetProfile, CatTask, CareTask, CompletionLog
- PetMedication, MedicationSchedule, Vaccination, Preventative, VetVisit
- WeightLog
- EmergencyInfo, PayConfig, DailyNotification
- NeonatalKitten, NeonatalFeeding, NeonatalWeight, NeonatalElimination, NeonatalMotherLog
- Workspace, WorkspaceInvitation, WorkspaceMember, WorkspaceAuditLog (entities exist but not yet wired into app architecture)

## Theme / Branding
- Primary: `#7209B7` (purple, hsl 276 91% 38%)
- Accent: muted rose (hsl 348 25% 61%)
- Fonts: Montserrat (headings) + Manrope (body)
- Neumorphic sidebar nav via custom `sn3n-*` utility classes in index.css

## Navigation
- BottomNav (mobile): Dashboard, Pets, Neonatal, Emergency, Manage
- SidebarNav (desktop lg+): neumorphic rail with expandable panel
- Routes configured in src/App.jsx

## Current State Notes
- "Trip Pay Configuration" card removed from Manage.jsx
- "Pay & Alerts" tab renamed to "Notifications"
- All dialogs and utility components use semantic theme tokens
- No payment integration configured yet
- No app connectors authorized
- No workflows or agents configured