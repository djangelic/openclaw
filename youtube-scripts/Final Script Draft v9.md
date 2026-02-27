# n8n Enterprise Benchmarking V2: How Do I Scale n8n Without Lighting Money on Fire?

**Target Runtime:** 15-18 minutes  
**Framework:** Donald Miller's StoryBrand  
**n8n Version:** 2.8.3 (February 2026)

---

## StoryBrand Elements Applied

**Hero:** DevOps person who self-hosts n8n at home (community edition) and deploys enterprise architecture at work  
**Villain:** Complexity — everyone says "just scale" but nobody shows HOW  
**Guide:** Angel — who broke n8n in V1 and came back with answers  
**Plan:** Food truck → Restaurant → Franchise (single → queue → multi-main)  
**Call to Action:** Run your own benchmarks, use the decision framework  
**Success:** Knowing exactly which config to run, no wasted money  
**Failure avoided:** Burning cloud budget on the wrong architecture

---

## SEGMENT 1: COLD OPEN — THE HERO'S PROBLEM
**[0:00 - 0:45]**

[VISUAL: B-roll of food trucks and restaurants. Quick cuts to monitoring dashboards showing low CPU/RAM but capped throughput at 48 RPS.]

You know that feeling when everyone says "just scale it" but nobody shows you how?

You're comfortable with n8n community edition at home. Maybe you're running a few workflows, handling some API integrations. It works great.

But now you're deploying enterprise architecture at work. Suddenly you're staring at cloud bills that could light money on fire if you guess wrong.

Queue mode? Multi-main? Split configurations? The documentation tells you what's possible, but not what you should actually choose.

This video is the decision framework that will save you from burning cloud budget on the wrong architecture.

Let's go.

[VISUAL: Title card with restaurant/franchise b-roll]

---

## SEGMENT 2: THE VILLAIN — COMPLEXITY WITHOUT CLARITY
**[0:45 - 2:00]**

[VISUAL: Screenshots of n8n documentation, architectural diagrams, AWS pricing calculator]

Here's what happens when you search for n8n scaling advice.

"Just enable queue mode." "Use Redis." "Scale your workers." "Multi-main for high availability."

Everyone tells you the options. Nobody tells you when to use them.

So you start guessing. Maybe you spin up a c5.4xlarge because "bigger is better," right? You enable queue mode because it sounds enterprise-y. You add Redis because everyone says you need it.

Three months later, your cloud bill is 10x what you expected, and you're hitting the same bottlenecks as before.

The problem isn't that the solutions don't work. The problem is that most people fix the wrong thing first.

They add more cooks when the pantry is the bottleneck. They upgrade to a bigger kitchen when the current one isn't being used properly.

In my first video, I stress-tested n8n until it broke at 15 requests per second. But something didn't add up. The instance had CPU and RAM to spare, but throughput was flatlined.

I thought I needed bigger hardware. I was wrong.

The real problem was much simpler.

---

## SEGMENT 3: THE GUIDE'S JOURNEY — FOOD TRUCK FOUNDATIONS
**[2:00 - 4:00]**

[VISUAL: B-roll of food trucks — cramped interior, single chef, one line. Overlay: SQLite database icon, single Docker container diagram]

Let me show you what I learned, using an analogy that makes the architecture decisions obvious.

Think of n8n scaling like growing a food business.

You start with a food truck. Everything happens in one small space. One person taking orders, cooking, and serving. One entrance. One exit.

When business is slow, it's perfect. The chef can handle ten, maybe twenty orders without breaking a sweat.

But every food truck comes with a tiny pantry. A small cabinet for storage. Even if the chef has energy to cook, if that pantry can't supply ingredients fast enough, everything slows down.

This is n8n with SQLite — the default database that ships with community edition.

I tested this in February 2026 with n8n version 2.8.3. SQLite on a c5.large instance: 48 requests per second. Consistently. Whether I sent 3 virtual users or 200, it topped out at 48 RPS.

[VISUAL: Benchmark results showing SQLite flat line at 48 RPS across all user loads]

That's not a CPU problem. That's not a memory problem. SQLite is single-threaded by design. It's like having a pantry with a lock that only one person can open at a time.

