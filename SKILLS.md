# SilverArrows maintenance skill

This download includes an agent skill named **silverarrows-maintenance**. It
helps an AI coding assistant preserve this app's workflows while making and
checking changes. It does not run in the browser or install another service.

The portable Antigravity copy is at
`.agent/skills/silverarrows-maintenance/SKILL.md`, with a supporting
`references/invariants.md`. A standard agent copy is also included under
`.agents/skills/silverarrows-maintenance/` for compatible assistants.

## Use in Antigravity

1. Open the extracted project folder so project-scoped skills can be discovered.
2. Ask: **“Use the SilverArrows maintenance skill to verify this app before
   changing it.”**
3. If your Antigravity version does not discover project skills automatically,
   open the included `SKILL.md` and attach/paste it into the agent conversation;
   include its referenced invariants when asked. Discovery behavior depends on
   the installed Antigravity version; no IDE integration has been verified here.
4. Keep `AGENTS.md` as the authoritative architecture guide, and `README.md` as
   the startup guide. Skills supplement those documents, not replace them.

In Lovable, the maintenance skill can be activated through the skill approval
card and managed in Settings → Skills. The exported copies can be used in
Antigravity independently of that workspace activation.