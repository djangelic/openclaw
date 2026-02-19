# n8n Benchmarking V2: The Scaling Playbook

**Target Runtime:** 15-18 minutes

---

## SEGMENT 1: COLD OPEN
**[0:00 - 0:45]**
**[VISUAL: B-roll of food trucks and restaurants (establishing the analogy). Quick cuts to monitoring dashboards: low CPU/RAM but capped throughput. No on-location filming.]**

15 requests per second. On hardware that should handle 10 times that.

In my last video, I stress-tested n8n until it broke. Something in the data didn't add up.

Throughput flatlined — but CPU and RAM had capacity to spare. Something else was the bottleneck.

This video is the framework I use to find where bottlenecks live. A simple analogy — food truck, restaurant, franchise — over b-roll so the ideas stick. No fluff.

Let's go.

---

**[0:45 - 2:00] — INTRO CARD / CHANNEL BUMPER PLACEHOLDER**

*(Punchy beats, intro card, channel branding. Continue with restaurant/food b-roll.)*

---

## SEGMENT 2: THE FOOD TRUCK
**[2:00 - 4:00]**
**[VISUAL: B-roll of food trucks — cramped interior, single chef, one line. Overlay: single Docker container diagram. No on-location filming.]**

You can make great food in a food truck. But there's a physical limitation you can't engineer around.

Everything happens in one small space.

One person taking orders, cooking, and serving. One entrance. One exit. Slow day? Perfect. Lunch rush? That line grows. And no matter how talented your chef is, they can only move so fast.

That's single-main n8n. One Docker container handling webhooks, executions, database writes — everything in the same process, competing for the same resources.

Now, the food truck kitchen? It comes with a tiny pantry. A small cabinet. Even if the chef has energy to spare, if that pantry can't supply ingredients fast enough, everything slows down.

That's what my benchmarks showed. The n8n container had capacity. But the database — the pantry — was the choke point.

Works until it doesn't.

---

## SEGMENT 3: THE RESTAURANT
**[4:00 - 6:00]**
**[VISUAL: B-roll of restaurant interiors — front of house, kitchen, ticket rail, storage. Overlay: queue mode architecture with separate containers. No on-location filming.]**

Upgrade time. A proper restaurant.

Real building. Kitchen in the back with dedicated stations. Waiters handling front of house. A ticket rail where orders queue up. And a bigger pantry — one that, with a little work, can be tuned into a walk-in.

Welcome to queue mode. Still one location, but now you separate concerns. Docker Compose lets you spin up dedicated containers — webhook workers handling intake, execution workers processing jobs, all pulling from a shared Redis queue. Each execution worker is a cook — it picks up a workflow execution from the Redis queue and processes it independently. Work gets distributed instead of bottlenecking in one container.

In restaurant terms: waiters take orders and put tickets on the rail. Cooks pull tickets and work their stations. The pantry supplies ingredients to whoever needs them. When it's properly built out, the whole kitchen flows.

One limitation: your team shares a single UI instance for building and editing workflows. If that goes down, your developers can't work.

But when you outgrow even this...

---

## SEGMENT 4: THE FRANCHISE
**[6:00 - 7:30]**
**[VISUAL: B-roll of franchise / multi-location restaurants — map of locations, assembly line, multiple kitchens. Overlay: multi-main architecture with multiple UI instances. No on-location filming.]**

You go franchise.

Multiple locations. Multiple kitchens. Multiple front entrances. A customer walks into any location and gets the same menu, same experience. One location goes down? The others keep running.

And critically — multiple UI instances for your team. If one's unavailable, they switch to another and keep building.

That's multi-main mode, unlocked with an enterprise license. Multiple UI instances writing to the same Redis queue, sharing the same database. High availability. True redundancy.

Each location still needs a tuned database. Each still needs enough workers. But now if one instance has issues, everything keeps running from another.

The path: food truck → restaurant → franchise. Single main → queue mode → multi-main. Each step unlocks new capabilities, but each requires the foundation beneath it to be solid.

