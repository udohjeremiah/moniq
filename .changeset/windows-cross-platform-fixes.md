---
"@udohjeremiah/moniq": patch
---

Fix `moniq check` failing with `ERR_UNSUPPORTED_ESM_URL_SCHEME` on Windows when loading `moniq.config.*`.

Normalize file policy subject paths to forward slashes so diagnostics render clean relative paths on Windows.