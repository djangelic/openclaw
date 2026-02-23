# n8n Scaling: Food Truck, Restaurant, Franchise

**Target Runtime:** 15-18 minutes  
**Framework:** Donald Miller's StoryBrand  
**n8n Version:** 2.8.3 (February 2026)

---

## StoryBrand Elements

- **Hero:** DevOps person — self-hosts at home, deploys enterprise at work  
- **Villain:** Complexity — everyone says "scale" but nobody shows which architecture to pick  
- **Guide:** Angel — broke n8n in V1, came back with a framework  
- **Plan:** Understand the three types → see the data → know your path  
- **Success:** Picking the right architecture the first time  
- **Failure avoided:** Burning money on the wrong one

---

## SEGMENT 1: COLD OPEN
**[0:00 - 1:00]**

**[VISUAL: Split screen — left: cozy food truck, center: busy restaurant kitchen, right: franchise map with multiple locations. Quick cuts between all three. n8n logo fades in.]**

There are three ways to run n8n. And most people pick the wrong one.

Not because they're bad engineers. Because nobody explains the actual difference in a way that sticks.

So here's what we're going to do. I'm going to show you the three architectures as three types of restaurants. Food truck, restaurant, franchise. I'll show you real benchmark data — requests per second, failure rates, the works — so you can see exactly what each one can handle.

By the end, you'll know which one you need. No guessing. No wasted money.

Let's eat.

**[VISUAL: Punchy title card: "Food Truck. Restaurant. Franchise." with the three images side by side]**

---

## SEGMENT 2: WHY THIS MATTERS — THE VILLAIN
**[1:00 - 2:00]**

**[VISUAL: Montage of forum posts, Stack Overflow questions, Discord messages asking "how do I scale n8n?" Screenshots of AWS bills. Architecture diagrams that look like subway maps.]**

Here's the problem.

You search "scale n8n" and you get: "Enable queue mode." "Use Redis." "Multi-main for HA." "Split your workers across instances."

That's like telling someone who's never run a kitchen: "Just open a franchise." Great. How?

The real question isn't "what are my options." It's "which option matches where I actually am."

Because if you're running a food truck and you try to operate like a franchise, you'll burn through money and end up worse off. And if you're ready for a franchise but still operating like a food truck, you're leaving performance on the table.

In my last video, I broke n8n at 15 requests per second and couldn't figure out why. This time, I tested every architecture. Seven configurations. Real hardware. Real data.

Here's what I found.

---

## SEGMENT 3: THE FOOD TRUCK — Single Instance Mode
**[2:00 - 5:00]**

**[VISUAL: B-roll of food trucks — one chef, cramped space, a line forming. Overlay: single Docker container diagram. Simple, contained.]**

### The Concept

The food truck. One vehicle. One chef. One tiny kitchen.

Everything happens in one place. Taking orders, cooking, plating, serving — all the same person, same space.

When business is slow? Perfect. The chef can handle it solo. But when the lunch rush hits, that line grows. And no matter how talented the chef is, one person can only move so fast.

This is **single instance n8n**. One Docker container. Webhooks, executions, database — all running in the same process.

And here's the thing about food trucks: they come with a tiny pantry. A small cabinet. Even if the chef has energy to spare, if the pantry can't supply ingredients fast enough, everything slows down.

### The Default: SQLite

When you first install n8n, it uses SQLite. That's the tiny pantry. Single-threaded. One access at a time.

I tested this on a c5.large instance — two CPUs, four gigs of RAM.

**[VISUAL: Animated bar chart building as numbers are read]**

- 3 virtual users: 47 requests per second
- 10 virtual users: 47 RPS
- 50 virtual users: 48 RPS
- 200 virtual users: 48 RPS

Flat line. Doesn't matter how many customers show up — 48 RPS is the ceiling. The chef has capacity, but the pantry has a lock that only one person can use at a time.

SQLite is **perfect** for getting started. For home projects. For learning n8n. For solo starters getting their feet wet. But it has a hard ceiling, and no amount of hardware will lift it.

### Upgrading the Pantry: PostgreSQL

Now, same food truck — same c5.large — but swap the tiny cabinet for a real pantry. PostgreSQL instead of SQLite.

**[VISUAL: Animation showing tiny cabinet morphing into proper shelving]**

- 3 virtual users: 8 RPS (cold start)
- 10 users: 18 RPS
- 50 users: 43 RPS
- 100 users: 59 RPS
- 200 users: 71 RPS

