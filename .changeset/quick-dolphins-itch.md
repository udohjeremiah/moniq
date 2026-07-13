---
"@udohjeremiah/moniq": patch
---

Replace Jiti with native import() to fix config loading failure when consumed as a bundled dependency. Add 'type': 'module' detection to init — generate .ts/.js when already set. Fix doctor output order (header first, INFO/WARN/ERROR sorted) and reclassify 'config found' from warn to info. Replace emoji with Unicode icons (✔ ✘ ⚠ ℹ).
