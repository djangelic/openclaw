# Blog-to-Podcast Automation Spec

*Turn every blog post into an audio episode — automatically.*

---

## The Vision

Every blog post on djangelic.com and aztechsol.com gets an audio companion. Embedded at the top of the post. Published to YouTube and Spotify. Zero manual effort after the initial post is written.

Two podcast feeds:
- **Personal:** "Angel on AI" (or similar) — djangelic.com posts
- **Business:** "The Last Layer Podcast" — aztechsol.com posts

---

## The Flow

```
Blog post published (markdown or WordPress)
        │
        ▼
┌─────────────────────┐
│  n8n Trigger         │  Webhook (GitHub push) or WP post_publish hook
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Text Extraction     │  Strip markdown/HTML → clean spoken text
│                      │  Remove links, image refs, code blocks
│                      │  Add natural pauses (--- → 1 sec pause)
│                      │  Prepend: "This is [podcast name]. Today: [title]"
│                      │  Append: "Find the full post at [url]. Subscribe for more."
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  TTS Generation      │  Option A: ElevenLabs API (best quality, ~$0.30/1000 chars)
│                      │  Option B: OpenAI TTS (good quality, cheaper)
│                      │  Option C: iOS Shortcut (free, Angel's existing flow)
│                      │  Output: .mp3 file
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Audio Post-Process  │  Add intro jingle (2-3 sec, optional)
│  (optional)          │  Normalize audio levels
│                      │  Add outro jingle
│                      │  ffmpeg node in n8n or external service
└─────────┬───────────┘
          │
          ├──────────────────────────────────┐
          ▼                                  ▼
┌─────────────────────┐        ┌─────────────────────────┐
│  CDN Upload          │        │  YouTube Upload           │
│  (Cloudflare R2)     │        │  (YouTube Data API v3)    │
│  Returns public URL  │        │  Audio + static image     │
│  for embed player    │        │  or audiogram video       │
└─────────┬───────────┘        │  Title, description, tags │
          │                     │  Playlist: podcast series  │
          ▼                     └─────────────┬─────────────┘
┌─────────────────────┐                      │
│  Update Blog Post    │                      │
│  Inject audio player │                      │
│  at top of post      │                      │
│  (WP REST API or     │                      │
│   GitHub commit)     │                      │
└──────────────────────┘                      │
                                              ▼
                               ┌─────────────────────────┐
                               │  RSS Feed Update          │
                               │  (for Spotify/Apple)      │
                               │  Hosted on R2 or GitHub   │
                               │  Podcasters.spotify.com   │
                               │  submits RSS once,        │
                               │  auto-updates after       │
                               └───────────────────────────┘
```

---

## Implementation Details

### Trigger Options

**For aztechsol.com (WordPress):**
- WP webhook on `post_publish` → n8n webhook node
- Filter: only posts in "The Last Layer" category or "automation-ai" category
- Payload includes post ID, title, content, URL

**For djangelic.com (static/GitHub):**
- GitHub webhook on push to main branch
- Filter: only .md files in blog directory
- Or: manual trigger via Slack command `/podcast [url]`

### Text Cleaning (n8n Code Node)

