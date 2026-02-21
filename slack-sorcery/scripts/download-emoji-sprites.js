/**
 * SlackéMon Emoji Pack Generator
 * 
 * Downloads all Gen 1 Pokémon sprites (151) as 128x128 PNGs
 * suitable for Slack custom emoji upload.
 * 
 * Slack emoji requirements:
 * - Square image
 * - Under 128KB
 * - PNG, GIF, or JPG
 * 
 * We use the default PokeAPI sprites (96x96 PNGs) which are perfect —
 * small file size, clear at emoji scale, and free to use.
 * 
 * Usage: node download-emoji-sprites.js
 * Output: ./emoji-pack/ folder with 151 PNGs named by pokemon
 * 
 * After download, upload to Slack:
 *   1. Go to your workspace settings → Customize → Emoji
 *   2. Bulk upload all files from emoji-pack/
 *   3. Each file becomes :pokemon-name: (e.g., :bulbasaur:, :charizard:)
 * 
 * Or use the Slack API (admin.emoji.add) for programmatic upload.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'emoji-pack');
const GEN1_COUNT = 151;

// Sprite URL patterns
const SPRITE_URLS = {
  // Default sprites - 96x96, tiny file size, perfect for emoji
  default: (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
  // Showdown animated GIFs - these are small and animate! But may exceed 128KB for some
  animated: (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`,
};

// Gen 1 Pokemon names for file naming
const GEN1_NAMES = [
  'bulbasaur','ivysaur','venusaur','charmander','charmeleon','charizard',
  'squirtle','wartortle','blastoise','caterpie','metapod','butterfree',
  'weedle','kakuna','beedrill','pidgey','pidgeotto','pidgeot',
  'rattata','raticate','spearow','fearow','ekans','arbok',
  'pikachu','raichu','sandshrew','sandslash','nidoran-f','nidorina',
  'nidoqueen','nidoran-m','nidorino','nidoking','clefairy','clefable',
  'vulpix','ninetales','jigglypuff','wigglytuff','zubat','golbat',
  'oddish','gloom','vileplume','paras','parasect','venonat',
  'venomoth','diglett','dugtrio','meowth','persian','psyduck',
  'golduck','mankey','primeape','growlithe','arcanine','poliwag',
  'poliwhirl','poliwrath','abra','kadabra','alakazam','machop',
  'machoke','machamp','bellsprout','weepinbell','victreebel','tentacool',
  'tentacruel','geodude','graveler','golem','ponyta','rapidash',
  'slowpoke','slowbro','magnemite','magneton','farfetchd','doduo',
  'dodrio','seel','dewgong','grimer','muk','shellder',
  'cloyster','gastly','haunter','gengar','onix','drowzee',
  'hypno','krabby','kingler','voltorb','electrode','exeggcute',
  'exeggutor','cubone','marowak','hitmonlee','hitmonchan','lickitung',
  'koffing','weezing','rhyhorn','rhydon','chansey','tangela',
  'kangaskhan','horsea','seadra','goldeen','seaking','staryu',
  'starmie','mr-mime','scyther','jynx','electabuzz','magmar',
  'pinsir','tauros','magikarp','gyarados','lapras','ditto',
  'eevee','vaporeon','jolteon','flareon','porygon','omanyte',
  'omastar','kabuto','kabutops','aerodactyl','snorlax','articuno',
  'zapdos','moltres','dratini','dragonair','dragonite','mewtwo','mew'
];

// Also generate type emoji and item emoji
const TYPE_EMOJI = {
  'type-normal': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/1.png',
  'type-fire': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/10.png',
  'type-water': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/11.png',
  'type-grass': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/12.png',
  'type-electric': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/13.png',
  'type-ice': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/15.png',
  'type-fighting': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/2.png',
  'type-poison': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/4.png',
  'type-ground': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/5.png',
  'type-flying': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/3.png',
  'type-psychic': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/14.png',
  'type-bug': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/7.png',
  'type-rock': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/6.png',
  'type-ghost': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/8.png',
  'type-dragon': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/16.png',
};

const ITEM_EMOJI = {
  'pokeball': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
  'greatball': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png',
  'ultraball': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png',
  'masterball': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
  'potion': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png',
  'super-potion': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/super-potion.png',
  'revive': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/revive.png',
  'rare-candy': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png',
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  // Create output directories
  const dirs = ['pokemon', 'pokemon-animated', 'types', 'items'];
  dirs.forEach(d => fs.mkdirSync(path.join(OUTPUT_DIR, d), { recursive: true }));

  console.log('📦 Downloading Gen 1 Pokémon sprites (151)...\n');

  // Download Pokemon sprites
  for (let i = 0; i < GEN1_COUNT; i++) {
    const id = i + 1;
    const name = GEN1_NAMES[i];

    // Static sprite (for emoji)
    const staticDest = path.join(OUTPUT_DIR, 'pokemon', `${name}.png`);
    process.stdout.write(`  ${String(id).padStart(3, '0')} ${name.padEnd(12)} ... `);
    try {
      await download(SPRITE_URLS.default(id), staticDest);
      const size = fs.statSync(staticDest).size;
      console.log(`✅ ${(size / 1024).toFixed(1)}KB`);
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }

    // Animated sprite (for emoji if under 128KB)
    const animDest = path.join(OUTPUT_DIR, 'pokemon-animated', `${name}.gif`);
    try {
      await download(SPRITE_URLS.animated(id), animDest);
      const size = fs.statSync(animDest).size;
      if (size > 128 * 1024) {
        console.log(`    ⚠️  Animated GIF too large for emoji (${(size / 1024).toFixed(1)}KB > 128KB)`);
      }
    } catch (e) {
      // animated may not exist for all
    }

    // Rate limit courtesy (100ms between requests)
    await new Promise(r => setTimeout(r, 100));
  }

  // Download type badges
  console.log('\n🏷️ Downloading type badges...');
  for (const [name, url] of Object.entries(TYPE_EMOJI)) {
    const dest = path.join(OUTPUT_DIR, 'types', `${name}.png`);
    try {
      await download(url, dest);
      console.log(`  ✅ ${name}`);
    } catch (e) {
      console.log(`  ❌ ${name}: ${e.message}`);
    }
  }

  // Download item sprites
  console.log('\n🎒 Downloading item sprites...');
  for (const [name, url] of Object.entries(ITEM_EMOJI)) {
    const dest = path.join(OUTPUT_DIR, 'items', `${name}.png`);
    try {
      await download(url, dest);
      console.log(`  ✅ ${name}`);
    } catch (e) {
      console.log(`  ❌ ${name}: ${e.message}`);
    }
  }

  // Generate emoji name mapping
  const mapping = {};
  GEN1_NAMES.forEach((name, i) => {
    mapping[`:${name}:`] = `pokemon/${name}.png`;
  });
  Object.keys(TYPE_EMOJI).forEach(name => {
    mapping[`:${name}:`] = `types/${name}.png`;
  });
  Object.keys(ITEM_EMOJI).forEach(name => {
    mapping[`:${name}:`] = `items/${name}.png`;
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'emoji-mapping.json'),
    JSON.stringify(mapping, null, 2)
  );

  console.log(`\n✨ Done! ${Object.keys(mapping).length} emoji ready.`);
  console.log(`📁 Output: ${OUTPUT_DIR}`);
  console.log('\nTo upload to Slack:');
  console.log('  1. Go to: https://YOUR-WORKSPACE.slack.com/customize/emoji');
  console.log('  2. Click "Add Custom Emoji"');
  console.log('  3. Upload files from emoji-pack/pokemon/');
  console.log('  4. Name format: :bulbasaur: :charmander: :pikachu: etc.');
  console.log('\n  Or use Slack API (admin.emoji.add) for bulk programmatic upload.');
}

main().catch(console.error);
