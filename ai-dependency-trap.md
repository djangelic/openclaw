# The AI Dependency Trap: Why I Left ChatGPT (And What OpenClaw Taught Me About Control)

*Your AI should be replaceable. Your tools shouldn't.*

**By [Angel Menendez](https://djangelic.com) · February 19, 2026**

---

## Part 1: I Was Trapped and Didn't Know It

I used ChatGPT for months. It wrote my video scripts, helped me brainstorm content, and had all the context about my work — what I was building, how I liked things structured, the tone I wanted. It was comfortable. It was *convenient*.

The scripts were fluffy. I didn't notice, because I had nothing to compare them to.

When I finally switched to Claude, the quality difference was immediate. Not subtle — **immediate**. Tighter writing, better structure, fewer filler phrases. It was like swapping a well-meaning intern for a senior editor.

Here's the thing, though: the migration itself was painless. Not because ChatGPT made it easy — they didn't — but because I'd already built my tools as MCP servers running through n8n. My calendar access, my note-taking workflows, my event automation — none of it lived inside ChatGPT. The AI changed. The plumbing didn't.

But I got lucky. I'd set this up because OpenAI was testing MCP support in beta and I wanted to experiment with it. If I'd built everything on ChatGPT's native plugins and custom GPTs instead? I'd still be writing fluffy scripts, because the switching cost would have felt too high.

> **A note on MCP authentication:** ChatGPT's MCP implementation only supports OAuth for auth. The MCP Trigger node in n8n doesn't support OAuth yet — it supports header auth or no auth. Running MCP with no authentication is essentially running a verbose webhook with zero protection. Regular webhooks are dangerous enough being opaque; imagine one that *describes itself to the AI in detail*. I went with header auth through n8n and called it a day.

---

## Part 2: The WordPress Lesson (From Someone Who Lived It)

I've run a web design firm for over 25 years. Over 200 clients. Almost all on WordPress.

WordPress didn't win because it was the best CMS. It wasn't. It won because you could **leave**.

Export your site. Move hosts. Overnight if you had to. That single capability — the ability to walk away — created an entire ecosystem. Hosts competed on quality and price instead of lock-in. Developers built for the platform because they knew their clients wouldn't be trapped. Clients trusted the investment because they knew they'd never be held hostage.

I watched this play out hundreds of times. A client's host goes down, jacks up prices, or just stops caring. We'd migrate them over a weekend. No data loss, no downtime drama. Because the *standard* existed, the power stayed with the client.

AI tooling is at exactly the same inflection point right now.

If your tools are MCP servers that you own and control, your AI is replaceable. Swap the model, keep the plumbing. If your tools are ChatGPT plugins, Claude Projects, or Gemini extensions — proprietary, platform-specific connectors — then **you're** the one who's locked in. And just like a bad web host, you won't realize the cost until you need to leave.

---

## Part 3: MCP: The Portability Standard

MCP — the Model Context Protocol — is what makes this possible. It's a standard way to define tools that any AI model can use. You describe what the tool does, what inputs it takes, and what it returns. The AI figures out when and how to call it.

I run my tools as MCP servers through n8n, an open-source workflow automation platform. Each tool is a workflow:

My calendar access? An MCP server. Read-only on my work calendar, read-write on my personal one. The AI can check my schedule or create events, but only where I've given permission.

My local event scraper? An MCP server. It pulls events from around Tucson, processes them, and pushes them to a shared Google Calendar for 150+ people. The AI triggers it; n8n controls what it can actually do.

Meeting transcripts to my personal notes? MCP server. The AI gets the transcript, the workflow handles the formatting and storage. The AI never touches my note system directly.

When I moved from ChatGPT to Claude, **none of these tools changed**. I pointed the new model at the same MCP endpoints and kept working. Ten minutes, maybe.

> 🎬 **Video: How to Set Up MCP Trigger in n8n for Personal Tools**
> Step-by-step walkthrough of building portable AI tools · *Coming soon*

And honestly? You don't even need MCP for all of this. A plain webhook in n8n works just as well for simpler tools. Modern chat-based AI models can make curl requests natively now. The principle matters more than the protocol: **own the layer between the AI and your systems.**

---

## Part 4: What OpenClaw Made Obvious

OpenClaw changed how I think about this.

For those who haven't tried it: OpenClaw is an open-source framework that turns an AI model into a persistent assistant. It runs on your machine. It can schedule its own tasks, manage its own memory across sessions, check in with you proactively. It connects to your messaging platforms, your calendars, your tools — through MCP, webhooks, whatever you configure.

It feels less like chatting with a model and more like having an employee who happens to be software.

But here's what made it click for me: **OpenClaw is model-agnostic**. The framework doesn't care if it's running Claude, GPT, Gemini, or a local model. The tools, the memory, the scheduling — all of that is infrastructure *you own*. The model is just the brain you plug in.

Right now I run it with Claude because Claude is the best at this kind of work. But when a local model reaches that level of inference? I change one line of config. My tools stay. My workflows stay. My data stays on my machine where it already is.

That's not a hypothetical future. That's an architecture decision I've already made.

---

## Part 5: It's Happening On Your Phone Too

The same pattern is playing out on iOS.

Apple's Shortcuts app is basically n8n for your phone — a visual workflow builder that can call webhooks, process data, chain actions together, and now run AI models. They've added ChatGPT integration, Gemini is coming, and there's already a local on-device model built in.

The local model works great for small tasks. But it chokes on large text input — so for transcription analysis, I still route to ChatGPT through a shortcut. Here's the thing though: the *shortcut* doesn't care which model it's calling. When the local model improves (and it will — Apple's been investing heavily in on-device inference), I swap one action. The workflow stays.