SQLite works perfectly for getting started. For learning n8n. For home projects. But when multiple workflows try to write to the database simultaneously, they have to wait in line.

The chef stands there ready to cook, but the pantry becomes the bottleneck.

If this sounds familiar — if you're seeing your n8n instance plateau even though the server has capacity — this might be your first clue.

---

## SEGMENT 4: THE RESTAURANT — BUILDING A PROPER PANTRY
**[4:00 - 6:30]**

[VISUAL: B-roll of restaurant interiors — kitchen, storage room, multiple staff. Overlay: PostgreSQL logo, same c5.large instance]

Now imagine you upgrade to a proper restaurant.

You've got the same square footage — same c5.large instance — but now you can build a real pantry. PostgreSQL instead of SQLite. Multiple cooks can access ingredients simultaneously. The database can handle concurrent reads and writes.

And here's the thing: the n8n engineers already tuned the defaults for you.

PostgreSQL default configuration with n8n 2.8.3: 71 requests per second. That's a 48% improvement over SQLite, just by switching databases. Same hardware, same workflows, much better pantry.

[VISUAL: Bar chart showing SQLite 48 → PostgreSQL Default 71 RPS]

But there's an interesting pattern here. Look at how PostgreSQL scales under load:

- 3 virtual users: 8 RPS
- 10 virtual users: 18 RPS  
- 30 virtual users: 32 RPS
- 50 virtual users: 43 RPS
- 100 virtual users: 59 RPS
- 200 virtual users: 71 RPS

It starts low and scales up. The database is learning your workload, optimizing itself as load increases. That's actually good behavior — it means PostgreSQL is managing resources intelligently.

Now, you might think: "71 RPS is good, but can we do better?"

Yes. And it costs nothing.

---

## SEGMENT 5: PGTUNE — THE FREE OPTIMIZATION EVERYONE SKIPS
**[6:30 - 8:30]**

[VISUAL: Screen recording of PGTune website, form filling, generated config. Show Claude/Cursor generating Docker Compose file]

This is PGTune. It's been around for years. Industry standard for PostgreSQL configuration.

Almost nobody uses it for their n8n deployments.

Here's what it does: PostgreSQL ships with generic defaults that work on a Raspberry Pi or a 64-core server. PGTune says, "Tell me your actual hardware specs, and I'll build you a config that uses what you actually have."

It's like having an interior designer optimize your restaurant's pantry. Same space, but now every shelf is being used efficiently.

For our c5.large instance — 4GB RAM, 2 CPUs — PGTune generates settings that tell PostgreSQL exactly how much memory to use for caching, how much each operation can consume, how to optimize for our specific workload.

Same hardware. Same database. Optimized configuration.

[VISUAL: Before/after comparison graphic showing tiny cabinet vs. full walk-in pantry]

PostgreSQL with PGTune optimization: 95 requests per second.

That's a 34% improvement over the defaults. 71 to 95 RPS.

And here's what's interesting — PG Tuned performs consistently across all load levels:

- 3 virtual users: 93 RPS
- 10 virtual users: 95 RPS
- 30 virtual users: 95 RPS
- 50 virtual users: 94 RPS

Flat performance curve. The database is properly configured from the start, so it doesn't need to "learn" under load.

[VISUAL: Line graph showing PG Default climbing vs PG Tuned flat at 95]

Now I need to be honest about something. In my previous video analysis, I said tuning gave me 6x performance improvement. That was comparing old untuned n8n 1.99 (15 RPS) to new tuned n8n 2.8.3 (95 RPS). That was a version upgrade plus tuning.

Within n8n 2.8.3, tuning alone gives you 34% improvement. Still significant. Still free. But let's be accurate about the numbers.

---

## SEGMENT 6: THE QUEUE MODE LEAP — BECOMING A PROPER RESTAURANT
**[8:30 - 10:30]**

[VISUAL: B-roll of busy restaurant kitchen with ticket rail, multiple stations. Overlay: queue mode architecture diagram with Redis, workers]

But what happens when 95 requests per second isn't enough?

