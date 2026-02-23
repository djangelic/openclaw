# n8n Scaling: Food Truck, Restaurant, Franchise

**Target Runtime:** 15-18 minutes  
**Framework:** Donald Miller's StoryBrand  
**n8n Version:** 2.8.3 (February 2026)

---

## StoryBrand Elements

- **Hero:** Angel (and by extension, the viewer) — curious enough to ask "why don't I understand this?"  
- **Villain:** Complexity that nobody bothers to demystify  
- **Guide:** The data — real benchmarks that replace guessing with knowing  
- **Plan:** Understand the three types → see the data → know your path  
- **Transformation:** "I didn't understand our own architecture" → "Now I can explain it with food"  
- **Tagline thread:** "Stay curious" — curiosity is what started this entire investigation

---

## SEGMENT 1: COLD OPEN — THE CONFESSION
**[0:00 - 1:30]**

**[VISUAL: Angel talking to camera, honest and direct. Cut to: n8n architecture docs, complex diagrams. Then: food truck, restaurant, franchise b-roll montage.]**

I work at n8n. I'm a Solutions Engineer. And until recently, I didn't fully understand our own architecture.

Single main. Queue mode. Multi-main. I knew the words. I could point at diagrams. But if you asked me "when should I use which one, and what's the actual difference in performance?" — I'd be guessing.

And that bothered me. Because if *I* don't understand it — someone who works here — how is the community supposed to figure it out?

So I did what I always do when something doesn't make sense. I got curious. I broke things. I benchmarked everything. And I came back with a framework that I think makes it click.

Three architectures. Three types of restaurants. Food truck, restaurant, franchise. Real numbers showing exactly what each one can handle.

By the end of this video, you'll understand n8n's architecture better than most people who deploy it. And you'll know exactly which one you need.

Let's eat.

**[VISUAL: Title card — "Food Truck. Restaurant. Franchise." with the three images. Punchy music hit.]**

---

## SEGMENT 2: WHY NOBODY UNDERSTANDS THIS
**[1:30 - 2:30]**

**[VISUAL: Montage of forum posts, Discord questions, Stack Overflow — "how do I scale n8n?" Screenshots of AWS bills. Architecture diagrams that look like subway maps.]**

Here's what happens when you search "scale n8n."

"Enable queue mode." "Use Redis-s." "Multi-main for HA." "Split your workers."

That's like telling someone who's never cooked: "Just open a franchise." Great. How?

The documentation tells you what's *possible*. It doesn't tell you what you *should* do. And when you're staring at a cloud bill that's climbing every month, "possible" isn't good enough.

I realized the reason this is confusing is that nobody puts the architectures side by side and shows what they actually do under pressure. Everyone explains the theory. Nobody shows the receipts.

So I ran the receipts. Seven different configurations. Same benchmark tests. Real hardware on AWS. Let me show you what I found — starting with where everyone begins.

---

## SEGMENT 3: THE FOOD TRUCK — Single Instance Mode
**[2:30 - 5:30]**

**[VISUAL: B-roll of food trucks — one chef, cramped space, a line forming outside. Overlay: single Docker container diagram.]**

### The Concept

The food truck. One vehicle. One chef. One tiny kitchen.

Everything happens in one space. Taking orders, cooking, plating, serving — all the same person. When it's quiet, it's beautiful. Simple. Efficient.

But when the lunch rush hits, that line grows. And no matter how talented the chef is, one person can only plate so fast.

This is **single instance n8n**. One Docker container handling webhooks, executions, database writes — everything in the same process.

And every food truck comes with a tiny pantry. A small cabinet. Even if the chef has energy to cook, if the pantry can't supply ingredients fast enough, everything slows down.

### SQLite — The Tiny Pantry

When you first install n8n, it uses SQLite. That's the default. The tiny pantry with a lock that only one person can open at a time.

I tested this on a c5.large — two CPUs, four gigs of RAM.

**[VISUAL: Animated bar chart, flat line building across VU levels]**

- 3 virtual users: 47 requests per second  
- 10 users: 47  
- 50 users: 48  
- 200 users: 48  