This is the dependency trap in miniature. If I'd built my transcription flow inside ChatGPT's app — using their interface, their context, their storage — I'd be locked in on my phone too. Instead, the shortcut captures the input, sends it to n8n via webhook, and n8n decides what to do with it. The phone is just another input device feeding into infrastructure I control.

And this is where the picture gets interesting. I now have three layers:

- **Phone:** iOS Shortcuts → webhooks → n8n
- **Desktop:** OpenClaw → MCP servers → n8n
- **Server:** Scheduled workflows → APIs → n8n

The AI model is different at each layer. The interface is different. But **n8n is the constant** — the tool layer that stays regardless of which AI I'm talking to or which device I'm on. When local models catch up at any of these layers, I swap the brain and keep the plumbing.

That's not a theoretical architecture. That's my Tuesday.

---

## Part 6: The Real Promise Isn't AGI

The tech discourse is obsessed with AGI. When will we get it? Will it be dangerous? Will it take our jobs?

I think the real promise is much simpler and much closer: **competent, Opus-level inference running locally on your own hardware.**

Think about what that means:

**Local token pricing.** Your cost is electricity, not API bills. Run as many queries as you want. No rate limits. No usage caps. No surprise invoices.

**Full privacy.** Your data never leaves your machine. Your meeting transcripts, your personal notes, your calendar, your financial records — all processed locally. No terms of service. No training data opt-outs to worry about.

**True ownership.** The model runs on hardware you bought. The tools connect through workflows you built. The data lives on drives you control. Nothing is rented.

We've already seen what happens when you combine a capable model with persistent tool access — OpenClaw demonstrated that. It's essentially having an employee. Now imagine that employee costs you pennies in electricity instead of dollars per conversation in API fees. And they never phone home.

We don't need AGI. We need local models we control. Not models that control us.

---

## Part 7: What You Should Do Today

I'm not saying abandon cloud AI. I use Claude every day. It's excellent. The point is: **don't build your life around it.**

**Stop building inside platform-specific tool ecosystems.** ChatGPT plugins, Claude Connectors, Gemini extensions — these are convenient, but they're gilded cages. The moment you want to leave, your tools don't come with you.

**Define your tools as MCP servers.** Use n8n, use anything — the tool just needs to be something you control that speaks a standard protocol. Even a simple webhook gets you most of the way there.

**Think in terms of scoped access.** Give your AI read-only on things it should see, read-write on things it should change, and nothing on things it shouldn't touch. You wouldn't give a contractor your master key. Don't give your AI one either.

**Treat your AI like a contractor you might replace.** Because you will. Maybe not today, but models improve, prices change, new options emerge. The question isn't *whether* you'll switch — it's whether you'll be ready when it's time.

When the local model revolution arrives — and it will — the people who own their tool layer will migrate in an afternoon. Everyone else will be stuck rewriting their entire setup, or worse, staying with an inferior model because leaving costs too much.

I've seen this movie before. I watched it play out in web hosting for 25 years. The lesson is the same: **portability is power.**

> Would I go back to ChatGPT? Maybe. OpenAI just hired the creator of OpenClaw — that's a signal worth watching. But I'd go back on *my* terms, with my tools intact, ready to leave again if something better comes along. That's the whole point. You should never be so comfortable that you can't walk away.

---

### The Enterprise Side of This Problem

This was my personal story. But the same dependency trap exists at a much larger scale in enterprise — and the stakes are higher.

**[Read: Why Your AI Needs a Bouncer →](https://aztechsol.com/automation-ai/why-your-ai-needs-a-bouncer/)**

---

*Angel Menendez · [djangelic.com](https://djangelic.com) · [AZ Technology Solutions](https://aztechsol.com)*
*Staff Developer Advocate at [n8n](https://n8n.io) · 25+ years in web design · Building the tool layer between AI and life*