And that's where most people make their first mistake.

---

## SEGMENT 5: THE THREE BOTTLENECKS
**[7:30 - 9:00]**
**[VISUAL: Animated diagram showing three bottleneck types. Maybe split screen showing restaurant analogy on left, n8n architecture on right]**

Almost every n8n scaling problem falls into one of three buckets.

One: The database can't keep up.

PostgreSQL is overwhelmed. Workers are idle, ready to process, but they're waiting on queries to return. Executions back up even though you have the compute to handle them.

Two: Not enough workers.

The database is responsive, queries are fast, but there aren't enough execution workers to process the queue. Jobs pile up in Redis faster than they drain.

Three: The architecture itself is wrong.

Database is tuned, workers are busy, but you've hit the ceiling of your current topology. You need a different deployment model — or you're dealing with workloads like large binary processing that hit memory and disk I/O walls, not database walls.

Wrong diagnosis means wasted effort.

Adding workers when your database is the bottleneck? They idle waiting on queries. Scaling to multi-main with an untuned database? You're replicating the problem, not solving it.

Let's figure out which problem you have.

---

## SEGMENT 6: THE DATABASE BOTTLENECK — SYMPTOMS
**[9:00 - 11:00]**
**[VISUAL: Screen recording of benchmark results, monitoring dashboards. Highlight the disconnect between DB CPU at 100% and n8n container with headroom. Show the graphs climbing and flatlined throughput]**

Here's where we started in video one. A c5.large instance — two virtual CPUs, four gigs of RAM. PostgreSQL 16, n8n 1.99.1, single-main mode.

Single webhook test. Three virtual users: 15 requests per second. Ten users: still 15. Thirty, fifty, a hundred — stuck at 15 RPS. Response times climbing. Throughput flatlined.

At 200 virtual users, failures appear. 0.16%. Small, but they're there.

Now watch what happens with concurrency.

Multiple webhooks — ten different workflows triggered simultaneously. At 50 users, response times spike to 14 seconds. 1.6% failures. At 200 users? Nine percent failure rate. Response times over 34 seconds.

The system is running, but falling further behind with every request.

And here's what threw me.

The database is pegged. Full capacity. But the n8n container? Headroom. RAM available. CPU not maxed. The workers have capacity to spare, but the database can't return queries fast enough.

That's a database bottleneck. And once I understood that, the fix became obvious.

Most people see these symptoms and think: bigger database server. Or more workers. Upgrading that c5.large to a c5.xlarge would cost ~$50/month.

Neither is the first step.

The first step costs nothing.

---

## SEGMENT 7: PGTUNE — THE FREE OPTIMIZATION
**[11:00 - 13:30]**
**[VISUAL: Screen recording of PGTune website, filling in the form. Show the generated config. Then show the key YAML lines for docker-compose. Before/after pantry visual (cabinet → walk-in)]**

Not long after my first video went live, my colleague Marcus — Senior Solutions Engineer — reached out with a link. "You need to check this out."

PGTune. Been around for years. Industry standard for PostgreSQL configuration.

Almost nobody uses it for n8n deployments.

Here's what it solves.

PostgreSQL ships with a default config designed to run on anything — a Raspberry Pi, a shared VPS, a beefy cloud instance. Conservative defaults because they have to work everywhere. And n8n can't tune this for you either. They don't know your hardware.

Back to our analogy: every kitchen — food truck, restaurant, franchise — comes with the same tiny storage cabinet. Doesn't matter if you have space for a walk-in. By default? Cabinet.

PGTune fixes that. You tell it your hardware specs, your workload type, and it generates a config that uses what you've paid for.

Specific example. On our c5.large, `shared_buffers` goes from the default 128MB to 1GB — that's your hot data cache, the pages PostgreSQL keeps in memory instead of hitting disk. `effective_cache_size` tells the query planner how much total OS cache to expect, so it makes smarter decisions about index scans vs. sequential scans. `work_mem` controls per-operation sorting memory — bigger means fewer disk-based sorts during complex workflow history queries.

