# Codebase Scan

Perform a deep scan of the GPNet3 codebase:

1. **Find new TODOs/FIXMEs:**
   ```bash
   grep -rn "TODO\|FIXME\|HACK\|XXX\|BUG" --include="*.ts" --include="*.tsx" server/ client/src/
   ```

2. **Check for new files not in domain_memory:**
   - Compare file list against tracked features
   - Identify orphaned or undocumented code

3. **Verify test coverage:**
   - List test files
   - Compare against source files

4. **Review schema changes:**
   - Check `shared/schema.ts` for new tables
   - Compare against migration files

5. **Update domain_memory.json:**
   - Add any discovered features
   - Update file references
   - Add new TODOs to incomplete array

## Output

After scanning, report:
- New files discovered
- New TODOs found
- Features needing documentation
- Suggested domain_memory updates