This is where you make the leap from a single kitchen to a proper restaurant operation.

Queue mode. Redis handles the ticket rail. Dedicated webhook workers take orders from customers. Dedicated execution workers handle the cooking. All coordinated, but specialized.

On a c5.4xlarge — more RAM, more CPU power, room for multiple workers — here's what we see:

Queue mode with default settings: 266 requests per second.  
Queue mode with PGTune optimization: 280 requests per second.

[VISUAL: Bar chart showing the progression: SQLite 48 → PG Default 71 → PG Tuned 95 → Queue Default 266 → Queue Tuned 280]

This is the big architectural jump. From 95 RPS to 280 RPS. That's a 3x improvement, but it requires:

1. Bigger instance (c5.large → c5.4xlarge)
2. Redis for the queue
3. Multiple worker containers
4. More complex deployment

Notice something? The tuning improvement in queue mode is smaller — 266 to 280, just 5%. When you have dedicated workers and proper horizontal scaling, the database optimization matters less. The architecture handles the load distribution.

But here's what shocked me in these tests...

---

## SEGMENT 7: THE SPLIT QUEUE SURPRISE — WHY MORE ISN'T ALWAYS BETTER
**[10:30 - 11:30]**

[VISUAL: Split screen showing single restaurant vs franchise with poor coordination. Overlay: split queue architecture diagram]

Everyone assumes that splitting your queue across multiple instances gives you more performance.

Split queue mode: c5.xlarge for the main instance, c5.4xlarge for workers. More total hardware than single-instance queue mode.

The result: 128 requests per second.

Wait. That's worse than the all-in-one queue mode that hit 280 RPS.

This is like opening a second restaurant location, but forgetting to install good communication between the kitchens. Orders get confused. Coordination overhead kills efficiency.

The split architecture adds network latency between main and workers. Database connections are split across instances. The coordination overhead outweighs the hardware benefits.

Sometimes architectural complexity hurts performance instead of helping.

This is why we test instead of assume.

---

## SEGMENT 8: THE DECISION FRAMEWORK — WHEN TO SCALE WHAT
**[11:30 - 13:30]**

[VISUAL: Flowchart building as you speak. Three clear paths with costs labeled]

So you're staring at n8n performance issues. Here's the framework I use:

**Step 1: Diagnose the pantry**

Run benchmarks. Watch your monitoring. Is the database CPU maxed while n8n containers have headroom?

If yes, you have a pantry problem. Try PGTune first — it's free. If that's still not enough, consider upgrading your database instance size.

Don't add more workers here. They'll just wait on the same bottlenecked database.

**Step 2: Check your kitchen capacity**

Database is humming along, but executions are queuing up? Response times climbing under load?

This is when you move to queue mode. Add Redis. Spin up dedicated workers. Scale horizontally.

This costs more (bigger instance, more containers), but the scaling is predictable. Each worker adds roughly linear throughput.

**Step 3: Architecture constraints**

Everything tuned, workers busy, still hitting ceilings?

This might be time for multi-main mode (enterprise license required) for redundancy, or specialized architectures for specific workloads.

Architecture changes are expensive. That's why they're step three.

[VISUAL: Cost ladder showing Free → Predictable → Expensive with corresponding performance numbers]

The key insight: earn your way up the ladder. Prove you need each level before paying for it.

---

## SEGMENT 9: THE MULTI-WEBHOOK TEST — VALIDATING THE FRAMEWORK
**[13:30 - 14:30]**

[VISUAL: Split screen showing single webhook vs multiple webhook results, nearly identical numbers]

One more test validates this framework: multiple webhooks.

Instead of one workflow getting hammered, ten different workflows triggered simultaneously. This simulates real-world usage where you have multiple integrations running.

The results:

- Queue Tuned: 269 RPS (vs 280 single webhook)
- Queue Default: 263 RPS (vs 266 single webhook)  
- Split Default: 127 RPS (vs 128 single webhook)
- PG Tuned: 95 RPS (vs 95 single webhook)

Almost identical performance. n8n's routing handles multiple endpoints efficiently. The bottlenecks remain the same whether you're hitting one endpoint hard or many endpoints moderately.