Those three settings alone transform how PostgreSQL handles n8n's workload.

Let me show the setup. We select PostgreSQL 16, Linux, our c5.large specs — 4 GB RAM, 2 CPUs. Workload type: "Mixed" since n8n does both reads and writes. Connection pool size: 100, realistic for n8n. Disk type: SSD on AWS EBS.

Where does this fit in your deployment? This isn't a "tune it later" thing. Apply these settings when you first spin up PostgreSQL.

Docker Compose — which most self-hosted deployments use — you mount a custom postgresql.conf and tell Postgres to use it:

```yaml
postgres:
  image: postgres:16
  volumes:
    - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
  command: postgres -c config_file=/etc/postgresql/postgresql.conf
```

Same hardware. Tuned database.

Let's see what happens.

---

## SEGMENT 8: THE RESULTS — TUNING PAYS OFF
**[13:30 - 15:00]**
**[VISUAL: Side-by-side before/after benchmark results. Animated bar charts showing 15 → 93 RPS. Response time drops. B-roll or graphics only.]**

Single webhook test. Before tuning: 15 requests per second, maxing out at 16 under heavy load.

We run the same test. Same instance. Same load profile. Same everything — except the database config. Three virtual users, ten, thirty, fifty, scaling up.

93 requests per second.

A 6x improvement. Same hardware. Zero dollars. Configuration only.

Remember that mystery from video one? The capacity sitting unused? This is where it went. The database was the bottleneck all along. Once PostgreSQL could use the resources it already had, the workers could process at full speed.

Response times dropped from 12 seconds at peak load to 2.1 seconds. Failures? We had 0.16% at 200 users before. After tuning: zero. Not a single failed request across the entire test.

Multiple webhooks — where we were struggling hardest. That 9% failure rate at 200 users? The 34-second response times?

After tuning: 92 requests per second. 10-second response times. Zero failures.

From buckling at moderate load to handling 200 concurrent users without dropping a request. Same box. Different config.

That's the pure win. No architecture changes. No new servers. No bigger instance. PostgreSQL was leaving performance on the table because nobody told it to use what it had.

---

## SEGMENT 9: THE DECISION FRAMEWORK
**[15:00 - 16:30]**
**[VISUAL: Flowchart building as you talk through each step. Could animate it appearing piece by piece. Show the 273 RPS result at the end with the scaling ladder graphic]**

Database tuned. Benchmarks running. How do you know what to fix next?

Here's the mental model.

Check your database metrics first. If DB CPU is above 80% while n8n CPU sits below 50%, you have a database problem. If both are high, you need more workers. If neither is high but throughput is flat, check your network latency or Redis queue depth.

Step one: Database maxed out, n8n container with headroom?

That's a database problem. Tune it with PGTune. If it's already tuned and still maxed, you've outgrown your current hardware — bigger instance for Postgres. But adding more workers here makes things worse. More processes hammering an already-saturated database.

Tuning is free. Always start here.

Step two: Database humming along, executions piling up in the queue?

That's the scaling problem you want to have. The database can keep up, but there aren't enough workers to drain the queue. Move to queue mode. Spin up dedicated webhook workers, execution workers, let Redis distribute the load.

Worker scaling is predictable. Each worker adds roughly linear throughput.

Step three: Everything maxed out? Database tuned, workers busy, still can't keep up?

Architecture wall. If you're on queue mode, it might be time for multi-main. If you're handling heavy binary workloads — large file uploads and processing — that's a different ceiling: memory, disk I/O, not the database. Binary data stayed flat at ~3 RPS before and after tuning in our tests — proof that not every bottleneck lives in PostgreSQL.

Architecture changes are expensive. That's why they're step three, not step one.

And when you do make that leap, the numbers speak for themselves.

c5.4xlarge with queue mode and a tuned database: 273 requests per second on single webhooks. 270 RPS on multi-webhook tests. 17 times baseline.

