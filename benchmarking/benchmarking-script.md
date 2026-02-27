# n8n Benchmarking V2: The Scaling Playbook

**Target Runtime:** 15-18 minutes

---

## SEGMENT 1: COLD OPEN
**[0:00 - 0:45]**
**[VISUAL: B-roll of food trucks and restaurants (establishing the analogy). Quick cuts to monitoring dashboards: low CPU/RAM but capped throughput. No on-location filming.]**

In my last video, I stress-tested n8n until it broke. Something in the data didn't add up.

The instance capped out at 15 requests per second. Throughput flatlined — but CPU and RAM had capacity to spare. Something else was the bottleneck.

This video is the framework I use to find where bottlenecks actually live. I'll use a simple analogy — food truck, restaurant, franchise — over b-roll so the ideas stick. No fluff.

Let's go.
(Punchy beats and intro card; continue with restaurant/food b-roll)

---

## SEGMENT 2: THE FOOD TRUCK
**[2:00 - 4:00]**
**[VISUAL: B-roll of food trucks — cramped interior, single chef, one line. Overlay: single Docker container diagram. No on-location filming.]**

I love food truck cuisine! You can make great food in a food truck. But there's a physical limitation you can't engineer around.

Everything happens in one small space.

One person taking orders, cooking, and serving. One entrance. One exit. When business is slow, it's perfect. When the lunch rush hits? That line grows. And no matter how talented your chef is, they can only move so fast. 

This represents single-main instance n8n. One Docker container handling webhooks, executions, database writes — everything running in the same process, competing for the same resources.

And here's the thing about a food truck kitchen. It usually comes with a tiny pantry. A small cabinet for storage. Even if the chef has energy to spare, if that pantry can't supply ingredients fast enough, everything slows down. The chef stands there waiting, not because they're tired, but because the pantry can't keep up with the orders.

That's what I was seeing in my benchmarks. The n8n container had capacity. But the database — the pantry — was the choke point.

It works until it doesn't.

---

## SEGMENT 3: THE RESTAURANT
**[4:00 - 6:00]**
**[VISUAL: B-roll of restaurant interiors — front of house, kitchen, ticket rail, storage. Overlay: queue mode architecture with separate containers. No on-location filming.]**

Now imagine you upgrade to something like this. A proper restaurant.

You've got a real building now. A kitchen in the back with dedicated stations. Waiters handling the front of house. A ticket rail where orders queue up. 

And it even includes a bigger pantry. However with a little work, even this pantry can be tuned into a walk-in. 

This is queue mode. You're still running one location, but now you can separate concerns. Docker Compose lets you spin up dedicated containers — webhook workers handling intake, execution workers processing jobs, all pulling from a shared Redis queue. The work gets distributed instead of everything competing in one container.

In restaurant terms: waiters take orders and put tickets on the rail. Cooks pull tickets and work their stations. The pantry supplies ingredients to whoever needs them. When the pantry is properly built out and well-stocked, the whole kitchen flows.

But there's a catch. In queue mode, you can have as many cooks and waiters as you need. But there's only one test kitchen — one place where your recipe developers can create and refine the menu.

If that test kitchen is closed for the day, your recipe developers can't work. In n8n terms, that's your single UI instance. If it goes down, your team can't build or edit workflows.

You can scale to serve as many customers as you want — even on community edition. Only your electricity bill limits you there. But your recipe developers? They're sharing one workspace.

However when you finally grow past even this stage...

---

## SEGMENT 4: THE FRANCHISE
**[6:00 - 7:30]**
**[VISUAL: B-roll of franchise / multi-location restaurants — map of locations, assembly line, multiple kitchens. Overlay: multi-main architecture with multiple UI instances. No on-location filming.]**

You finally make it to the big leagues by becoming a franchise. 

Multiple locations. Multiple kitchens. Multiple front entrances. A customer can walk into any location and get the same menu, the same experience. If one location has a problem, the others keep running.

