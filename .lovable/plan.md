

## Replace browser `confirm()` with AlertDialog

The delete button currently uses a native browser `confirm()` dialog, which works but looks out of place. I'll replace it with the existing shadcn `AlertDialog` component for a styled, consistent confirmation modal.

### Changes

**File: `src/pages/BestiaryAdmin.tsx`**
- Add `AlertDialog` imports from `@/components/ui/alert-dialog`
- Add state for `deleteTarget` (creature to potentially delete)
- Replace the inline `confirm()` call with setting `deleteTarget`
- Add an `AlertDialog` component at the bottom that shows the creature name, warns this action is irreversible, and provides Cancel/Delete buttons

Single file change, straightforward swap.