But notice the order. Tune the database first. Then scale the architecture. Tuning carries forward — it makes every subsequent step more effective.

Untuned single main → tuned single main → tuned queue mode → tuned multi-main. That's the path.

---

## SEGMENT 10: RUNNING YOUR OWN BENCHMARKS
**[16:30 - 17:30]**
**[VISUAL: Screen recording of benchmark workflow or k6 run; results in a spreadsheet. Beszel monitoring dashboard. No need to show or name any unreleased tool.]**

You can run these benchmarks yourself. The concept is straightforward: hit your n8n instance with controlled load at different levels — three users, ten, thirty, fifty, a hundred, two hundred — across the three scenarios: single webhook, multiple webhooks, binary data.

Capture requests per second, response times, and failure rates. Compare before and after tuning.

A basic k6 script that hits your webhook endpoint with ramping virtual users gets you there. Something like: start at 3 VUs, ramp to 50 over two minutes, hold for three, ramp down. I'll link a starter template in the description.

Pair that with Beszel for real-time monitoring — CPU, memory, Docker stats — and you can watch exactly where bottlenecks form as load increases.

The key: repeatable scenarios, controlled variables, real numbers. No guessing.

---

## SEGMENT 11: CLOSING
**[17:30 - 18:00]**
**[VISUAL: B-roll of restaurants / franchise locations. Links on screen: PGTune, description. No on-location filming.]**

Food truck → restaurant → franchise. Single main → queue mode → multi-main.

We started with a mystery: capacity sitting unused, throughput stuck at 15 requests per second. The fix wasn't bigger hardware. It wasn't more workers. It was telling PostgreSQL to use what it already had.

PGTune. Free. Zero infrastructure changes. 15 requests per second to 93 — six times the throughput on the same hardware. What would upgrading the instance have cost? Fifty bucks a month, minimum.

From there, when you need more throughput, queue mode. When you need redundancy, multi-main. Each step builds on the last, and tuning the database first makes every step after it more effective.

PGTune link is in the description. CloudFormation templates that automate the entire deployment? Next video.

Your database isn't slow. It was never configured to be fast.

---

# THUMBNAIL & TITLE IDEAS

## Title Options

**Option 1:** "Scale n8n Like a Restaurant Owner (The Framework That Saved Me 6x Performance)"

**Option 2:** "Why Your n8n Instance Is Starving (And the Free Fix Nobody Uses)"

**Option 3:** "From Food Truck to Franchise: The n8n Scaling Playbook"

## Thumbnail Options

**Option 1: The Convergence**
- B-roll or stock: food truck / restaurant / franchise imagery (no on-location)
- n8n logo in center
- Three icons: food truck, restaurant, franchise
- Text overlay: "THE SCALING PATH" or "6X FASTER"

**Option 2: The Mystery Solved**
- Split image: "15 RPS" with RAM/CPU meters showing available vs "93 RPS" with green checkmarks
- Small text: "Same hardware"

**Option 3: The Framework**
- Restaurant/franchise b-roll or diagram-style frame
- Overlay: Food Truck → Restaurant → Franchise
- n8n logo integrated
- Text: "THE PLAYBOOK" or "STOP GUESSING"

---

# VISUAL IDEAS BY SEGMENT

## Segment 1: Cold Open
- B-roll: food trucks, restaurants (establishing analogy)
- Quick cuts to monitoring dashboards (CPU/RAM low, capped at 15 RPS)
- No on-location filming

## Segment 2: Food Truck
- B-roll: cramped food truck interior, single chef, one line
- Overlay: single Docker container diagram; tiny pantry cabinet visual
- No on-location filming

## Segment 3: Restaurant
- B-roll: restaurant interior — front of house, kitchen, ticket rail, storage
- Overlay: queue mode architecture; waiters → ticket rail → cooks; "one test kitchen"
- No on-location filming