And most importantly — multiple test kitchens. Your recipe developers can work from any location. If one test kitchen is closed, they walk to another one and keep creating.

This is multi-main mode, unlocked with an enterprise license. You can deploy multiple UI instances — multiple test kitchens for your team to build workflows. All of them write to the same Redis queue, all of them share the same database. High availability. True redundancy.

Each location still needs a properly built-out pantry. Each location still needs enough cooks. But now if one kitchen has issues, your recipe developers and your cooks can keep working from another location.

The path looks like this: food truck, then restaurant, then franchise. Single main, then queue mode, then multi-main. Each step unlocks new capabilities, but each step also requires the foundation beneath it to be solid.

And that's where most people make their first mistake.

---

## SEGMENT 5: THE THREE BOTTLENECKS
**[7:30 - 9:00]**
**[VISUAL: Animated diagram showing three bottleneck types. Maybe split screen showing restaurant analogy on left, n8n architecture on right]**

Almost every n8n scaling problem falls into one of three buckets.

One: The pantry can't keep up. 

Your database is overwhelmed. In a restaurant, this is like having a tiny cabinet for storage when there's room for a full built-in pantry. Cooks are standing at their stations, ready to work, but they're waiting on ingredients. Orders back up even though you have the staff to handle them.

Two: You don't have enough cooks.

The pantry is stocked, ingredients are flowing, but there's just not enough hands to plate the food. Orders pile up on the ticket rail faster than they can be processed.

Three: The space itself is wrong.

You've got a full pantry, enough cooks, but everyone's bumping into each other. The layout can't handle the volume. You need a bigger kitchen, or a different kind of kitchen entirely.

Wrong diagnosis means wasted effort.

Hiring more cooks when your pantry is the problem? They just stand around waiting for ingredients. Expanding to a franchise when your single location has a tiny pantry? You're replicating the problem, not solving it.

Let's figure out which problem you actually have.

---

## SEGMENT 6: THE DATABASE BOTTLENECK — SYMPTOMS
**[9:00 - 11:00]**
**[VISUAL: Screen recording of benchmark results, monitoring dashboards. Highlight the disconnect between DB CPU at 100% and n8n container with headroom. Show the graphs climbing and flatlined throughput]**

Here's where we started in video one. A c5.large instance — two virtual CPUs, four gigs of RAM. PostgreSQL 16, n8n 1.99.1, single-main mode.

Single webhook test. Three virtual users: 15 requests per second. Ten users: still 15. Thirty, fifty, a hundred users — we're stuck at 15 RPS. Response times are climbing, but throughput is flatlined.

At 200 virtual users, we finally see failures. Just 0.16%, but they're there.

Now watch what happens when we add concurrency.

Multiple webhooks — ten different workflows triggered simultaneously. At 50 users, response times spike to 14 seconds and we hit 1.6% failures. At 200 users? Nine percent failure rate. Response times over 34 seconds.

The system is still running, but it's falling further and further behind.

And here's what confused me the first time I ran these tests.

The database is running at full capacity. But the n8n container? It has headroom. RAM available. CPU not maxed. The chef is standing there with capacity to spare, but the pantry — the database — can't supply ingredients fast enough.

That's the pantry bottleneck. And once I understood that, the fix became obvious.

Most people see these symptoms and think: time for a bigger database server. Or time to add workers.

Neither of those is the first step.

The first step costs nothing.

---

## SEGMENT 7: PGTUNE — THE FREE OPTIMIZATION
**[11:00 - 13:30]**
**[VISUAL: Screen recording of PGTune website, filling in the form. Show the generated config. Then show AI (Claude/Cursor) generating the docker-compose file. End with the key YAML lines]**

Not long after my first video went live, my colleague Marcus — he's a Senior Solutions Engineer — reached out with a link. He said, "You need to check this out."

This is PGTune. It's been around for years. It's the industry standard for PostgreSQL configuration.

And almost nobody uses it for their n8n deployments.

Here's the problem it solves.

