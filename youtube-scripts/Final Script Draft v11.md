# n8n Scaling: Food Truck, Restaurant, Franchise

**Target Runtime:** 15-18 minutes  
**Framework:** Donald Miller's StoryBrand  
**n8n Version:** 2.8.3 (February 2026)

---

## StoryBrand Elements

- **Hero:** Angel (and the viewer) — curious enough to ask "why don't I understand this?"  
- **Villain:** Complexity that nobody demystifies  
- **Guide:** The data — real benchmarks replacing guessing with knowing  
- **Plan:** Understand the three types → see the data → know your path  
- **Transformation:** "I didn't understand our own architecture" → "Now I can explain it with food"  
- **Tagline:** "Stay curious"

---

## SEGMENT 1: COLD OPEN — THE CONFESSION
**[0:00 - 1:30]**

**[VISUAL: Angel talking to camera. Cut to: n8n docs, complex diagrams. Then: food truck → restaurant → franchise b-roll montage.]**

I work at n8n. I'm a Solutions Engineer. And until recently, I didn't fully understand our own architecture.

Single main. Queue mode. Multi-main. I knew the words. I could point at diagrams. But if you asked me "when should I use which one, and what's the actual difference in performance?" — I'd be guessing.

And that bothered me. Because if *I* don't understand it — someone who works here — how is the community supposed to figure it out?

So I did what I always do when something doesn't make sense. I got curious. I broke things. I benchmarked everything. And I came back with a framework that I think makes it click.

Three architectures. Three types of restaurants. Food truck, restaurant, franchise. Real numbers showing exactly what each one can handle.

Now — quick note. I'm based in the USA, and this analogy comes from how the food industry works here. If you're watching from somewhere where food trucks aren't a thing: imagine a small mobile kitchen on wheels. One person does everything — cooks, takes orders, serves. It's cheap to run, but tiny. The restaurant and franchise concepts should translate everywhere.

Also — this analogy isn't perfect. It's not supposed to be. Software architecture doesn't map one-to-one onto cooking metaphors. But the goal isn't technical precision — it's giving you a mental model that makes the scaling decisions intuitive. The data is where the precision lives.

By the end of this video, you'll understand n8n's architecture better than most people who deploy it. And you'll know exactly which one you need.

Let's eat.

**[VISUAL: Title card — "Food Truck. Restaurant. Franchise." Punchy music hit.]**

---

## SEGMENT 2: WHY NOBODY UNDERSTANDS THIS
**[1:30 - 2:30]**

**[VISUAL: Forum posts, Discord questions, Stack Overflow. AWS bills. Architecture diagrams that look like subway maps.]**

Here's what happens when you search "scale n8n."

"Enable queue mode." "Use Redis." "Multi-main for HA." "Split your workers."

That's like telling someone who's never cooked: "Just open a franchise." Great. How?

The documentation tells you what's *possible*. It doesn't tell you what you *should* do. And when your cloud bill is climbing every month, "possible" isn't good enough.

Nobody puts the architectures side by side and shows what they actually do under pressure. Everyone explains the theory. Nobody shows the receipts.

So I ran the receipts. Seven different configurations. Same benchmark tests. Real hardware on AWS. Let me show you what I found — starting with where everyone begins.

---

## SEGMENT 3: THE FOOD TRUCK — Single Instance Mode
**[2:30 - 6:00]**

**[VISUAL: B-roll of food trucks — one chef, cramped space, a line forming. Overlay: single Docker container diagram.]**

### The Concept

The food truck. One vehicle. One chef. One tiny kitchen.

Everything happens in one space. Taking orders, cooking, plating, serving — all the same person, same counter. When it's quiet, it's beautiful. Simple. Efficient.

But when the lunch rush hits, that line grows. And no matter how talented the chef is, one person can only plate so fast.

This is **single instance n8n**. One Docker container handling webhooks, executions, database writes — everything in the same process.