## Segment 4: Franchise
- B-roll: franchise / multi-location (map, assembly line, multiple kitchens)
- Overlay: multi-main architecture, multiple test kitchens
- No on-location filming

## Segment 5: Three Bottlenecks
- Animated diagram building out three bottleneck types
- Split screen: restaurant analogy on left, n8n architecture on right
- Color coding: red for bottleneck, green for healthy

## Segment 6: Database Bottleneck
- Screen recording of V1 benchmark results
- Monitoring dashboard with DB CPU at 100%, n8n container with headroom
- Graphs showing response times climbing, throughput flatlined
- Visual highlight of the disconnect

## Segment 7: PGTune
- Screen recording: PGTune website, filling in form
- Generated config appearing
- Key YAML lines highlighted
- Before/after pantry visual (cabinet → walk-in)

## Segment 8: Results
- Side-by-side before/after benchmark results
- Animated bar chart: 15 → 93 RPS
- Response time comparison: 12s → 2.1s
- Failure rate: 9% → 0%
- "Same hardware" callout

## Segment 9: Decision Framework
- Flowchart building piece by piece as you talk
- Three paths clearly labeled with costs (Free, Predictable, Expensive)
- Scaling ladder: 15 → 93 → 165 → 273 RPS
- Final architecture diagram

## Segment 10: Running Your Own Benchmarks
- Screen recording: benchmark run (k6 or internal workflow), results in spreadsheet
- Beszel monitoring dashboard
- No need to show or name unreleased tool

## Segment 11: Closing
- B-roll: restaurants / franchise (no on-location)
- Links on screen (PGTune, description)
- Simple recap graphic of the path

---

# YOUTUBE DESCRIPTION & CHAPTER MARKERS

## Description

Your n8n instance is capped at 15 requests per second — but CPU and RAM are barely breaking a sweat. What's the bottleneck?

In this video I break down the complete n8n scaling framework using a simple analogy: food truck → restaurant → franchise. You'll learn how to diagnose the three types of bottlenecks, why PostgreSQL's default config is leaving performance on the table, and how one free tool (PGTune) gave me a 6x throughput improvement on the same hardware.

This is the follow-up to my first n8n benchmarking video where I stress-tested n8n until it broke. This time, we fix it.

🔗 LINKS & RESOURCES
• PGTune (free PostgreSQL tuning): https://pgtune.leopard.in.ua/
• n8n (workflow automation): https://n8n.io
• n8n self-hosting docs: https://docs.n8n.io/hosting/
• n8n queue mode docs: https://docs.n8n.io/hosting/scaling/queue-mode/
• V1 Benchmarking Video: [LINK TO V1]
• Beszel (monitoring): https://github.com/henrygd/beszel
• k6 starter template: [LINK TO TEMPLATE]

📊 KEY RESULTS
• Before PGTune: 15 RPS (single webhook, c5.large)
• After PGTune: 93 RPS — 6x improvement, $0 cost
• Queue mode + tuned DB (c5.4xlarge): 273 RPS — 17x baseline
• Zero failed requests after tuning at 200 concurrent users

🏷️ TAGS
n8n benchmarking, n8n performance, n8n scaling, PGTune, PostgreSQL optimization, self-hosted n8n, n8n queue mode, n8n multi-main, workflow automation, n8n docker compose, n8n tutorial, n8n self-hosting guide, database tuning, PostgreSQL performance

## Chapter Markers

```
0:00 — The Mystery: Capacity Sitting Unused
0:45 — Intro
2:00 — The Food Truck (Single-Main n8n)
4:00 — The Restaurant (Queue Mode)
6:00 — The Franchise (Multi-Main)
7:30 — The Three Bottlenecks
9:00 — Database Bottleneck: The Symptoms
11:00 — PGTune: The Free Fix
13:30 — Results: 15 → 93 RPS (6x Improvement)
15:00 — The Decision Framework
16:30 — Running Your Own Benchmarks
17:30 — Closing: The Mystery Solved
```
