# Agent Skills

Public, installable skills for AI coding agents.

## Quick start

1. Choose **LightRead Lite**.
2. Install it:

   ```bash
   npx skills add https://github.com/unique01082/agent-skills --skill lightread-lite
   ```

3. Finish LightRead authentication in the browser when prompted.
4. Ask your agent:

   ```text
   Use $lightread-lite to save this document to LightRead.
   ```

## Available skills

| Skill | Description | Requirements |
| --- | --- | --- |
| [LightRead Lite](skills/lightread-lite/SKILL.md) | Saves local text or image documents to LightRead through a same-machine browser handoff. | Node.js 18+, macOS, Linux, or Windows |

LightRead Lite creates a local static preview, opens [LightRead](https://lightread.baole.space), and keeps a single-use loopback handoff alive while the browser imports the document. Multiple documents use independent browser handoffs, so they can be sent together without overwriting each other. Ask for “silent mode” when you want each successful import tab to close immediately. Authentication remains in the browser; the skill never asks for LightRead credentials.

## Updates

```bash
npx skills update lightread-lite
```

## Security

Review skill instructions and scripts before installation. LightRead Lite binds its temporary server to `127.0.0.1`, uses a random single-use token, restricts browser origin access to LightRead, and expires the handoff after ten minutes.

## Related

- [skills.sh CLI documentation](https://www.skills.sh/docs/cli)
- [LightRead](https://lightread.baole.space)