Something interesting here. The food truck isn't flat-lining anymore — it scales *up* under load. PostgreSQL manages resources intelligently. The more orders come in, the better it optimizes.

And here's the great news: **the n8n engineers already tuned the defaults for you.** Version 2.8.3 ships with solid PostgreSQL configuration out of the box. 71 RPS on default settings is a 48% improvement over SQLite with zero configuration.

**[VISUAL: Side-by-side: SQLite flat at 48 vs PG Default climbing to 71]**

### Who should be a food truck?

You. At home. Running personal automations, testing workflows, building integrations for fun or for small teams. Community edition, single instance, PostgreSQL.

This is your learning ground. And 71 requests per second handles a LOT of webhooks.

---

## SEGMENT 4: THE RESTAURANT — Queue Mode
**[5:00 - 8:30]**

**[VISUAL: B-roll of restaurant interior — ticket rail, multiple stations, waiters bringing orders, cooks at their posts. Overlay: queue mode architecture with Redis, webhook workers, execution workers.]**

### The Concept

One day, the food truck isn't enough. You've got real demand. Time for a proper restaurant.

A restaurant has something a food truck doesn't: **separation of concerns.**

Waiters handle the front of house. They take orders and put tickets on a rail. In the kitchen, cooks pull tickets from the rail and work their stations. The pantry supplies ingredients to whoever needs them.

Nobody's doing everything anymore. Each role is specialized.

This is **queue mode**. Redis is your ticket rail. Webhook workers are your waiters — they receive incoming requests and put them on the queue. Execution workers are your cooks — they pull jobs and process them.

Docker Compose lets you spin up as many workers as you need. Two cooks. Four cooks. Ten. As many as your kitchen can hold.

**[VISUAL: Architecture diagram building piece by piece — Redis in center, webhook workers on left, execution workers on right, all connecting to PostgreSQL]**

### The Data

I tested this on a c5.4xlarge — bigger instance, more power, room for multiple workers.

Queue mode with default settings:

- 3 virtual users: 221 RPS
- 10 users: 266 RPS
- 30 users: 266 RPS
- 50 users: 263 RPS
- 100 users: 255 RPS
- 200 users: 260 RPS

**[VISUAL: Bar chart JUMPING from food truck ~71 to restaurant ~266. Make this dramatic.]**

266 requests per second. That's nearly **4x** what the food truck could do. And look at that consistency — it barely drops under extreme load. The restaurant handles a packed house without breaking a sweat.

Zero failures. Every single request served. At every load level.

Multiple webhooks — ten different workflows triggered simultaneously? 263 RPS. Almost identical. The restaurant handles variety as well as it handles volume.

### The Trade-off

But there's something you need to know about this restaurant.

You can have as many cooks and waiters as you want. But there's only **one test kitchen**. One place where your recipe developers — your workflow builders — can create and refine the menu.

If that test kitchen goes down, your developers can't work. In n8n terms, that's your single UI instance. If it goes down, nobody can build or edit workflows.

Your cooks keep cooking — active workflows keep running. But nobody can make changes until the test kitchen is back.

**[VISUAL: "Test Kitchen CLOSED" sign on one room, while the main kitchen keeps running]**

On community edition, this is as far as you go. And honestly? For most deployments, 266 RPS with a well-configured restaurant is more than enough.

### Who should be a restaurant?

Teams running production workflows. Companies with enough volume that a single instance can't keep up. Anyone who needs reliable, high-throughput automation.

Queue mode is the workhorse. Most people who think they need a franchise actually just need a well-run restaurant.

---

## SEGMENT 5: THE FRANCHISE — Multi-Main Mode
**[8:30 - 10:30]**

**[VISUAL: B-roll of franchise operations — map with multiple pins, multiple restaurant interiors, assembly line efficiency. Overlay: multi-main architecture with multiple UI instances.]**

### The Concept

The franchise. Multiple locations. Multiple kitchens. Multiple front entrances.

A customer walks into any location and gets the same menu, same experience. If one location goes down, the others keep running.

And most importantly — **multiple test kitchens**. Your recipe developers can work from any location. If one is closed, they walk to another.

This is **multi-main mode**, available with an enterprise license. Multiple UI instances. Multiple entry points. True high availability.

All locations share the same Redis queue. Same database. Same recipes. But if one main instance has a problem, the others handle traffic automatically.

**[VISUAL: Map with multiple restaurant pins, each connected to a shared database in the center]**

### When You Actually Need This

You need multi-main when:

