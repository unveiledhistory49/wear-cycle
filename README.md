# WearCycle

Calendar-based wardrobe rotation tracker. Log what you wear, spot style ruts, pack trips without accidental repeats.

**Focus:** functionality, low friction, local-first. No account required.

## What it does

| Feature | Action |
|--------|--------|
| **Wardrobe** | Add pieces (photo + color, category, occasion, season) |
| **Log wear** | Pick a date → tap items you wore → save |
| **Calendar** | See which days have logs; open a day for details |
| **Stats** | Most worn, never worn, “style rut” (4+ wears / 30 days) |
| **Trips** | Date range + occasion → pack list that deprioritizes recent wears |
| **Share** | Export/import JSON (partner merge) or copy packing list text |

Data lives in **IndexedDB** on the device (photos compressed client-side). Export for backup or partner coordination.

## Run locally

**Note (Android / Termux):** Shared storage (`/storage/self/primary/...`) often blocks symlinks and native binaries. Prefer developing under home:

```bash
cp -a wear-cycle ~/projects/wear-cycle
cd ~/projects/wear-cycle
npm install
npm run dev
```

On a normal desktop:

```bash
cd wear-cycle
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Stack

- React + TypeScript + Vite
- `idb` for IndexedDB
- `date-fns` for calendar / ranges

No backend in MVP. Premium later (templates, cloud history, social export) can sit on top of the same model.

## Sample / demo data

Empty app → **Load sample data** (Log or Wardrobe empty state, or **Share → Demo data**).

Loads:

- **15 pieces** with color-swatch photos (blue oxford, denim, blazer, etc.)
- **32 wear days** over ~5 weeks — blue oxford + olive chinos intentionally overused (style rut)
- **1 demo trip** packing list for Share → “Copy latest pack list”

Ids are stable (`seed_item_*`, `seed_log_*`) so reloading demo overwrites the same demo rows without wiping non-seed items.

## Suggested flow (first use)

1. **Load sample data** (or Wardrobe → add 5–10 real pieces)
2. **Stats / Calendar** → see ruts and history immediately on demo
3. **Log** → mark today with real clothes when ready
4. **Trips** → generate a pack list
5. **Share** → export JSON backup
