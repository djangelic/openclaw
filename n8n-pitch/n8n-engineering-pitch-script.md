# n8n Engineering Pitch — Video Script
**Target length:** ~5 minutes (~750 words at natural speaking pace)

---

## HOOK (0:00–0:30)

Here's a question every AI power user faces right now: Do you trust your AI agent with direct API access to your entire digital life?

I've been using an autonomous AI assistant daily — it manages my calendar, reads my emails, handles invoices, even controls smart home devices. And every single integration requires handing over API keys. That means if the agent hallucinates, gets prompt-injected, or the platform gets breached — everything's exposed.

The thing is... n8n already solves this problem. We just haven't finished building the story yet.

---

## THE SECURITY LAYER (0:30–1:30)

Let me show you what I mean. Right now, the default pattern for AI agents is dangerous. You give your agent your Google credentials, your Slack token, your database password — and it talks to everything directly. No guardrails. No audit trail. No way to revoke access to just one service without ripping everything apart.

n8n sits in the middle. Instead of the agent holding your credentials, n8n holds them. The agent calls n8n through MCP — the Model Context Protocol — and n8n calls the service on its behalf. Your credentials never leave n8n. Every action shows up in the workflow execution log. You can see exactly what the agent did, when, and why.

And here's the key insight — this security layer isn't friction. It's what *enables* frictionless access. Because n8n holds credentials centrally, an agent that goes through n8n can access 400+ services without the user configuring each one separately.

---

## THE TWO IMPLEMENTATIONS (1:30–2:30)

We have two MCP server-side implementations that work together to tell this story.

First: the **MCP Server Trigger**. Think of it like a Webhook Trigger, but for AI agents. Something external calls in, your workflow handles it. The agent gets a labeled menu of tools with descriptions and parameter schemas — it's a webhook with the lights on.

Second: **MCP Access**. This is the n8n API, but speaking MCP so AI agents can discover and use it natively. Your agent can list workflows, trigger executions, even build new automations — all through n8n, all without touching raw credentials.

Together, your AI agent can both *use* external tools and *build* new workflows. All through n8n. And when you switch to a better AI platform next month — because let's be honest, you will — everything stays exactly where it is. Swap the agent, keep your tools. That's real portability.

---

## THE PROBLEM (2:30–3:30)

So why can't we tell this story yet? Because there are gaps that undermine it.

The biggest one: **Human-in-the-Loop controls only exist on legacy AI Agent nodes.** They don't exist on MCP tools or external AI connections — the exact places where external agents interact with n8n. That little approval button that lets a human review before an action fires? It needs to be everywhere. Want your AI to SSH into production? Fine — but it waits for you to click approve first. That's the pitch. That's what makes people trust this.

The second gap: **deployment is still too hard** for the users who need this most. Networking, tunneling, Docker, reverse proxies — these walls stop non-DevOps users cold. The people most excited about connecting AI agents to n8n are running it on laptops and Raspberry Pis. If we lose them at setup, we lose our evangelists.

And third: the two MCP implementations look the same. There's no visual distinction between incoming and outgoing, no shape language that communicates the security boundary. Our CEO said it — transparency is our moat. But if users can't *see* the security architecture they're building, we're hiding our biggest advantage.

---

## THE ASK (3:30–4:30)

Here's what I'm proposing — and none of this is a moonshot. The original AI integration was built by two and a half people.

**P0:** Human-in-the-Loop on every tool connection. Not just legacy nodes. Every MCP trigger, every external AI connection. With flexible approval channels — Slack, email, mobile push, whatever surface the user already lives in.

**P0:** A guided deployment flow that handles networking and security setup, so the barrier to first run drops to near zero.

**P1:** Expand MCP Access to cover the full n8n API surface — all eight resource branches, not just two.

**P1:** Visual distinction between incoming and outgoing MCP — use the shape language we already have.

---

## CLOSE (4:30–5:00)

n8n is sitting on the largest collection of pre-built integrations in the low-code space. Every one of those 400+ nodes is a potential AI agent tool. MCP is the bridge that makes them accessible — securely and portably.

The tools for the AI agent security story are already in n8n. Let's make sure people can see them.

---

*Angel Menendez — Staff Developer Advocate, n8n*
