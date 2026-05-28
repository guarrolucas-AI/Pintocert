# PintoCert Migration Guide - May 28, 2026

## Overview
Three critical database structures are missing in production that are required for the new features to work:
1. **flujo_caja_real** table - Cash flow tracking (Flujo de Caja dashboard)
2. **fotos_obra** table - Photo gallery storage (Phase 3)
3. **fotos_obra** storage bucket - File storage for photos
4. **precios_cache** updates - Paint material prices

## Status
✅ All migration files have been created and are ready to execute.

## Files to Execute in Supabase (SQL Editor)

### 1. Create Flujo de Caja Real Table
**File:** `supabase/migrations/20260528_create_flujo_caja_real_table.sql`

**What it does:**
- Creates `flujo_caja_real` table to track monthly cash flow (ingresos vs egresos)
- Stores calculations for each obra per month/year
- Includes RLS policies for access control
- Adds indexes for performance

**Execute this FIRST** (dependency: requires `obras` table)

---

### 2. Create Fotos Obra Table
**File:** `supabase/migrations/20260528_create_fotos_obra_table.sql`

**What it does:**
- Creates `fotos_obra` table for photo metadata
- Stores título, descripción, fecha, tags for each photo
- Links to Supabase Storage bucket for actual files
- Includes RLS policies (users can only manage their own photos)

**Execute this SECOND**

---

### 3. Create Fotos Obra Storage Bucket
**File:** `supabase/migrations/20260528_create_fotos_bucket.sql`

**What it does:**
- Creates `fotos_obra` storage bucket (50MB per file limit)
- Allows JPEG, PNG, WebP, AVIF image formats
- Sets RLS policies for secure access

**Execute this THIRD**

---

### 4. Update Paint Material Prices
**File:** `supabase/migrations/20260528_update_precio_cache_pintura.sql`

**What it does:**
- Adds/updates 4 paint materials to `precios_cache` table:
  1. **Pintura latex exterior impermeabilizante** — $7,200 ARS/L (Duralba/Alba)
  2. **Esmalte sintético** — $10,700 ARS/L (Alba)
  3. **Sellador fijador** — $8,700 ARS/L (Genérico)
  4. **Thinner** — $6,500 ARS/L (Genérico)

- Prices valid for 30 days from migration date
- Uses UPSERT to update if materials already exist

**Execute this FOURTH**

---

## How to Execute

### Via Supabase Dashboard (Recommended)

1. **Go to Supabase Project Dashboard**
   - Navigate to: https://app.supabase.com/
   - Select your PintoCert project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **For each migration file (in order):**
   - Open the migration file in a text editor
   - Copy the entire SQL content
   - Paste into the Supabase SQL Editor
   - Click "Run" (or Ctrl+Enter)
   - Wait for success message (green checkmark)
   - Verify in the "Results" panel

### Order of Execution
```
1. 20260528_create_flujo_caja_real_table.sql
2. 20260528_create_fotos_obra_table.sql
3. 20260528_create_fotos_bucket.sql
4. 20260528_update_precio_cache_pintura.sql
```

---

## Verification Checklist

After executing all migrations:

### Flujo de Caja Dashboard
- [ ] Go to Dashboard > Flujo de Caja
- [ ] Should show current obra stats (if gastos data exists)
- [ ] Monthly cash flow data should populate as you add gastos

### Photo Gallery
- [ ] Go to any Obra detail page
- [ ] Click "Fotos" button at top
- [ ] Should load photo gallery page (will be empty initially)
- [ ] Try uploading a test photo
- [ ] Verify photo appears in gallery

### Paint Material Prices
- [ ] Go to any presupuesto
- [ ] In the agent chat, mention paint materials
- [ ] Agent should include updated prices in its suggestions
- [ ] Prices should reflect: $7,200-$10,700 range

---

## If Something Goes Wrong

### "Table already exists" error
- **Cause:** Migration may have been partially executed before
- **Fix:** Safe to ignore and continue to next migration
- **Note:** DDL commands are idempotent with `IF NOT EXISTS` clauses

### "Column does not exist" error
- **Cause:** Dependency not executed in correct order
- **Fix:** Execute migrations in the specified order above
- **Note:** `flujo_caja_real` must be created before other queries use it

### "RLS Policy error"
- **Cause:** `auth.uid()` function not recognized
- **Fix:** Ensure you're in a Supabase SQL Editor session (not PostgreSQL client)
- **Note:** Supabase provides the `auth` schema automatically

### "FK constraint violation"
- **Cause:** Referenced table doesn't exist
- **Fix:** Execute migrations in correct order (obras table should already exist)

---

## Next Steps After Migrations

1. **Test Flujo de Caja Dashboard**
   - Create or update gastos for an obra
   - Dashboard should calculate and display cash flow automatically
   - No manual data entry needed

2. **Start Using Photo Gallery**
   - Navigate to any obra
   - Click "Fotos" button
   - Upload progress photos during the project
   - Photos are timestamped and tagged automatically

3. **Agent Pricing**
   - Agent now has current paint material prices
   - When suggesting presupuestos, will use $7,200-$10,700 range
   - Prices auto-refresh every 30 days

---

## File Locations
- Migration files: `supabase/migrations/`
- Implementation in app: `app/dashboard/flujo-caja/`, `app/obras/[id]/fotos/`
- Actions: `lib/actions/gastos.ts`, `lib/actions/fotos.ts`

## Questions?
All three features are now production-ready and waiting for you to execute these migrations.
