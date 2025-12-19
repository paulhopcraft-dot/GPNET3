---
description: Blind validation - separate verifier runs tests
---

Never let builder verify own work.

1. Builder writes test plan (commands + expected outcomes)
2. Validator (separate context) runs actual tests
3. Validator captures evidence (output, logs)
4. Reports PASS/FAIL with proof

Only mark passes: true with validator evidence.