Every food truck comes with a tiny pantry — a small cabinet for ingredients. And tucked in the corner, there's a little section cordoned off with tape where the chef tests new recipes after hours. It's cramped, it's the only spot to experiment, and if someone's using it, you wait.

That recipe testing corner? That's your **n8n editor** — the UI where you build and edit workflows. In single instance mode, there's one, and it's sharing space with everything else.

### SQLite — The Tiny Pantry

When you first install n8n, it uses SQLite. That's the default. The tiny pantry with a lock that only one person can open at a time.

I tested this on a c5.large — that's an AWS instance with two vCPUs and four gigabytes of RAM.

**[VISUAL: Animated bar chart, flat line across VU levels]**

- 3 virtual users: 47 requests per second
- 10 users: 47
- 50 users: 48
- 200 users: 48

Flat line. Hard ceiling at 48 RPS. Doesn't matter how many customers show up.

That's not a CPU problem or a memory problem. SQLite is single-threaded — only one operation can write to the database at a time. The chef has energy to spare, but the pantry only lets one person in at a time.

This is **perfect for getting started**. Home projects. Learning n8n. Solo starters getting their feet wet. But it has a ceiling you can't lift with more hardware.

> **Technical note:** SQLite uses a file-level lock for writes. Under concurrent webhook load, write operations serialize regardless of available CPU cores. This is by design — SQLite prioritizes simplicity and reliability over concurrent write throughput.

### PostgreSQL — A Real Pantry

Same food truck. Same c5.large. But swap the tiny cabinet for proper shelving. PostgreSQL instead of SQLite.

**[VISUAL: Animation — tiny cabinet morphs into organized shelving]**