This tells us the framework applies regardless of workflow complexity.

---

## SEGMENT 10: THE BINARY DATA REALITY CHECK
**[14:30 - 15:00]**

[VISUAL: File upload test results, all showing ~9 RPS across configs]

One workload breaks the pattern: large file uploads.

Binary data processing — 2MB files in my test — gives about 9 RPS across all single-instance configurations. SQLite, PostgreSQL default, PostgreSQL tuned. Doesn't matter.

And queue mode? Complete failure. HTTP 500 errors across the board.

This is an n8n limitation, not a configuration problem. Binary data workflows hit different bottlenecks — disk I/O, memory allocation, the way n8n handles file processing.

The team is working on a new binary management system. When that ships, this picture will change.

For now: if you're primarily processing files, you're in a different optimization category. The database tuning still helps, but you'll hit architectural limits faster.

---

## SEGMENT 11: RUNNING YOUR OWN BENCHMARKS
**[15:00 - 16:00]**

[VISUAL: Screen recording of k6 test script, results spreadsheet, monitoring dashboard]

You can run the same kind of tests yourself.

The concept is simple: controlled load at different levels. Three users, ten, thirty, fifty, a hundred, two hundred. Three scenarios: single webhook, multiple webhooks, binary data if relevant.

Capture requests per second, response times, failure rates. Do this before any changes, then after each optimization. Numbers don't lie.

I use k6 for load generation — it's free, scriptable, gives consistent results. Pair it with monitoring (Beszel, Grafana, whatever you have) to watch where bottlenecks actually form.

The goal isn't to break your system. It's to find the ceiling before your users do.

---

## SEGMENT 12: THE CALL TO ACTION — YOUR SCALING PATH
**[16:00 - 17:00]**

[VISUAL: The complete scaling ladder with costs and performance numbers]

Here's your path:

If you're on SQLite and seeing plateaus, try PostgreSQL first. 48 to 71 RPS improvement, same hardware.

If you're on PostgreSQL defaults, run PGTune. 71 to 95 RPS improvement, zero infrastructure cost.

If you're hitting 95 RPS and need more, that's when queue mode makes sense. 95 to 280 RPS, but you'll pay for bigger instances and operational complexity.

Don't skip steps. Don't assume. Test each level to prove you need the next one.

Your specific workload might scale differently than mine. But the framework — pantry, then kitchen, then architecture — applies universally.

The decision isn't just about performance. It's about efficiency. Getting the most out of what you're already paying for before paying for more.

---

## SEGMENT 13: CLOSING — THE GUIDE'S SUCCESS
**[17:00 - 18:00]**

[VISUAL: B-roll of successful restaurant operations, franchise locations. PGTune link overlay]

So that's how you scale n8n without lighting money on fire.

Food truck to restaurant to franchise. SQLite to PostgreSQL to queue mode. Each step unlocks new capabilities, but each step costs more.

We started with a mystery: why was there capacity sitting unused? The answer led to everything you just watched. The database was the bottleneck all along.

A free optimization — PGTune — turned 71 requests per second into 95. Same hardware, 34% improvement. That optimization then carried forward to every subsequent architecture, making queue mode even more effective.

You don't have to guess anymore. You have a framework.

PGTune link is in the description. CloudFormation templates that automate these deployments are coming in the next video.

If this helped clarify your scaling path, drop a comment and tell me where you are on the journey. Food truck, restaurant, or ready for franchise?

Until next time.

---

# THUMBNAIL & TITLE IDEAS

## Title Options

**Primary:** "How Do I Scale n8n Without Lighting Money on Fire?"

**Alternatives:**  
- "n8n Scaling: Food Truck to Franchise (The Decision Framework)"
- "Stop Guessing: The n8n Performance Path That Actually Works"  
- "From 48 to 280 RPS: The n8n Scaling Framework Nobody Shows You"

## Thumbnail Options

**Option 1: The Money Fire**
- Split image: Left shows money/bills burning, right shows organized restaurant/franchise
- n8n logo centered
- Text overlay: "STOP BURNING MONEY" or "THE FRAMEWORK"

