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
| [LightMesh Connect](skills/lightmesh-connect/SKILL.md) | Connects Claude Code, Codex, claude.ai, ChatGPT and other MCP clients to LightMesh, and verifies the connection. | — |
| [LightMesh Agent](skills/lightmesh-agent/SKILL.md) | Reads and edits LightMesh graphs safely through the MCP / WebMCP tools. | A LightMesh MCP connection |
| [LightMesh Graph Builder](skills/lightmesh-graph-builder/SKILL.md) | Models a system, codebase or topic as a good-looking, useful LightMesh graph, with correctness and design checks. | Node.js 18+ for the check scripts |
| [LightMesh Journey Builder](skills/lightmesh-journey-builder/SKILL.md) | Designs presentation journeys through a LightMesh graph. | — |

### LightMesh skills

Install all four for every coding agent on this machine:

```bash
npx skills add https://github.com/unique01082/agent-skills -g -a '*' \
  --skill lightmesh-connect --skill lightmesh-agent --skill lightmesh-graph-builder --skill lightmesh-journey-builder
```

Then connect LightMesh as an MCP server (the `lightmesh-connect` skill walks your agent through it) and ask,
for example, “Map this repository into a LightMesh graph.” User guide:
[lightmesh.baole.space/guide/agent-skills](https://lightmesh.baole.space/guide/agent-skills).

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
