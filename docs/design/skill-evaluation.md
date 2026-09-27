# Skill routing evaluation

Native invocation uses `$skill-name`. Repository skills live in `.agents/skills`;
new sessions discover them. Existing sessions may need restarting to refresh the
catalog. All seven include native frontmatter and `agents/openai.yaml` with
implicit invocation enabled. A metadata check alone is not behavioral proof.

| Skill | Should trigger | Should not trigger |
|---|---|---|
| frontend-art-direction | Establish a visual direction for the landing page | Add a database migration |
| anti-slop-ui | Make the landing page feel less generic | Fix a Python tensor shape |
| web-design-guidelines | Review keyboard and form interaction details | Choose a model architecture |
| design-system | Define shared color and spacing tokens | Correct a sentence typo |
| visual-qa | Check rendered contrast and mobile overflow | Run only the backend unit tests |
| image-to-ui | Reinterpret this supplied poster for Sanket | Update API timeout handling |
| motion-design | Create a reusable motion system | Change the spelling of a label |

Explicit test: fresh read-only Codex session, `$name` invocation for each of the
seven; require exact path and an applicable/excluded task. Implicit test: provide
only the fourteen prompts above and ask it to select local skills by description.
Record actual results in qa.md. These tests verify discovery and bounded routing,
not universal activation accuracy or full execution of every workflow.