PostgreSQL ships with a default configuration. That configuration doesn't know anything about your hardware. It doesn't know if you have 4 gigs of RAM or 32. It doesn't know if you're running a tiny VPS or a dedicated database server.

And here's the thing — n8n can't tune this for you either. They have no idea where you're going to deploy. Are you on a Raspberry Pi? A beefy cloud instance? A shared VPS? They ship conservative defaults because they have to work everywhere.

Back to our analogy: imagine every kitchen — food truck, family restaurant, franchise location — comes with the same tiny storage cabinet. Doesn't matter if you have space for a full walk-in pantry. By default, you get a cabinet.

That's what default PostgreSQL settings are. A tiny pantry when there's room for so much more.

PGTune fixes that. You tell it your hardware specs, your workload type, and it builds out a full pantry that uses all the space you actually have. Same kitchen. Same square footage. But now you're using all of it instead of leaving most of it empty.

It's like realizing your food truck had room for floor-to-ceiling storage this whole time, but someone just installed a small cabinet and called it done.

Let me show you. We select PostgreSQL 16, Linux, our c5.large specs — 4 GB RAM, 2 CPUs. For workload type, we select "Mixed" since n8n does both reads and writes. We set connections to 100, which is realistic for n8n. Disk type is SSD since we're on AWS EBS.

Here's what it gives us.

I'm not going to walk through every setting — that's not what this video is about. What matters is this: these settings tell PostgreSQL how to actually use the resources you're giving it. How much RAM to dedicate to caching. How much memory each operation can use. How to utilize the storage for your workload.

The defaults are conservative. They have to be. PGTune says: here's what you actually have, now use it.

Now, where does this fit in your deployment? This isn't a "tune it later" thing. You want these settings applied when you first spin up PostgreSQL.

If you're using Docker Compose — and most self-hosted deployments are — you mount a custom postgresql.conf file and tell Postgres to use it.

Here's a trick that saves time. Take that PGTune output, paste it into Claude or Cursor, and say: generate a docker-compose file for n8n with these PostgreSQL settings applied.

The AI handles the syntax. It knows where the volume mounts go, how to format the configuration, how to wire up the containers. You get a deployment-ready file in seconds.

The key lines look like this:

```yaml
postgres:
  image: postgres:16
  volumes:
    - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
  command: postgres -c config_file=/etc/postgresql/postgresql.conf
```

Same hardware. Full pantry.

Let's see what happens.

---

## SEGMENT 8: THE RESULTS — TUNING PAYS OFF
**[13:30 - 15:00]**
**[VISUAL: Side-by-side before/after benchmark results. Animated bar charts showing 15 → 93 RPS. Response time drops. B-roll or graphics only.]**

Single webhook test. Before tuning: 15 requests per second, maxing out at 16 under heavy load.

After tuning: 93 requests per second.

That's a 6x improvement. Same hardware. Zero infrastructure cost. Configuration only.

Remember that mystery from the first video? The capacity that was sitting there unused? This is where it went. The database was the bottleneck all along. Once the pantry was built out to use all the available space, the chef could finally cook at full speed.

Response times dropped from 12 seconds at peak load to 2.1 seconds. And failures? We had 0.16% at 200 users before. After tuning: zero. Not a single failed request across the entire test.

Multiple webhooks — where we were really struggling before. Remember that 9% failure rate at 200 users? That 34-second response time?

After tuning: 92 requests per second. 10-second response times. Zero failures.

We went from a system that was buckling at moderate load to one that handles 200 concurrent users without breaking a sweat. The pantry can finally keep up with the kitchen.

Now, there's one test where tuning didn't move the needle. Binary data — large file uploads and processing. Before tuning: about 3 requests per second. After: roughly the same.

Binary workloads aren't pantry problems. They're hitting a different ceiling — memory, disk I/O, the architecture itself. It's like trying to cater a wedding out of a food truck. Even with a fully built-out pantry, you need a different kind of kitchen.