```javascript
// Strip markdown to spoken text
let text = content
  .replace(/^#{1,6}\s+/gm, '') // remove headings markup (keep text)
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link text](url) → link text
  .replace(/!\[.*?\]\(.*?\)/g, '') // remove images
  .replace(/```[\s\S]*?```/g, '') // remove code blocks
  .replace(/`([^`]+)`/g, '$1') // inline code → plain text
  .replace(/\*\*([^*]+)\*\*/g, '$1') // bold → plain
  .replace(/\*([^*]+)\*/g, '$1') // italic → plain
  .replace(/^>\s+/gm, '') // remove blockquote markers
  .replace(/^[-*]\s+/gm, '') // remove list markers
  .replace(/---+/g, '...') // horizontal rules → pause
  .replace(/\n{3,}/g, '\n\n') // collapse multiple newlines
  .trim();

// Add intro/outro
const intro = `This is The Last Layer Podcast. Today: ${title}.`;
const outro = `Find the full written post at ${url}. Subscribe for more episodes.`;
text = `${intro}\n\n${text}\n\n${outro}`;
```

### TTS Options

**Recommended: ElevenLabs**
- Best voice quality, most natural
- API: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- Cost: ~$5/mo for 30,000 characters (Starter plan), covers ~4-5 posts/month
- Voice: pick one and keep it consistent across all episodes
- n8n has an ElevenLabs node

**Budget: OpenAI TTS**
- `POST https://api.openai.com/v1/audio/speech`
- Model: `tts-1-hd`, Voice: `onyx` or `nova`
- Cost: $15/1M characters — extremely cheap
- Quality: good, slightly less natural than ElevenLabs

**Free: iOS Shortcut (Angel's existing flow)**
- Already works, zero cost
- Limitation: manual trigger, harder to automate end-to-end
- Good as fallback or for personal blog posts

### YouTube Upload

**Audiogram approach (recommended):**
- Generate a simple video: static background image + waveform animation + title text
- Tools: ffmpeg in n8n (combine image + audio → mp4)
- Or: use Headliner.app API for fancier audiograms

**Simple approach:**
- Static image (blog post hero image or channel branding) + audio track
- ffmpeg command: `ffmpeg -loop 1 -i cover.jpg -i audio.mp3 -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest output.mp4`

**YouTube Data API v3:**
- Upload video via `videos.insert`
- Set snippet (title, description, tags)
- Add to playlist (one per podcast series)
- n8n has YouTube nodes

### Spotify/Apple Podcast RSS

Host a static RSS feed on Cloudflare R2 or GitHub Pages:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>The Last Layer Podcast</title>
    <link>https://aztechsol.com/the-last-layer/</link>
    <description>Enterprise AI architecture, Slack automation, and the tool layer that outlives every model.</description>
    <itunes:author>Angel Menendez</itunes:author>
    <itunes:image href="https://aztechsol.com/podcast-cover.jpg"/>
    <itunes:category text="Technology"/>
    <language>en-us</language>
    
    <item>
      <title>Episode Title</title>
      <enclosure url="https://cdn.aztechsol.com/podcast/episode-1.mp3" length="12345678" type="audio/mpeg"/>
      <pubDate>Wed, 19 Feb 2026 00:00:00 GMT</pubDate>
      <itunes:duration>08:32</itunes:duration>
      <description>Episode description...</description>
    </item>
  </channel>
</rss>
```

n8n workflow appends new `<item>` blocks to the RSS XML and re-uploads to R2.

Submit RSS URL once to:
- **Spotify:** podcasters.spotify.com
- **Apple:** podcastsconnect.apple.com
- **Google:** podcastsmanager.google.com

After initial submission, new episodes auto-appear when RSS updates.

### Blog Embed

**WordPress (aztechsol.com):**
```html
<div style="background:#1a1a2e;border-radius:12px;padding:20px;margin:0 0 30px;">
  <p style="color:#fff;font-size:14px;margin:0 0 10px;">🎧 Listen to this post:</p>
  <audio controls style="width:100%;">
    <source src="https://cdn.aztechsol.com/podcast/post-slug.mp3" type="audio/mpeg">
  </audio>
  <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:10px 0 0;">
    Also available on <a href="#" style="color:#f26622;">Spotify</a> · <a href="#" style="color:#f26622;">YouTube</a> · <a href="#" style="color:#f26622;">Apple Podcasts</a>
  </p>
</div>
```

Injected via WP REST API `PATCH /wp/v2/posts/{id}` — prepend to existing content.

**GitHub/Static (djangelic.com):**
Add markdown audio player or link to hosted player page.

---

## Workflow Summary

### Workflow 1: Blog → Audio (trigger)
```
WP Publish Hook OR GitHub Push → Filter → Extract Text → Clean for Speech → TTS API → Save .mp3
```

### Workflow 2: Audio → Distribution
```
New .mp3 → Upload to R2 (CDN) → Update Blog Post (embed player) → Generate Video (ffmpeg) → Upload to YouTube → Update RSS Feed → Done
```

### Workflow 3: Manual Override (Slack)
```
/podcast [url] → Fetch URL → Extract Text → Same pipeline as above
```

---

## Cost Estimate (Monthly)

| Item | Cost |
|------|------|
| ElevenLabs Starter | $5/mo |
| Cloudflare R2 (storage + bandwidth) | ~$1-2/mo |
| YouTube API | Free |
| Spotify/Apple hosting | Free (RSS-based) |
| n8n (self-hosted) | Free |
| **Total** | **~$7/mo** |

---

## Phase 1 (MVP — This Week)

1. Use Angel's existing iOS Shortcut for TTS on the first few posts
2. Manually upload audio to R2
3. Manually embed in blog posts
4. Submit RSS to Spotify

## Phase 2 (Automated — Week 2-3)

1. Build n8n workflow: WP publish → text extraction → ElevenLabs → R2 → embed
2. Add YouTube upload node
3. Add RSS auto-update

## Phase 3 (Polish — Month 2)

1. Audiogram video generation
2. Intro/outro jingles
3. Analytics tracking (download counts per episode)
4. Auto-post to social media when new episode drops