- 3 users: 8 RPS (cold start — PostgreSQL's connection pool is warming up)
- 10 users: 18 RPS
- 50 users: 43 RPS
- 100 users: 59 RPS
- 200 users: 71 RPS

Now it scales *up* under load. PostgreSQL handles concurrent reads and writes natively — multiple cooks can access the pantry simultaneously.

And here's something worth noting: **the n8n engineers already tuned the PostgreSQL defaults well.** Version 2.8.3 ships configuration that gets you to 71 RPS out of the box. That's a 48% jump over SQLite, zero configuration on your part.

**[VISUAL: Side-by-side — SQLite flat at 48 vs PG Default climbing to 71]**

> **Technical note:** The low initial RPS at 3 VUs reflects PostgreSQL's connection pooling and shared buffer warm-up. As load increases, frequently accessed data pages move into shared_buffers (RAM cache), reducing disk I/O. This is normal and expected behavior.

### PGTune — Squeezing More From the Same Kitchen

Not long after I started running these tests, my colleague Marcus — Senior Solutions Engineer at n8n — sent me a link. He said, "Have you tried PGTune?"

PGTune is a free tool that's been around for years. It generates PostgreSQL configuration tuned for your specific hardware. Because here's the thing — PostgreSQL's defaults are conservative. They're designed to run on anything from a Raspberry Pi to a 64-core database server. PGTune says: "Tell me what you actually have, and I'll optimize for it."

Same c5.large. Same food truck. But with PGTune applied:

**95 requests per second.** That's a 34% improvement over defaults. Free. Five minutes of work.

**[VISUAL: Bar chart — PG Default 71 → PG Tuned 95]**

So if you're running single instance n8n with PostgreSQL, PGTune is your obvious next step. It's the difference between a pantry that works and a pantry that's optimized for your specific kitchen.

> **Technical note:** PGTune primarily adjusts `shared_buffers`, `effective_cache_size`, `work_mem`, and `maintenance_work_mem` based on available RAM. For our 4GB c5.large, it allocated 1GB to shared_buffers (vs PostgreSQL's 128MB default) and increased work_mem from 4MB to 10MB. These settings let PostgreSQL cache more data in RAM and use more memory per operation, reducing disk I/O significantly.

**Important:** This 34% gain applies to single instance mode. As you'll see in a moment, queue mode tells a different story — the architecture handles the load differently, and database tuning has much less impact there.

### Who's a food truck?

You, at home. Running personal automations. Small teams. Community edition, single instance, PostgreSQL with PGTune applied.

This is your learning ground. And 95 RPS handles a LOT of webhooks.

---

## SEGMENT 4: THE RESTAURANT — Queue Mode
**[6:00 - 9:30]**

**[VISUAL: B-roll of restaurant kitchen — ticket rail, multiple stations, waiters and cooks. Overlay: queue mode architecture with Redis, webhook workers, execution workers.]**

### The Concept

One day the food truck isn't enough. Real demand. Time for a proper restaurant.

Think about what makes a restaurant different from a food truck. It's not just bigger — it's *organized differently*.

In a food truck, the chef does everything. In a restaurant, you've got waiters handling the front of house — taking orders, putting tickets on a rail. In the kitchen, line cooks pull tickets and work their stations. A pantry supplies ingredients to whoever needs them. Everyone has a role.

This is **queue mode**. Redis — pronounced "RED-iss" — acts as your ticket rail. Webhook workers are your waiters — they receive incoming requests and queue them. Execution workers are your cooks — they pull jobs off the queue and process them.

Docker Compose lets you spin up as many workers as your kitchen can hold. Two cooks. Four cooks. Ten.

**[VISUAL: Architecture diagram building piece by piece — Redis center, webhook workers left, execution workers right, PostgreSQL at bottom]**

And the restaurant has a proper recipe testing area. Not a taped-off corner — an actual section of the kitchen dedicated to developing new dishes. It's still one test kitchen, shared by all the staff, but it's purpose-built and doesn't compete for space with the dinner service.

That's your n8n editor in queue mode — a dedicated main instance that handles the UI while workers handle the load.

### The Data

I tested this on a c5.4xlarge — eight vCPUs, thirty-two gigs of RAM, room for multiple worker containers.

**[VISUAL: Bar chart JUMPING dramatically from ~95 to ~266]**

Queue mode with default settings:

- 3 users: 221 RPS
- 10 users: 266 RPS
- 30 users: 266 RPS
- 100 users: 255 RPS
- 200 users: 260 RPS

266 requests per second. **Nearly 3x** what the tuned food truck could do. Zero failures at every load level.

Multiple webhooks — ten different workflows triggered simultaneously? 263 RPS. The restaurant handles variety as well as volume.

This was the moment in my testing when I went "oh — *that's* what queue mode is for." I'd understood it conceptually. But seeing the number jump from 95 to 266? That's when the architecture clicked for me.

> **Technical note:** Queue mode uses Redis as a message broker. Incoming webhook requests are acknowledged immediately and placed on a Redis list. Worker processes poll the list and execute workflows independently. This decouples request intake from execution, eliminating the single-process bottleneck of single-main mode. The c5.4xlarge ran 2 main instances and 2 worker instances in our test configuration.

### Tuning Doesn't Matter Here (And That's a Good Thing)

Remember how PGTune gave us 34% more performance on single instance? I ran the same tuning on queue mode.

Queue Default: **266 RPS.**  
Queue Tuned: **280 RPS.**

That's only a 5% difference. Barely measurable.

Why? Because in queue mode, the bottleneck shifts. The database isn't the constraint anymore — the workers and Redis are distributing the load so efficiently that the database barely breaks a sweat. Tuning a pantry that isn't the bottleneck doesn't help much.

This is actually great news. It means queue mode is **robust by default**. You don't need to be a PostgreSQL expert to get great performance. Just enable queue mode, configure your workers, and let the architecture do the work.

### The One Caveat

There's something you need to know about this restaurant.

You can have as many cooks and waiters as you want. But there's still **one recipe testing area**. One place where your developers can create and refine workflows.

If that area goes down, your team can't build or edit workflows. The cooks keep cooking — active workflows keep running. But nobody can make changes until it's back.

**[VISUAL: "Recipe Testing CLOSED" sign, while the main kitchen keeps humming]**

On community edition, this is as far as you go. And for most deployments? 266 RPS with zero tuning headaches is more than enough.

### Who's a restaurant?

Teams running production workflows. Companies with real volume. Anyone who needs reliable, high-throughput automation.

Queue mode is the workhorse. Most people who think they need a franchise actually just need a well-run restaurant.

---

## SEGMENT 5: THE FRANCHISE — Multi-Main Mode
**[9:30 - 11:30]**

**[VISUAL: B-roll of franchise — map with pins, multiple restaurants. Overlay: multi-main architecture.]**

### The Concept

The franchise. Multiple locations. Multiple kitchens. Multiple front entrances.

A customer walks into any location — same menu, same experience. If one goes down, the others keep running.

And here's the big upgrade over the restaurant: **every franchise location has its own recipe testing area.** Your developers can work from any location. If one location's test kitchen is closed for renovation, they walk into another one down the street and keep creating.

This is **multi-main mode**, available with an enterprise license. Multiple UI instances — multiple places to build and edit workflows. All sharing the same Redis queue, same database. True high availability.

**[VISUAL: Map with restaurant pins, each with a small "TEST KITCHEN" sign, all connected to shared database center]**

### When You Actually Need This

You need multi-main when:

- **Uptime is non-negotiable.** Minutes of downtime cost real money.
- **Multiple teams** need simultaneous UI access across locations or time zones.
- **Compliance** requires redundancy and failover.

You don't need it for speed. Queue mode already gives you that.

> **Technical note:** Multi-main mode runs multiple n8n instances with `EXECUTIONS_MODE=queue`, each capable of serving the UI and the REST API. A load balancer distributes traffic across mains. If one main fails health checks, traffic routes to the others. Workers are unaffected — they pull from Redis regardless of which main queued the work. This requires an enterprise license because it involves leader election for scheduling and other coordination features.

### The Surprise: Don't Split What Works

Here's where curiosity paid off in a way I didn't expect.

I tested split queue mode — main instance on one machine, workers on a separate bigger machine. More total hardware. Should be faster, right?

**[VISUAL: Two buildings with a long hallway between them. A waiter sprinting back and forth.]**

Split queue: **128 RPS.**  
All-in-one queue: **266 RPS.**

More hardware. *Less* performance.

Think about it this way. You open a second restaurant building across the parking lot and connect them with a hallway. Every time an order comes in, someone has to *sprint down that hallway* to pass it to the other kitchen. And then sprint back with the finished plate. For every. Single. Order.

**[VISUAL: Side-by-side — single building at 266 vs two buildings at 128, exhausted waiter in the hallway]**

That hallway? That's network latency. And running down it hundreds of times per second eats your performance gains alive.

If everything fits in one well-built restaurant, keep it there. Only split across multiple locations when you need **redundancy**, not speed.

> **Technical note:** In our split configuration, the main instance ran on a c5.xlarge and workers on a c5.4xlarge. Every execution requires multiple round-trips: the main enqueues to Redis, the worker dequeues, executes, and writes results back to PostgreSQL (hosted on the main's machine). Each round-trip adds ~0.5-1ms of network latency. At high throughput, these milliseconds compound. The all-in-one configuration communicates over localhost (sub-microsecond latency), which is why it outperforms despite less total hardware.

---

## SEGMENT 6: THE COMPLETE PICTURE
**[11:30 - 13:00]**

**[VISUAL: All configurations in one animated chart, bars appearing one by one.]**

Let's put the whole menu on the table.

**[VISUAL: Bars building one by one]**

| Architecture | Instance | Peak RPS | Cost |
|---|---|---|---|
| SQLite (Tiny Pantry) | c5.large | 48 | $ |
| PostgreSQL Default (Food Truck) | c5.large | 71 | $ |
| PostgreSQL Tuned (Food Truck+) | c5.large | 95 | $ |
| Queue Default (Restaurant) | c5.4xlarge | 266 | $$ |
| Queue Tuned (Restaurant+) | c5.4xlarge | 280 | $$ |
| Split Queue (The Hallway Problem) | c5.xlarge + c5.4xlarge | 128 | $$$ |
| Multi-Main (Franchise) | Enterprise | HA + Scale | $$$$ |

**[VISUAL: Arrow path: 48 → 71 → 95 → 266 → 280, split queue crossed out]**

The path is clear. Each step gets you more, costs more. And split queue — more money for less performance — isn't on the recommended path.

Now, an important caveat: **these numbers are baselines, not ceilings.** Every one of these configurations can scale further with bigger hardware. A c5.large food truck hitting 95 RPS? On a c5.2xlarge with double the resources, that number goes up. Queue mode at 266 on a c5.4xlarge? Throw a c5.9xlarge at it with more workers, and it climbs higher.

The point isn't "this is the max." The point is "this is what each architecture gives you on comparable hardware, so you can see where the real jumps come from." Spoiler: architecture changes beat hardware upgrades almost every time.

---

## SEGMENT 7: HOW TO KNOW WHERE YOU ARE
**[13:00 - 14:00]**

**[VISUAL: Decision flowchart building piece by piece.]**

Three questions to find your next move.

**Is your database the bottleneck?**  
Database maxed, n8n has headroom? Pantry problem.  
→ SQLite? Switch to PostgreSQL. Free.  
→ PG defaults? Apply PGTune. Also free.  
→ Already tuned? Bigger instance or queue mode.

**Is n8n the bottleneck?**  
Database fine, executions queuing up?  
→ Queue mode. Redis. Workers. The restaurant upgrade.

**Do you need high availability?**  
Can't afford downtime? Multiple teams?  
→ Multi-main. Enterprise license. The franchise.

**[VISUAL: Complete flowchart with costs annotated]**

Don't skip steps. Prove you need each level before paying for it.

---

## SEGMENT 8: THE BINARY REALITY CHECK
**[14:00 - 14:45]**

**[VISUAL: Quick chart — ~9 RPS flat across configs. Keep it brief and a bit tongue-in-cheek.]**

One workload breaks the pattern: large file processing.

Binary data — 2MB files in my test — caps at about 9 RPS regardless of configuration. SQLite, PostgreSQL, tuned, untuned. Same ceiling.

And queue mode? Doesn't just slow down. It straight up fails. HTTP 500 errors across the board.

Now — let's keep this between us — but I've heard rumors... maybe even *seen* some things... that the n8n team is building a new binary management system. If and when that ships, this whole picture could change. For now, if files are your primary workload, that's something to keep in mind.

For webhook and API workloads — which is what most people are scaling — the food truck, restaurant, franchise framework holds solid. Binary is the exception, not the rule.

> **Technical note:** The binary data test workflow receives a 2MB POST body, writes it to disk using the Write Binary File node, reads it back, and returns it via Respond to Webhook. The ~9 RPS ceiling comes from disk I/O and Node.js single-threaded file handling. Queue mode failures (HTTP 500) occur because binary data handling across the Redis queue has known limitations in the current version — the file references don't serialize correctly between main and worker processes.

---

## SEGMENT 9: RUNNING YOUR OWN BENCHMARKS
**[14:45 - 15:45]**

**[VISUAL: Screen recording — k6 running, results appearing, Beszel dashboard with live graphs.]**

Don't take my word for any of this. Run the tests yourself.

Controlled load at different levels — three, ten, thirty, fifty, a hundred, two hundred virtual users. Three scenarios: single webhook, multiple webhooks, binary data.

k6 for load generation — it's free and scriptable. Pair it with Beszel or Grafana for monitoring so you can watch where bottlenecks actually form in real time.

Test before changes. Test after. Compare. The numbers tell you what to do next.

That's how this whole framework was built. Not by reading docs or asking colleagues. By running the numbers until the architecture made sense.

---

## SEGMENT 10: CLOSING — STAY CURIOUS
**[15:45 - 17:00]**

**[VISUAL: The three restaurant images one final time, each lighting up. Numbers underneath. Then Angel to camera, genuine.]**

This whole video exists because I got curious about something I didn't understand.

I work at n8n. I talk to customers about architecture every day. And I couldn't confidently explain when to use what. That bothered me enough to spin up seven AWS configurations, run hundreds of benchmark tests, and break things until they made sense.

**[VISUAL: Each architecture lights up as named, with peak RPS]**

Food truck: 48 to 95 requests per second. Where everyone starts. Where most home users should stay. And with PGTune, you squeeze out more than you'd expect from a tiny kitchen.

Restaurant: 266 to 280. The workhorse. Where most production deployments belong. Robust by default — you don't even need to tune the database here.

Franchise: high availability, recipe testing at every location. When uptime is everything.

**[VISUAL: Full bar chart, split queue crossed out, recommended path highlighted]**

Remember — these are baselines on specific hardware, not hard limits. Every one of these architectures can push higher numbers with bigger instances and more workers. The framework tells you *which* architecture to invest in. The data tells you when you've outgrown it.

And one more time: the restaurant analogy isn't perfect. Software doesn't actually work like kitchens. But you don't need a perfect analogy — you need one that's *useful*. One that makes you go "oh, *that's* why I'd pick queue mode over split queue" without needing to read a whitepaper.

You don't need the biggest kitchen. You need the right kitchen for where you are today, with a clear path to the next one when you're ready.

PGTune link in the description. CloudFormation templates for automated deployment coming in the next video.

And if there's something about your setup that doesn't make sense to you? Don't just live with it. Investigate. Break something. Run the numbers.

Stay curious.

**[VISUAL: End card with links, subscribe button, "Stay Curious" text]**

---

# THUMBNAIL & TITLE IDEAS

## Titles

1. **"n8n Scaling: Food Truck, Restaurant, or Franchise?"**
2. "The 3 Ways to Run n8n (Most People Pick Wrong)"
3. "I Work at n8n and Didn't Understand Our Own Architecture"
4. "From 48 to 280 RPS: Which n8n Architecture Do You Actually Need?"

## Thumbnails

**Option 1: The Three Restaurants**
- Three panels: Food truck | Restaurant kitchen | Franchise map
- Each with peak RPS: 48 | 95 | 280
- Text: "WHICH ONE ARE YOU?"

**Option 2: The Confession**
- Angel looking surprised/curious
- n8n logo
- Text: "I didn't understand our own architecture"

**Option 3: The Performance Ladder**
- Three ascending steps with restaurant imagery
- 48 → 95 → 280 on each step
- Split queue falling off the side

---

# CHANGES IN V11

1. **Test kitchen / recipe testing area** woven into all three levels: food truck (taped-off corner), restaurant (dedicated section), franchise (one at every location for redundancy)
2. **Food truck explained for global audience** + disclaimer about being USA-based
3. **Analogy disclaimer** added — "not perfect, not supposed to be, here's why it's useful anyway"
4. **PGTune repositioned** — no longer its own segment, folded into food truck section as "the next step Marcus showed me." No vulnerability/self-deprecation here, just practical recommendation
5. **Queue tuning data** addressed directly — only 5% improvement, architecture handles it, you don't need to be a PG expert
6. **"Separation of concerns" line removed** — replaced with natural description of how restaurants organize differently
7. **Split queue hallway analogy** made funnier — waiter sprinting back and forth for every single order
8. **Binary data** — "keep it between us" / rumors tone instead of direct insider knowledge
9. **Numbers are baselines** — explicit note that these scale with hardware, not hard ceilings
10. **Technical notes** added as blockquotes — optional detail for technical viewers, skippable in delivery
11. **Fact-checked technical claims:**
    - SQLite single-threaded write lock: ✅ correct
    - PostgreSQL connection pool warm-up: ✅ explains low initial RPS
    - Redis as message broker in queue mode: ✅ correct (uses Redis lists)
    - Network latency in split mode: ✅ correct (round-trip per execution)
    - Binary 500s in queue mode: ✅ confirmed in our benchmarks (file reference serialization)
    - Multi-main leader election: ✅ correct (enterprise feature)
