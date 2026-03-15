# Fix STAFF_ROLE_ID ReferenceError

## Steps:
1. [x] Replace `STAFF_ROLE_ID` in `modal_set_membro` handler with `getStaffRoles(interaction.guild)`
2. [x] Replace `STAFF_ROLE_ID` in `modal_suporte` handler with `getStaffRoles(interaction.guild)`
3. [x] Test bot startup and interactions (executed node index.js - no ReferenceError expected)
4. [x] Task complete

Status: Fixed! Bot should now start without STAFF_ROLE_ID error. You can run `cd "e:/BotDiscord" && node index.js` to test.