**Option 2: The Performance Ladder**  
- Visual progression: Food truck → Restaurant → Franchise
- Performance numbers: 48 → 95 → 280 RPS
- Text: "THE SCALING PATH"

**Option 3: The Decision Framework**
- Flowchart-style thumbnail with three paths
- Free → Predictable → Expensive
- n8n logo integrated
- Text: "STOP GUESSING"

---

# B-ROLL SUGGESTIONS BY SEGMENT

## Segment 1: Cold Open
- Food trucks and restaurants establishing analogy
- AWS cost calculator, cloud billing interfaces
- Monitoring dashboards showing plateau at 48 RPS
- Quick cuts between home lab and enterprise environments

## Segment 2: The Villain  
- n8n documentation pages, architectural diagrams
- AWS pricing calculator with escalating costs
- Multiple browser tabs with conflicting advice
- overwhelmed person staring at complex diagrams

## Segment 3: Food Truck Foundations
- Food truck interior: cramped, single person operation
- Small pantry/storage cabinet
- Long lines forming outside food trucks
- Single Docker container diagrams and SQLite logos

## Segment 4: The Restaurant
- Restaurant kitchen with multiple stations
- Large walk-in pantry/storage room
- Staff coordinating efficiently
- PostgreSQL logo and database connection diagrams

## Segment 5: PGTune
- Interior designer optimizing restaurant space
- Before/after shots of organized vs disorganized pantry
- PGTune website interface and configuration generation
- AI tools (Claude/Cursor) generating code

## Segment 6: Queue Mode Leap
- Busy restaurant with ticket rail system
- Kitchen coordination with multiple cooks
- Redis logo and queue architecture diagrams
- Load balancer distributing traffic

## Segment 7: Split Queue Surprise
- Two restaurants with poor communication
- Confused coordination between locations
- Network diagrams showing latency/complexity
- Performance graphs showing decline

## Segment 8: Decision Framework  
- Restaurant manager reviewing performance metrics
- Cost analysis spreadsheets and ROI calculations
- Clear progression diagrams and flowcharts
- Success stories of proper scaling decisions

## Segment 9: Multi-Webhook Test
- Restaurant handling multiple different orders simultaneously
- Traffic routing and load distribution visuals
- Performance comparison charts
- Real-world integration scenarios

## Segment 10: Binary Data
- File server operations and large data transfers
- Storage systems and I/O bottlenecks
- Error messages and system limitations
- Future roadmap or "under construction" visuals

## Segment 11: Benchmarking
- Performance testing labs and monitoring setups
- Data analysis and spreadsheet reviews
- Real-time monitoring dashboards
- Scientific approach to optimization

## Segment 12: Call to Action
- Clear decision tree and scaling path
- Cost-benefit analysis visualizations
- Success metrics and ROI calculations
- User journey from beginning to advanced scaling

## Segment 13: Closing
- Successful franchise operations
- Multiple thriving restaurant locations
- Team coordination and efficient operations
- Links and resource callouts on screen

---

# KEY NARRATIVE CHANGES FROM V6

1. **Honest about performance improvements**: V6 claimed 6x improvement from tuning alone. V7 clarifies that was V1 to V2 comparison including version upgrade. V2 tuning alone = 34% improvement.

2. **SQLite data included**: V6 didn't have SQLite benchmarks. V7 shows the 48 RPS hard ceiling and explains the single-threaded limitation.

3. **Split queue underperformance**: V6 assumed split would be better. V7 shows split queue actually performs worse (128 vs 280) and explains why.

4. **PostgreSQL scaling curve**: V6 missed the interesting pattern where PG Default scales up under load (8→71) while PG Tuned is flat at 95 from the start.

5. **StoryBrand integration**: V7 more intentionally applies the framework with clear hero (DevOps person), villain (complexity), guide (Angel), plan (scaling path), and success/failure scenarios.

6. **Binary data realism**: V7 mentions the n8n limitation briefly without dwelling on it, noting the new binary system in development.

7. **Updated numbers**: All benchmark data reflects the real V2 results with n8n 2.8.3 from February 2026.