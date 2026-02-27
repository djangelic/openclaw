# How We Built a Security Scanner That Sales Reps Actually Use

*By Angel Menendez | Staff Developer Advocate at n8n | [The Last Layer Campaign](https://aztechsol.com/the-last-layer/)*

**Part of [The Last Layer](https://aztechsol.com/the-last-layer/) series — how enterprise teams are turning Slack into the only interface that matters.**

---

<!-- VIDEO PLACEHOLDER: Angel's intro video for the Security Scanner Case Study -->
🎬 **[Video: Angel walks through the BlackCloak Scanner story — coming soon]**

---

## The Tool That Nobody Could Use

At BlackCloak, we had a Python CLI tool called the Dehashed Scanner. If you're not familiar with [Dehashed](https://dehashed.com), it's a database of breached credentials — the kind of thing cybersecurity firms use to show prospective clients just how exposed their executives and employees are. Our scanner would take a domain, run it against the Dehashed API, parse the results, cross-reference against known breach datasets, and produce a clean report showing exactly which credentials were floating around the dark web.

It was a powerful tool. It was also completely useless to the people who needed it most.

Three engineers had SSH access to the server where it ran. Three. In a company where the entire sales motion depended on showing prospects their exposure data in real time, on live calls, to close deals — three people could run the tool, and none of them were in sales.

Here's what the workflow looked like before:

1. Sales rep gets a prospect on a call
2. Prospect asks, "So what does our exposure actually look like?"
3. Sales rep says, "Great question — let me get back to you on that"
4. Sales rep files a ticket in Jira
5. Ticket sits in the engineering backlog (because engineers have actual engineering work to do)
6. Engineer eventually SSHs into the server, runs the script, downloads the output
7. Engineer emails the CSV to the sales rep
8. Sales rep reformats it into something presentable
9. Sales rep schedules a follow-up call — if the prospect hasn't gone cold

Average turnaround: 2-4 days. For a tool that took 30 seconds to run.

This is the pattern I've seen at every company I've worked at, from Intuit to ThreatConnect to Palo Alto Networks: engineering builds powerful tools, locks them behind interfaces only engineers can use, and then wonders why adoption is low. The tool isn't the problem. The interface is the problem. The *last layer* — the part that connects the tool to the human who needs it — is missing.

## The Problem Nobody Talks About

Let's be honest about what was really happening. The Dehashed Scanner wasn't "hard to use." The Python script itself was straightforward — pass in a domain, get back results. A junior developer could run it on day one.

The problem was everything *around* the script:

- **SSH access** required a VPN connection, key management, and security training that sales reps (rightfully) shouldn't need
- **The server** was a shared development box with other tools on it — giving sales reps access meant giving them access to everything
- **The output** was raw JSON that needed processing before it was client-ready
- **There was no audit trail** — no way to know who ran what scan, when, or for which prospect
- **Error handling** was "read the stack trace" — which is fine for engineers, but not for someone mid-call with a CISO

This is the dirty secret of enterprise tooling: most of your best internal tools are trapped behind CLI interfaces, admin dashboards, or "ask Dave in engineering" workflows. Not because the tools are complex, but because nobody ever built the last layer — the interface that makes the tool accessible to the people who actually need it.

As I wrote in [AI on Automation Rails](https://aztechsol.com/automation-ai/ai-on-automation-rails-why-ai-without-workflow-infrastructure-is-just-expensive-guessing/), intelligence without infrastructure is just expensive guessing. The same applies to tooling: a powerful tool without an accessible interface is just expensive shelfware.

## The Solution: Slack as the Security Interface

I built the first version in two weeks. On my laptop. In my spare time.

Here's what I did: I took the existing Python script — didn't change a single line of the core logic — containerized it, and wired it up to Slack through [n8n](https://n8n.io).

The architecture is almost embarrassingly simple:

```
Slack slash command (/dehashed-scan)
    → Slack BlockKit modal (domain input + options)
        → n8n webhook receives the submission
            → n8n triggers containerized Python script
                → Script runs the Dehashed API query
                    → n8n processes and formats the results
                        → Results posted back to Slack (ephemeral or channel)
```

That's it. The Python script didn't change. The Dehashed API didn't change. The only thing that changed was the *interface* — and that changed everything.

### The Slack Modal

Using Slack's [BlockKit](https://api.slack.com/block-kit) framework, I built a modal that collected:

- **Target domain** (e.g., `acme-corp.com`)
- **Scan depth** (quick scan vs. deep scan)
- **Output format** (summary for the call, or detailed for follow-up)
- **Channel** to post results (private channel per prospect, or DM to the rep)

The modal validated inputs before submission. No more typos in domain names causing the script to error out. No more "which flag was it again?" — the options were right there, labeled in plain English.

### The n8n Workflow

n8n served as the orchestration layer — the thing I call the "automation rail" that connects the user action to the backend tool. The workflow:

1. **Receives** the webhook payload from Slack
2. **Validates** the request (is this user authorized? is the domain format valid?)
3. **Executes** the containerized Python script with the right parameters
4. **Processes** the raw output — parsing JSON, formatting for readability, flagging high-severity findings
5. **Posts** the formatted results back to Slack
6. **Logs** the scan to a tracking sheet (who ran it, when, for which prospect, results summary)

The entire workflow was about 12 nodes. I've built more complex workflows for sending birthday emails.

### The Containerized Script

I wrapped the existing Python script in a Docker container with a simple API interface. This gave us:

- **Isolation** — the script ran in its own environment, couldn't touch anything else
- **Reproducibility** — same results every time, no dependency hell
- **Scalability** — could run multiple scans concurrently without conflicts
- **Portability** — moved from my laptop to a production server with zero changes

The key insight: I didn't rewrite the tool. I didn't "modernize" it. I didn't port it to JavaScript or rebuild it as a web app. I just gave it a new front door.

## The Two-Week MVP

The first version ran on my laptop, connected to Slack through an ngrok tunnel. It was held together with the digital equivalent of duct tape and prayers. But it worked.

I showed it to one sales rep. She ran a scan on a prospect's domain mid-call, shared results in under a minute, and booked a follow-up before hanging up. That afternoon, she told three other reps. By the end of the week, every sales rep was asking for access.

This is the pattern that [Deleuze and Guattari described](https://aztechsol.com/automation-ai/desiring-machines-what-a-french-philosopher-got-right-about-business-automation-in-1972/) as "desiring machines" — when you remove the friction between desire and capability, adoption isn't something you have to mandate. It happens because the tool *wants* to be used, and the people *want* to use it. You just have to connect them.

Within two weeks, I had moved the setup from my laptop to a proper server. The total cost of the migration was about four hours of work, because the containerized script and n8n workflow were fully portable.

## The Results

**Before:**
- 3 users (engineers only)
- 2-4 day turnaround for scan results
- No audit trail
- SSH keys shared on sticky notes (yes, really)
- Sales reps couldn't demonstrate value on live calls

**After:**
- 30+ users (every sales rep, plus customer success, plus leadership)
- 30-second turnaround
- Full audit trail (who, when, what, results)
- Zero SSH access required
- Sales reps ran scans live on prospect calls

Deal velocity increased. I don't have permission to share exact numbers, but the sales team went from "we'll get back to you" to "let me show you right now" — and that shift closed deals that would have otherwise gone cold.

## The Security Paradox

Here's the part that surprised the security team: *the Slack-based scanner was more secure than the SSH-based one.*

Think about it:

- **Authentication:** Slack Enterprise Grid uses SSO. Every user is authenticated through the company's identity provider. SSH keys? They lived in engineers' home directories, got copied to laptops, and occasionally showed up on sticky notes.
- **Authorization:** Slack's channel-based permissions meant we could control who had access to the scanner by adding or removing them from a specific channel. SSH access was all-or-nothing — if you could SSH in, you had access to everything on that server.
- **Audit logging:** Every Slack interaction is logged. Who ran what command, when, with what inputs, and what results came back. The SSH-based workflow had no logging whatsoever.
- **Data handling:** Results were posted to private Slack channels with controlled membership. Previously, results were emailed as CSV attachments that lived in inboxes forever.
- **Revocation:** Need to remove someone's access? Remove them from the Slack channel. Done. Previously? Hunt down SSH keys across multiple machines and hope you got them all.

The security team initially pushed back — "you want to put a security tool in *Slack*?" — but once they saw the audit trail and access controls, they became the tool's biggest advocates. Slack's enterprise auth layer provided better security than anything we'd had before.

This is a principle I keep coming back to: security and usability aren't opposites. In fact, the most secure path is often the most usable one, because people don't try to work around it. When the tool is easy to use correctly, people use it correctly. When it's hard to use correctly, people find shortcuts — and shortcuts are where breaches happen.

## The Last Layer Principle

The Dehashed Scanner case study illustrates what I call The Last Layer principle:

**Your tools are only as good as their interface. And the best interface is the one your team already uses.**

The scanner's core logic didn't change. The API it called didn't change. The data it returned didn't change. The *only* thing that changed was the last layer — the interface between the human and the tool.

By moving that interface to Slack, we achieved:

- **10x adoption** (3 users → 30+)
- **100x speed** (days → seconds)
- **Better security** (SSH keys → enterprise SSO)
- **Full auditability** (nothing → complete trail)
- **Zero training** (everyone already knew how to use Slack)

That last point is crucial. We didn't have to train anyone. There was no onboarding document, no "lunch and learn," no adoption campaign. People knew how to use Slack. We put the tool in Slack. They used the tool. That's it.

## The Broader Lesson

Look at your own organization. I guarantee you have tools like this — powerful capabilities trapped behind interfaces that only a handful of people can use:

- **The monitoring dashboard** that only DevOps checks (because it requires a VPN and a separate login)
- **The data query tool** that only analysts can run (because it requires SQL knowledge)
- **The deployment pipeline** that only senior engineers can trigger (because it's a CLI with 47 flags)
- **The customer lookup** that only support leads can access (because the admin panel is "too complex" for tier-1)

Each of these is a Last Layer problem. The capability exists. The need exists. The connection between them doesn't.

As I explore in [The Last Layer playbook](https://aztechsol.com/the-last-layer/), the solution isn't always Slack — but for enterprise teams, it usually is. Not because Slack is the best UI framework in the world, but because it's the one UI your entire company already has open, all day, every day.

And that's not a compromise. As I discussed in [the AI dependency trap](https://djangelic.github.io/openclaw/ai-dependency-trap.md), choosing the tool your team will actually use over the "objectively better" tool nobody adopts isn't settling — it's the only strategy that works.

## Start Here

If you're reading this and thinking about your own Last Layer problems, here's my advice:

1. **Pick one tool** that's currently trapped behind a CLI or admin dashboard
2. **Identify who needs it** but can't currently access it
3. **Build a Slack modal** that collects the inputs (BlockKit is surprisingly easy)
4. **Wire it up with n8n** (webhook → script → response)
5. **Ship it** — on your laptop if you have to, just get it in front of users
6. **Measure adoption** — if people use it, you've found a Last Layer gap worth filling

The first one takes two weeks. The second takes two days. By the third, you'll have a pattern you can apply to anything.

And if you want help building the first ten? [That's what we do](https://aztechsol.com/the-last-layer/).

---

*This post is part of [The Last Layer](https://aztechsol.com/the-last-layer/) campaign by AZ Technology Solutions. Read the full series: [Desiring Machines](https://aztechsol.com/automation-ai/desiring-machines-what-a-french-philosopher-got-right-about-business-automation-in-1972/) | [AI on Automation Rails](https://aztechsol.com/automation-ai/ai-on-automation-rails-why-ai-without-workflow-infrastructure-is-just-expensive-guessing/) | [The Last Layer Playbook](https://aztechsol.com/the-last-layer/)*