Flat line. Hard ceiling at 48 RPS. Doesn't matter how many customers show up.

That's not a CPU problem or a memory problem. SQLite is single-threaded by design. The chef has energy to spare, but the pantry only lets one person in at a time.

This is **perfect for getting started**. Home projects. Learning n8n. Solo starters getting their feet wet. But it has a ceiling you can't lift with hardware.

### PostgreSQL — A Real Pantry

Same food truck. Same c5.large. But swap the tiny cabinet for proper shelving. PostgreSQL instead of SQLite.

**[VISUAL: Animation — tiny cabinet morphs into organized shelving]**

- 3 users: 8 RPS (cold start, the kitchen's warming up)  
- 10 users: 18 RPS  
- 50 users: 43 RPS  
- 100 users: 59 RPS  
- 200 users: 71 RPS  

Now it scales *up* under load. PostgreSQL manages resources intelligently — the more orders come in, the better it optimizes.

And here's something I was genuinely surprised to find: **the n8n engineers already tuned the defaults well.** Version 2.8.3 ships PostgreSQL configuration that gets you to 71 RPS out of the box. That's a 48% jump over SQLite, zero configuration required.

**[VISUAL: Side-by-side — SQLite flat at 48 vs PG Default climbing to 71]**

When I first saw this data, I felt a little dumb. I'd been telling people they needed to tune everything, and it turns out our engineers had already done a solid job on the defaults. That's what curiosity does though — sometimes you find out the thing you were worried about was already handled.

### Who's a food truck?

You, at home. Running personal automations. Small teams. Community edition, single instance, PostgreSQL. This is your learning ground. And 71 RPS handles a LOT of webhooks.

---

## SEGMENT 4: THE RESTAURANT — Queue Mode
**[5:30 - 9:00]**

**[VISUAL: B-roll of restaurant kitchen — ticket rail, multiple stations, waiters and cooks coordinating. Overlay: queue mode architecture with Redis, webhook workers, execution workers.]**

### The Concept

One day the food truck isn't enough. Real demand. Time for a proper restaurant.

A restaurant has something a food truck doesn't: **separation of concerns.**

Waiters handle the front of house — take orders, put tickets on a rail. In the kitchen, cooks pull tickets and work their stations. The pantry supplies ingredients to whoever needs them.

Nobody does everything anymore. Each role is specialized.

This is **queue mode**. Redis-s is your ticket rail. Webhook workers are your waiters — they receive requests and queue them up. Execution workers are your cooks — they pull jobs and process them.

Docker Compose lets you spin up as many workers as your kitchen can hold.

**[VISUAL: Architecture diagram building piece by piece — Redis center, webhook workers left, execution workers right, PostgreSQL at bottom]**

### The Data

I tested this on a c5.4xlarge — bigger instance, more CPU, room for multiple workers.

**[VISUAL: Bar chart JUMPING dramatically from ~71 to ~266]**

Queue mode with default settings:

- 3 users: 221 RPS  
- 10 users: 266 RPS  
- 30 users: 266 RPS  
- 100 users: 255 RPS  
- 200 users: 260 RPS  

266 requests per second. **Nearly 4x** the food truck. And it barely flinches under extreme load. Zero failures at every level.

Multiple webhooks — ten different workflows triggered simultaneously? 263 RPS. The restaurant handles variety as well as volume.

This was the moment in my testing when I went "oh — *that's* what queue mode is for." I'd understood it conceptually. But seeing the number jump from 71 to 266? That's when the architecture clicked for me.

### The One Caveat

There's something you need to know about this restaurant.

You can have as many cooks and waiters as you want. But there's only **one test kitchen**. One place where your recipe developers can create and refine the menu.

If that test kitchen goes down, your team can't build or edit workflows. The cooks keep cooking — active workflows keep running. But nobody can make changes until it's back.

**[VISUAL: "Test Kitchen CLOSED" sign, while main kitchen keeps humming]**

On community edition, this is as far as you go. And for most deployments? 266 RPS is more than enough.

### Who's a restaurant?

Teams running production workflows. Companies with real volume. Anyone who needs reliable, high-throughput automation without enterprise licensing.

Queue mode is the workhorse. Most people who think they need a franchise actually just need a well-run restaurant.

---

## SEGMENT 5: THE FRANCHISE — Multi-Main Mode
**[9:00 - 11:00]**

**[VISUAL: B-roll of franchise — map with pins, multiple restaurants, assembly line. Overlay: multi-main architecture.]**

### The Concept

The franchise. Multiple locations. Multiple kitchens. Multiple entrances.

A customer walks into any location — same menu, same experience. If one goes down, the others keep running.

And multiple test kitchens. Your recipe developers work from any location. One closes? Walk to another.

This is **multi-main mode**. Enterprise license. Multiple UI instances. True high availability. All sharing the same Redis queue, same database.

**[VISUAL: Map with restaurant pins, each connected to shared database center]**

### When You Actually Need This

You need multi-main when:

- **Uptime is non-negotiable.** Minutes of downtime cost real money.  
- **Multiple teams** need simultaneous UI access across locations or time zones.  
- **Compliance** requires redundancy.  

You don't need it for speed. Queue mode already gives you that.

### The Surprise That Changed How I Think About This

Here's where curiosity paid off in a way I didn't expect.

I tested split queue mode — main instance on one machine, workers on a separate bigger machine. More total hardware. Should be faster, right?

**[VISUAL: Two buildings connected by a road with traffic jam between them]**

Split queue: **128 RPS.**  
All-in-one queue: **266 RPS.**

More hardware. Less performance.

**[VISUAL: Side-by-side — single building at 266 vs two buildings at 128, "NETWORK LATENCY" stamped on the road between them]**

I stared at this data for a while. Then it clicked.

It's like opening a second restaurant location connected by a hallway between buildings. Every order gets passed back and forth through that hallway. The communication overhead — network latency between instances — eats the hardware gains alive.

If everything fits in one well-built restaurant, keep it there. Only go multi-location when you need **redundancy**, not speed.

This is why you benchmark instead of assume. I would have deployed split queue at work and wasted money if I hadn't run the numbers first.

---

## SEGMENT 6: THE COMPLETE PICTURE
**[11:00 - 12:30]**

**[VISUAL: All configurations in one animated chart, each bar appearing as named. The full scaling ladder.]**

Let's put the whole menu on the table.

**[VISUAL: Bars building one by one]**

| Architecture | Instance | Peak RPS | Cost |
|---|---|---|---|
| SQLite (Tiny Pantry) | c5.large | 48 | $ |
| PostgreSQL Default (Food Truck) | c5.large | 71 | $ |
| PostgreSQL Tuned (Food Truck+) | c5.large | 95 | $ |
| Queue Default (Restaurant) | c5.4xlarge | 266 | $$ |
| Queue Tuned (Restaurant+) | c5.4xlarge | 280 | $$ |
| Split Queue (Bad Idea) | c5.xlarge + c5.4xlarge | 128 | $$$ |
| Multi-Main (Franchise) | Enterprise | HA + Scale | $$$$ |

**[VISUAL: Arrow showing the recommended path: 48 → 71 → 95 → 266 → 280, with split queue crossed out]**

The path is clear. Each step gets you more, costs more. And split queue — more money for less performance — isn't on the path at all.

---

## SEGMENT 7: HOW TO KNOW WHERE YOU ARE
**[12:30 - 13:30]**

**[VISUAL: Decision flowchart building piece by piece.]**

Three questions to find your next move.

**Is your database the bottleneck?**  
Database maxed, n8n has headroom? Pantry problem.  
→ SQLite? Switch to PostgreSQL. Free.  
→ PG defaults? Try PGTune. Also free.  
→ Already tuned? Bigger kitchen or queue mode.

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
**[13:30 - 14:00]**

**[VISUAL: Quick chart — ~9 RPS flat across configs. Brief.]**

One workload breaks the pattern: large file processing.

Binary data — 2MB files — caps at about 9 RPS regardless of configuration. Queue mode actually fails entirely on binary right now.

The n8n team is building a new binary management system. I've seen the beta internally. When that ships, this changes. For now, if files are your primary workload, keep that in mind.

For webhook and API workloads — which is what most people are scaling — the framework holds solid.

---

## SEGMENT 9: THE FREE OPTIMIZATION — PGTUNE
**[14:00 - 15:30]**

**[VISUAL: Screen recording — PGTune website, form, generated config. AI generating Docker Compose.]**

One more thing before you go. Regardless of which architecture you pick, do this.

PGTune. Free. Five minutes. Industry standard.

PostgreSQL ships with conservative defaults that work everywhere — Raspberry Pi to 64-core server. PGTune generates a config for YOUR hardware.

On our c5.large: default PostgreSQL gave us 71 RPS. With PGTune: **95 RPS**. That's 34% for free.

**[VISUAL: PGTune form — PostgreSQL 16, Linux, 4GB RAM, 2 CPUs, Mixed, 100 connections, SSD]**

Docker-compose trick: paste PGTune output into Claude or Cursor, say "generate a docker-compose for n8n with these PostgreSQL settings." Done.

```yaml
postgres:
  image: postgres:16
  volumes:
    - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
  command: postgres -c config_file=/etc/postgresql/postgresql.conf
```

This optimization carries forward to every level. Food truck or franchise — a well-stocked pantry makes everything better.

Link in the description. Use it.

---

## SEGMENT 10: RUNNING YOUR OWN BENCHMARKS
**[15:30 - 16:30]**

**[VISUAL: Screen recording — k6 running, results appearing, Beszel dashboard with live graphs.]**

Don't take my word for it. Run the tests yourself.

Controlled load at different levels — three, ten, thirty, fifty, a hundred, two hundred virtual users. Three scenarios: single webhook, multiple webhooks, binary data.

k6 for load generation. Free, scriptable. Beszel or Grafana for monitoring. Watch where the bottleneck actually forms.

Test before changes. Test after. Compare. The data tells you what to do next.

That's how I got here. Not by reading docs or asking colleagues. By running the numbers until the architecture made sense.

---

## SEGMENT 11: CLOSING — STAY CURIOUS
**[16:30 - 17:30]**

**[VISUAL: The three restaurant images one final time, each lighting up. Numbers underneath. Then Angel to camera, genuine.]**

This whole video exists because I got curious about something I didn't understand.

I work at n8n. I talk to customers about architecture every day. And I couldn't confidently explain when to use what. That bothered me enough to spin up seven AWS configurations, run hundreds of benchmark tests, and break things until they made sense.

**[VISUAL: Each architecture lights up as named, with peak RPS]**

Food truck: 48 to 71 requests per second. Where everyone starts. Where most home users should stay.

Restaurant: 266 to 280. The workhorse. Where most production deployments belong.

Franchise: high availability, multiple test kitchens. When uptime is everything.

**[VISUAL: The full bar chart one final time, split queue crossed out, recommended path highlighted]**

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

**Option 1: The Three Restaurants** ← Matches the story  
- Three panels: Food truck | Restaurant kitchen | Franchise map  
- Each with peak RPS: 48 | 95 | 280  
- Text: "WHICH ONE ARE YOU?"

**Option 2: The Confession**  
- Angel with surprised/curious expression  
- n8n logo  
- Text: "I didn't understand our own architecture"

**Option 3: The Performance Ladder**  
- Three ascending steps with restaurant imagery  
- 48 → 95 → 280 on each step  
- Split queue shown falling off the side  

---

# CURIOSITY THREAD THROUGHOUT

The "stay curious" tagline weaves through the script at key moments:

1. **Cold open:** "I got curious. I broke things. I benchmarked everything."
2. **PG Default surprise:** "That's what curiosity does — sometimes you find out the thing you were worried about was already handled."
3. **Queue mode click:** "This was the moment... seeing the number jump? That's when the architecture clicked for me."
4. **Split queue lesson:** "This is why you benchmark instead of assume. I would have deployed split queue at work and wasted money."
5. **Closing:** "This whole video exists because I got curious about something I didn't understand... Stay curious."

The hero's journey is Angel's own: didn't understand → got curious → investigated → broke things → came back with clarity → shares the framework so others don't have to guess.