When we see that pattern, it tells us we've moved past what tuning can solve. That's when architecture changes come into play.

But we don't start there. We earn our way there by ruling out the simpler fixes first.

---

## SEGMENT 9: THE DECISION FRAMEWORK
**[15:00 - 16:30]**
**[VISUAL: Flowchart building as you talk through each step. Could animate it appearing piece by piece. Show the 273 RPS result at the end with the scaling ladder graphic]**

So you've tuned your database. You're running benchmarks. How do you know what to fix next?

Here's the framework.

Step one: Look at your database. Is it maxed out while your n8n container has headroom?

If yes, you have a pantry problem. Maybe you need to build it out with PGTune. Maybe you've maxed out what your current hardware can offer and need a bigger kitchen. But adding more cooks here makes things worse — more people waiting on the same undersized storage.

The fix is tuning. And tuning is free.

Step two: Is the database humming along while executions queue up?

This is the scaling problem you want to have. The pantry can keep up, but there's not enough hands to plate the food. This is when you upgrade to a restaurant — move to queue mode, spin up dedicated webhook workers, execution workers, let Redis distribute the tickets.

Worker scaling is predictable. Each cook adds roughly linear throughput.

Step three: Is everything maxed out? Database tuned, workers busy, still can't keep up?

This is an architecture constraint. You've outgrown your current kitchen. If you're on queue mode, it might be time for multi-main. If you're handling lots of binary data, you might need external storage solutions.

Architecture changes are expensive. That's why they're step three, not step one.

And when you do make that architectural leap, the numbers speak for themselves.

On a c5.4xlarge with queue mode enabled and a tuned database, we hit 273 requests per second on single webhooks. 270 RPS on multi-webhook tests. That's 17 times what we started with on the baseline.

But notice the order. We tuned the database first. Then we scaled the architecture. The tuning carries forward — it makes every subsequent step more effective.

Untuned single main. Tuned single main. Tuned queue mode. Tuned multi-main. That's the path.

---

## SEGMENT 10: RUNNING YOUR OWN BENCHMARKS
**[16:30 - 17:30]**
**[VISUAL: Screen recording of benchmark workflow or k6 run; results in a spreadsheet. Beszel monitoring dashboard. No need to show or name any unreleased tool.]**

You can run the same kind of benchmarks yourself. The idea is simple: hit your n8n instance with load at different levels — three users, ten, thirty, fifty, a hundred, two hundred — and run the three scenarios we talked about: single webhook, multiple webhooks, binary data.

Capture requests per second, response times, and failure rates. Compare before and after tuning so you can see exactly where your system starts to struggle.

I use an internal workflow to automate this — form in, results out, timestamps and everything. I'm not ready to release that yet, but the point is you can do something similar with k6 or any load-testing tool. Same idea: controlled load, repeatable scenarios, real numbers.

Pair that with something like Beszel for real-time monitoring — CPU, memory, Docker stats — and you can watch where the bottlenecks actually form.

---

## SEGMENT 11: CLOSING
**[17:30 - 18:00]**
**[VISUAL: B-roll of restaurants / franchise locations. Links on screen: PGTune, description. No on-location filming.]**

So that's the framework. Food truck, restaurant, franchise — single main, queue mode, multi-main.

We started with a pantry that couldn't keep up. The fix wasn't a bigger kitchen. It was building out the pantry we already had. PGTune: free, zero infrastructure changes. Fifteen requests per second to 93. Same hardware, six times the throughput.

From there, when you need more hands, you move to a restaurant — queue mode. When you need redundancy and multiple test kitchens, you go franchise — multi-main. Each step builds on the last, and tuning the pantry first makes every step better.

PGTune link is in the description — bookmark it. CloudFormation templates that automate this deployment are coming in a future video.

That mystery from the first video — why was there capacity sitting unused? — led to everything you just watched. If this helped, drop a comment and tell me where you're at on the path.

Until next time.

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
- AI (Claude/Cursor) generating docker-compose
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