- **Uptime is non-negotiable.** Your workflows can't afford even minutes of downtime.
- **Multiple teams need simultaneous access.** Developers building workflows across different locations/time zones.
- **Regulatory requirements** demand redundancy.

You don't need it when you just want more speed. Queue mode already gives you that.

### The Surprise: Don't Split What Works

Now here's something that surprised me in testing.

I tested split queue mode — running the main instance on one machine and workers on a separate, bigger machine. In theory, more total hardware should mean more performance.

**[VISUAL: Two separate buildings connected by a road with traffic jams]**

Split queue: 128 RPS.  
All-in-one queue: 266 RPS.

**More hardware, LESS performance.**

This is like opening a second restaurant location but connecting the kitchens with a hallway between buildings. Orders get passed back and forth. The communication overhead — network latency between instances — kills the efficiency gains.

**[VISUAL: Side-by-side: Single restaurant at 266 vs Split at 128, with "Network Latency" shown between the split buildings]**

The lesson: don't over-engineer. If everything fits in one well-built restaurant, keep it there. Only go multi-location when you need the *redundancy*, not the speed.

---

## SEGMENT 6: THE COMPLETE PICTURE
**[10:30 - 12:00]**

**[VISUAL: All configurations side by side in one animated chart. The full scaling ladder building piece by piece.]**

Let's put it all together.

**[VISUAL: Animated bar chart, each bar appearing as it's named]**

| Architecture | Instance | Peak RPS | Cost Level |
|---|---|---|---|
| SQLite (Food Cart) | c5.large | 48 | $ |
| PostgreSQL Default (Food Truck) | c5.large | 71 | $ |
| PostgreSQL Tuned (Food Truck+) | c5.large | 95 | $ |
| Queue Default (Restaurant) | c5.4xlarge | 266 | $$ |
| Queue Tuned (Restaurant+) | c5.4xlarge | 280 | $$ |
| Split Queue (Bad Franchise) | c5.xlarge + c5.4xlarge | 128 | $$$ |
| Multi-Main (Franchise) | Enterprise | HA + Scale | $$$$ |

The progression is clear. Each step up gets you more capability, but costs more — in money and complexity.

**[VISUAL: Arrow showing the path: 48 → 71 → 95 → 266 → 280]**

Notice what's NOT on this path: split queue. It costs more and delivers less. It's the franchise that tries to run two kitchens connected by a bad hallway.

The smart path goes: SQLite → PostgreSQL → PostgreSQL tuned → queue mode. Multi-main when you need redundancy, not speed.

---

## SEGMENT 7: HOW TO KNOW WHERE YOU ARE
**[12:00 - 13:30]**

**[VISUAL: Decision flowchart building piece by piece. Three questions, three paths.]**

Here's how you figure out your next move.

**Question 1: Is your database the bottleneck?**

Watch your monitoring. Database CPU maxed, n8n container has headroom? That's a pantry problem.

- On SQLite? Switch to PostgreSQL. Free.
- On PostgreSQL defaults? Try PGTune. Also free.
- Already tuned? You need a bigger kitchen.

**Question 2: Is n8n itself the bottleneck?**

Database is fine, but executions are queuing up?

Time for queue mode. Add Redis, spin up workers. This is the restaurant upgrade.

**Question 3: Do you need high availability?**

Single point of failure is unacceptable? Multiple teams need simultaneous UI access?

Multi-main. Enterprise license. The franchise.

**[VISUAL: Complete flowchart with all three paths, annotated with costs]**

Don't skip steps. Prove you need each level before paying for it.

---

## SEGMENT 8: THE BINARY REALITY CHECK
**[13:30 - 14:00]**

**[VISUAL: Brief chart showing ~9 RPS across all configs for binary data. Keep it quick.]**

One workload breaks the pattern: binary data.

Large file processing — 2MB files in my test — caps around 9 RPS regardless of configuration. SQLite, PostgreSQL, tuned, untuned. Same ceiling.

Queue mode? Actually fails entirely on binary workloads right now. HTTP 500 errors.

The n8n team is building a new binary management system — I've seen the beta internally. When that ships, this picture changes. For now, if your primary workload is file processing, keep that in mind.

But for webhook and API workloads — which is what most people are scaling — the framework holds.

---

## SEGMENT 9: THE FREE OPTIMIZATION — PGTUNE
**[14:00 - 15:30]**

**[VISUAL: Screen recording of PGTune website. Form filling. Generated config. AI generating Docker Compose. YAML highlighted.]**

Before I go, there's one thing you should do regardless of which architecture you pick.

This is PGTune. Free. Takes five minutes. Industry standard for PostgreSQL optimization.

PostgreSQL ships with conservative defaults — it has to work on a Raspberry Pi and a 64-core server. PGTune generates a config that matches YOUR actual hardware.

For our c5.large: PostgreSQL default gave us 71 RPS. With PGTune: 95 RPS. That's 34% improvement, zero cost.

**[VISUAL: PGTune form: PostgreSQL 16, Linux, 4GB RAM, 2 CPUs, Mixed workload, 100 connections, SSD]**

Here's the docker-compose trick: take PGTune's output, paste it into Claude or Cursor, say "generate a docker-compose for n8n with these PostgreSQL settings." Done.

```yaml
postgres:
  image: postgres:16
  volumes:
    - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
  command: postgres -c config_file=/etc/postgresql/postgresql.conf
```

The tuning carries forward to every architecture level. Whether you're running a food truck or a franchise, a well-stocked pantry makes everything run better.

PGTune link is in the description. Use it.

---

## SEGMENT 10: RUNNING YOUR OWN BENCHMARKS
**[15:30 - 16:30]**

**[VISUAL: Screen recording of k6 running, results appearing, Beszel monitoring dashboard with live CPU/memory graphs.]**

You don't have to take my word for any of this. Run the same tests yourself.

Controlled load at different levels — three users, ten, thirty, fifty, a hundred, two hundred. Three scenarios: single webhook, multiple webhooks, binary data.

I use k6 for load generation — free and scriptable. Pair it with monitoring so you can watch where bottlenecks form in real time.

The key: test before AND after changes. Numbers don't lie. If PGTune doesn't help your specific workload, you haven't wasted anything. If queue mode doesn't improve things, you know it's a different bottleneck.

Measure, change, measure again.

---

## SEGMENT 11: CLOSING
**[16:30 - 17:30]**

**[VISUAL: The three restaurant images side by side one final time. Performance numbers underneath each. Links on screen.]**

Food truck. Restaurant. Franchise.

**[VISUAL: Each lights up as named]**

48 requests per second with SQLite. Perfect for getting started.

71 with PostgreSQL defaults. Solid for production.

95 with PGTune optimization. Free improvement, no excuses.

266 with queue mode. The workhorse for serious scale.

280 with queue mode tuned. Squeezing out every last drop.

**[VISUAL: The full bar chart one more time, with the split queue conspicuously absent from the "recommended path"]**

You don't need the biggest kitchen. You need the right kitchen for where you are today, with a clear path to the next one when you're ready.

That's the framework. Stop guessing, start measuring, and scale with confidence.

PGTune link in the description. CloudFormation templates for automated deployment are coming in the next video.

Drop a comment — are you a food truck, a restaurant, or ready for franchise?

Until next time.

---

# THUMBNAIL & TITLE IDEAS

## Titles

1. **"n8n Scaling: Food Truck, Restaurant, or Franchise?"** ← Angel's preferred direction
2. "The 3 Ways to Run n8n (Pick the Wrong One and Burn Money)"
3. "How Do I Scale n8n Without Lighting Money on Fire?"
4. "From 48 to 280 RPS: Which n8n Architecture Do You Actually Need?"

## Thumbnails

**Option 1: The Three Restaurants** ← Matches Angel's vision
- Three panels: Food truck | Restaurant kitchen | Franchise map
- Each labeled with peak RPS: 48 | 95 | 280
- n8n logo centered
- Text: "WHICH ONE ARE YOU?"

**Option 2: The Wrong Choice**
- Left: beautiful franchise with $$$ burning
- Right: efficient restaurant with green checkmarks
- Text: "STOP OVERPAYING" or "DON'T DO THIS"

**Option 3: The Performance Ladder**
- Ascending steps: Food truck → Restaurant → Franchise
- Numbers on each step: 48 → 95 → 280
- Angel pointing at the restaurant step (where most people should be)

---

# KEY STRUCTURAL CHANGES FROM V9

1. **The three architectures ARE the story** — each gets a full segment explaining the concept (restaurant analogy), showing data, and defining who should use it
2. **PGTune moved to end** — it's a bonus tip/optimization, not the central narrative
3. **Split queue is a cautionary tale** — embedded in the franchise section as "what NOT to do"
4. **Thumbnail-first thinking** — the three restaurants visual works for both the video structure and the thumbnail
5. **Simpler flow** — Concept → Data → Who it's for, repeated three times, then decision framework + tips
6. **Multi-main positioned honestly** — it's about HA/redundancy, not raw performance
