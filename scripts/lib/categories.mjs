// High-precision bilingual classifier for 12 curated Maldivian thematic categories.
// Uses explicit Unicode Thaana word-boundary guards, simile-clause stripping, and false-positive exclusions.

export const CATEGORY_KEYS = Object.freeze([
  'maritime',
  'marine',
  'flora',
  'food',
  'weather',
  'wildlife',
  'body_health',
  'culture_religion',
  'arts_games',
  'home_crafts',
  'clothing',
  'people_emotions',
]);

// Thaana exact-token boundary (neither preceded nor followed by a Thaana char U+0780..U+07BF)
const dvExact = (patternStr) =>
  new RegExp(`(?<![\\u0780-\\u07BF])(?:${patternStr})(?![\\u0780-\\u07BF])`);

// Thaana prefix/stem boundary (starts at a Thaana word boundary, allows suffixes)
const dvStem = (patternStr) =>
  new RegExp(`(?<![\\u0780-\\u07BF])(?:${patternStr})`);

// English word-boundary regex
const enRe = (patternStr) => new RegExp(`\\b(?:${patternStr})\\b`, 'i');

// Strips English simile/comparison phrases before matching secondary meaning keywords
const SIMILE_STRIP_RE =
  /\b(?:resembling|shaped like|looks? like|similar to|color of|size of|smells? like|tastes? like|like a|like an|like the|[a-z]+-like)\s*(?:(?:a|an|the)\s+)?(?:[a-z-]+\s+){0,2}[a-z-]*/gi;

const SINGLE_THAANA_LETTER_RE = /^[\u0780-\u07B1]$/;

export const CATEGORY_RULES = Object.freeze({
  maritime: {
    dvTaxon: dvExact(
      'އުޅަނދެއް|އޮޑިއެއް|ދޯންޏެއް|ބޮއްކުރާއެއް|ބައްތެއްޔެއް|ރިޔަލެއް|ކުނބެއް|ހުންގާނެއް|ފައްޔެއް|ނަގިއްޔެއް|ބަނދަރެއް|ފާލަމެއް|ރާޅެއް|އޮއިވަރެއް'
    ),
    dvCue: dvExact(
      'އޮޑި|ދޯނި|ބޮއްކުރާ|ބައްތެލި|މަސްދޯނި|މަސްއޮޑި|ރިޔާ|ކުނބު|ހުންގާނު|ފަލި|ނަގިލި|މާލިމީ|ކެޔޮޅު|ނައު|މަސްވެރިކަން|ބަނދަރު|ފާލަން|ކަނޑުދަތުރު|އޮއިވަރު|ދިޔަވަރު|ފަޅުތެރެ|ކަނޑުއޮޅި'
    ),
    dvHwStem: dvStem(
      'އޮޑި|ދޯނި|ދޯންޏ|ބޮއްކުރާ|ބައްތެލި|މަސްދޯނ|މަސްއޮޑ|ރިޔާ|ރިޔަލ|ކުނބު|ހުންގާނ|ނަގިލި|މާލިމީ|ކެޔޮޅު|މަސްވެރި|ބަނދަރ|ފާލަމ|ކަނޑުދަތުރ|ދިޔަވަރ|އޮއިވަރ'
    ),
    enCore: enRe(
      'dhoni|bokkura|baththeli|sailboat|sailing|sailor|seafarer|maritime|nautical|navigator|navigation|shipyard|boatbuilding|shipbuilding|hull|keel|prow|stern|rudder|tiller|mainsail|rigging|anchorage|mooring|outrigger|gunwale|thwart|bilge|capsize|shipwreck|harbor|harbour|jetty|pier|quay|lighthouse|fisherman|fishermen|angling|fishing pole|fishing line|fishing hook|fishing boat|fishing vessel|trolling|cast net|fishhook|low tide|high tide|sea current|ocean current|sea voyage|watercraft|dhow|schooner|helmsman|seaman|mariner|windward|leeward|reef pass|sandbank|seabed|caulking|sailcloth|wooden boat|traditional boat'
    ),
    enGlossOnly: enRe(
      'boat|boats|ship|ships|vessel|sail|sails|mast|anchor|oar|paddle|dock|canoe|dinghy|skiff|barge|raft|captain|lagoon|kandu|atoll|shoal|tide|surf|voyage|caulk|bailer|berth|port'
    ),
    enExclude: enRe(
      'blood vessel|cooking vessel|clay vessel|drinking vessel|earthenware vessel|storage vessel|metal vessel|water vessel|aircraft|spacecraft|witchcraft|handicraft|craftsman|bow and arrow|rainbow|archery|sea cucumber|sea urchin|sea turtle|seaweed|seagrass|seabird'
    ),
  },

  marine: {
    dvTaxon: dvExact(
      'މަހެއް|ފަރުމަހެއް|މިޔަރެއް|ބޮއްޔެއް|އެމެއް|ކަކުންޏެއް|މަޑިއެއް|ވެލައެއް|ކަހަނބެއް|ބޯވައެއް|އިއްސެއް|މުރަކައެއް|ކަނޑުމަހެއް|ރަތްމަހެއް|ހުއިފިލަނޑައެއް|އިތައެއް'
    ),
    dvCue: dvExact(
      'ފަރުމަސް|ކަނޑުމަސް|ރަތްމަސް|މަސްމަހާމެހި|މިޔަރު|ބޮލި|ކަކުނި|ވެލާ|ކަހަނބު|ބޯވަ|މުރަކަ|ރިނދަ|އިތާ|ކޯމަސް|ބޮޑުމަސް|ހުއިފިލަނޑާ|ކަޅުބިލަމަސް|ކަންނެލި|ލައްޓި|ރާގޮނޑި|މުށިމަސް|ރެހި|ބޯވަދިލަމަސް|ތޮޅިމަސް|ހަނދި|ފާނަ|ހިކާ'
    ),
    dvHwStem: dvStem(
      'ފަރުމަސް|ކަނޑުމަސް|މިޔަރު|ބޮލި|ކަކުނި|ވެލާ|ކަހަނބ|ބޯވަ|މުރަކަ|ކޯމަސް|ބޮޑުމަސް|ހުއިފިލަނޑާ|މަސްމަހާމެހ|ކަޅުބިލަމަސް|ކަންނެލި|މުށިމަސް|ތޮޅިމަސް'
    ),
    enCore: enRe(
      'reef fish|marine fish|pelagic fish|type of fish|species of fish|variety of fish|small fish|large fish|skipjack|tuna|yellowfin|bonito|mackerel|grouper|snapper|trevally|jackfish|barracuda|wahoo|sailfish|marlin|swordfish|parrotfish|triggerfish|surgeonfish|butterflyfish|angelfish|damselfish|wrasse|emperor fish|fusilier|rabbitfish|squirrelfish|soldierfish|pufferfish|porcupinefish|boxfish|goatfish|scorpionfish|lionfish|stonefish|flounder|moray|shark|stingray|manta|eagle ray|spotted ray|whale|dolphin|porpoise|dugong|sea turtle|hawksbill|octopus|squid|cuttlefish|nautilus|hermit crab|lobster|shrimp|prawn|barnacle|clam|oyster|mussel|cockle|scallop|conch|cowrie|cowry|seashell|shellfish|mollusk|mollusc|gastropod|bivalve|sea snail|sea urchin|sea cucumber|starfish|jellyfish|sea anemone|seaweed|seagrass|algae|kelp|plankton|baitfish|live bait|fish roe|dorsal fin|pectoral fin|fish scale|crustacean|cephalopod|marine creature|marine animal|sea creature'
    ),
    enGlossOnly: enRe('fish|fishes|eel|crab|coral|gill|gills|marine'),
    enExclude: enRe(
      'fish curry|fish soup|fish paste|fish cake|fish broth|fish dish|dried fish|smoked fish|salted fish|cooked fish|fried fish|grilled fish|rihaakuru|garudhiya|mashuni|mas huni|valhomas|hikimas|fisherman|fishing boat|fishing line|coconut shell|eggshell|nutshell|coral stone|coral lime|coral wall|crab plover'
    ),
  },

  flora: {
    dvTaxon: dvExact(
      'ގަހެއް|ރުކެއް|މަލެއް|މޭވާއެއް|ފަތްޕިލާވެއްޔެއް|ފިލާވެއްޔެއް|ވިނައެއް|ވެލެއް|އޮށެއް|ތޮޅިއެއް|ފަތެއް|ގަސްގަހާގެހި|މާމެލާމެލި|ކާށްޓެއް|ކުރުނބައެއް|ގަބުޅިއެއް|އިހަލެއް'
    ),
    dvCue: dvExact(
      'ރުއް|ކާށި|ކުރުނބާ|ގަބުޅި|ބޮނބި|ފަންތޮށި|އިލޮށި|ފަތްޕިލާވެލި|މޭވާ|ބަގީޗާ|ބިލެތް|ކަށިކެޔޮ|ބަނބުކެޔޮ|އަނބު|ދޮންކެޔޮ|ފޭރު|ލުނބޯ|ފަޅޯ|ކަރާ|މިރުސް|ފިޔާ|ލޮނުމެދު|އިނގުރު|ރީނދޫ|ކާފޫރު|ދިއްގާ|ކާނި|މަގޫ|ކުރެދި|ހިރުނދު|ފުނަ|މިދިލި|ނިކަ|ކަނޑޫ'
    ),
    dvHwStem: dvStem(
      'ރުއް|ރުކު|ކާށި|ކުރުނބާ|ގަބުޅި|ބޮނބި|ފަންތޮށި|އިލޮށި|ފަތްޕިލާވެލ|ގަސްގަހާ|މާމެލާ|މޭވާ|ދަނޑުވެރ|ބަގީޗާ|ބިލެތ|ކަށިކެޔޮ|ބަނބުކެޔޮ|ދޮންކެޔޮ|ލުނބޯ|ފަޅޯ|ކަރާ|މިރުސް|ފިޔާ|ލޮނުމެދ|އިނގުރ|ދިއްގާ|ކުރެދި|ހިރުނދ|މިދިލި|ނިކަގަސް|ކަނޑޫ'
    ),
    enCore: enRe(
      'coconut palm|palm tree|palm frond|palm leaf|coconut husk|young coconut|mature coconut|copra|spathe|palm sap|toddy|pandanus|screwpine|breadfruit|banyan|mangrove|hibiscus|areca nut|betel leaf|betel vine|betel nut|plantain|papaya|guava|tamarind|taro|wild yam|cassava|millet|sorghum|sweet potato|gourd|watermelon|cardamom|clove|nutmeg|jasmine|frangipani|plumeria|type of tree|kind of tree|species of tree|variety of tree|type of plant|kind of plant|species of plant|variety of plant|climbing plant|creeping plant|flowering plant|medicinal plant|medicinal herb|herbaceous|woody shrub|coastal shrub|coastal tree|tropical tree|fruit tree|climbing vine|type of grass|type of flower|edible fruit|tree bark|tree trunk|flower cluster|seed pod|edible tuber|rhizome|sapling|seedling|foliage|botanical|flora|agriculture|cultivation|fungus|mushroom|key lime|lime tree|lime fruit'
    ),
    enGlossOnly: enRe(
      'coconut|frond|coir|husk|banana|mango|lemon|citrus|pumpkin|melon|chili|chilli|pepper|ginger|turmeric|cinnamon|lotus|lily|orchid|plant|plants|tree|trees|shrub|bush|herb|herbs|vine|creeper|fern|moss|grass|reed|sedge|bamboo|cactus|weed|flower|flowers|blossom|petal|pollen|bud|bloom|fruit|fruits|berry|pod|seed|seeds|kernel|sprout|trunk|bark|bough|twig|leaf|leaves|tuber|thorn|resin|timber|hardwood|driftwood|forest|grove|orchard|garden|plantation|farming|harvest|onion|garlic|tomato|cabbage|spinach|cucumber|eggplant|okra|bean|beans|lentil|corn|maize|wheat|barley|sugarcane'
    ),
    enExclude: enRe(
      'family tree|root word|word root|square root|tooth root|hair root|palm of the hand|light bulb|blood stem|brain stem|stem of a word|branch of|fruit of labor|lime mortar|slaked lime|coral lime|mixing lime|rose up|rose from|palm-leaf basket|woven basket'
    ),
  },

  food: {
    dvTaxon: dvExact(
      'ކާއެއްޗެއް|ބުއިމެއް|ހެދިކާއެއް|ރިހައެއް|ފޮނިކާއެއްޗެއް|ކެއުމެއް|ހަވާދެއް|އަސާރައެއް|ސަޓަންޏެއް|ފޮޅިއެއް|ބޯކިބާއެއް'
    ),
    dvCue: dvExact(
      'ކާއެއްޗެހި|ކެއްކުން|ރިހަ|ބަތް|ރޮށި|ހެދިކާ|ބުއިން|ހަވާދު|ބޯކިބާ|ބޮނޑިބަތް|ގަރުދިޔަ|ރިހާކުރު|މަސްހުނި|ކުޅިމަސް|ވަޅޯމަސް|ހިކިމަސް|ދިޔާހަކުރު|އަސާރަ|ސަޓަނި|ފޮޅި|ބަޖިޔާ|ގުޅަ|މަސްރޮށި|ކަވާބު|ބިސްކޯދު|ޕާން|ސައި|ކޮފީ|ހަކުރު|ލޮނު|މާމުއި|ކިރު|ގިތެޔޮ|ފުށް|ހަނޑޫ|ކެއިންބުއިން'
    ),
    dvHwStem: dvStem(
      'ކާއެއްޗ|ކެއްކު|ކައްކ|ރިހަ|ބަތް|ރޮށި|ހެދިކާ|ހަވާދު|ފޮނިކާ|ބޯކިބާ|ބޮނޑިބަތް|ގަރުދިޔަ|ރިހާކުރު|މަސްހުނި|ވަޅޯމަސް|ހިކިމަސް|އަސާރަ|ސަޓަނި|ފޮޅި|ބަޖިޔާ|މަސްރޮށި|ކަވާބު|ބިސްކޯދ|ހަކުރު|މާމުއި|ގިތެޔޮ|ހަނޑޫ|ކެއިންބުއިން'
    ),
    enCore: enRe(
      'traditional dish|maldivian dish|sweet dish|savory dish|food made|dish made|meal made|snack made|beverage|porridge|gruel|pudding|sweetmeat|confection|halwa|pastry|pancake|flatbread|roshi|chapati|hedhikaa|short eats|dumpling|fritter|samosa|curry|fish broth|fish soup|fish paste|rihaakuru|garudhiya|mashuni|mas huni|valhomas|hikimas|dried fish|smoked fish|salted fish|coconut milk|grated coconut|dough|batter|noodle|vermicelli|jaggery|treacle|palm syrup|havaadhu|masala|spice blend|condiment|chutney|pickle|saute|deep-fry|deep-fried|simmer|feast|banquet|breakfast|lunch|dinner|supper|curd|yogurt|ghee|cuisine|recipe|betel quid|sherbet'
    ),
    enGlossOnly: enRe(
      'food|dish|dishes|meal|meals|cooking|cook|cooked|boil|boiled|fry|fried|roast|roasted|grill|grilled|bake|baked|steam|steamed|stew|broth|soup|gravy|sauce|paste|relish|salad|dessert|candy|cake|bread|biscuit|cracker|snack|rice|flour|sugar|syrup|honey|molasses|salt|spice|spices|seasoning|vinegar|butter|cheese|milk|cream|meat|beef|mutton|poultry|drink|drinks|tea|coffee|juice|appetite|hungry|hunger|thirst|thirsty|flavor|flavour|savory|savoury|spicy|pungent|delicious|edible|ingredient'
    ),
    enExclude: enRe(
      'sweetheart|sweet-talk|bitter cold|bitter enemy|bitterly|sour face|salt water|oil lamp|engine oil|hair oil|massage oil|medicinal oil|skin boil|baby bottle|feeding bottle'
    ),
  },

  weather: {
    dvTaxon: dvExact(
      'ނަކަތެއް|ތަރިއެއް|މޫސުމެއް|ވިލާއެއް|ވައެއް|ކޮޅިގަނޑެއް|ވިއްސާރައެއް|ވާރެއެއް|ހަނދެއް|އިރެއް|ގުގުރިއެއް|ވިދުވަރެއް|ވައިރޯޅިއެއް|ކެރިއެއް|ތޫފާނެއް'
    ),
    dvCue: dvExact(
      'ނަކަތް|ވިއްސާރަ|ވާރޭ|މޫސުން|އިރުވައި|ހުޅަނގު|ތަރި|ހަނދު|ވިލާ|ގުގުރި|ވިދުވަރު|ކޮޅިގަނޑު|ތޫފާން|ވައިރޯޅި|ކެރި|ދުންފިނި|ޝަބުނަމް|އުދަރެސް|އުޑު|އުޑުމަތި|ފަޖުރު|ކޭތަ|ބިންހެލުން|ސުނާމީ|މެދުއުޑު'
    ),
    dvHwStem: dvStem(
      'ނަކަތް|ނަކަތ|ވިއްސާރަ|ވާރޭ|މޫސުން|މޫސުމ|އިރުވައި|ތަރި|ހަނދު|ވިލާ|ގުގުރި|ވިދުވަރ|ކޮޅިގަނޑ|ތޫފާނ|ވައިރޯޅ|ވައިގަދަ|ދުންފިނި|ޝަބުނަމ|އުދަރެސް|އުޑުމަތި|އިރުއޮއްސ|އިރުއަރ|ކޭތަ|ބިންހެލ|ސުނާމީ'
    ),
    enCore: enRe(
      'nakaiy|nakshatra|lunar mansion|monsoon|iruvai|hulhangu|weather|climate|rainy season|dry season|rainfall|raindrop|drizzle|downpour|rain shower|squall|stormy|tempest|cyclone|typhoon|hurricane|gale|whirlwind|waterspout|tornado|gust of wind|sea breeze|trade wind|favorable wind|strong wind|doldrums|rain cloud|thundercloud|overcast|mist|fog|haze|morning dew|frost|hailstone|thunder|thunderbolt|lightning|rainbow|sunlight|sunshine|sunbeam|sunrise|sunset|daybreak|twilight|moonlight|full moon|new moon|crescent moon|lunar|solar|eclipse|star cluster|constellation|asterism|planet|comet|meteor|shooting star|galaxy|milky way|night sky|in the sky|across the sky|horizon|zenith|atmosphere|astronomy|zodiac|equinox|solstice|drought|earthquake|tsunami|heatwave|humidity'
    ),
    enGlossOnly: enRe(
      'season|seasonal|rain|rainy|shower|storm|gust|breeze|wind|winds|windy|cloud|clouds|cloudy|dew|hail|snow|sun|dawn|dusk|midday|moon|star|stars|starry|sky|astrology|flood|deluge|humid|muggy|sultry|chilly|nighttime'
    ),
    enExclude: enRe(
      'to wind|wind up|wind around|wind thread|second wind|break wind|pass gas|fart|star-shaped|movie star|sea star|starfish|sunfish|moonfish|rainforest|thunderous applause|brainstorm|cold-hearted|warm-hearted|hot-tempered|hot food|cold medicine|common cold|cloud of dust|cloud of smoke|sun-dried|royal title|commemorative|plaque'
    ),
  },

  wildlife: {
    dvTaxon: dvExact(
      'ދޫންޏެއް|ސޫތްޕެއް|ފަންޏެއް|ޖަނަވާރެއް|މަކުނެއް|ބުޅަލެއް|މީދަލެއް|ކުކުޅެއް|މަދިރިއެއް|ހިންޏެއް|ކޮކާލެއް|މެއްސެއް|ހަރުފައެއް|ބޮކެއް|ކުރަފިއެއް|ވާލެއް|ކާޅެއް|މާކަނައެއް|ކިރުދޫންޏެއް|ކަނބިއްޔެއް|ކޮތަރެއް|ގުރައެއް|ބަކަރިއެއް|ގެރިއެއް'
    ),
    dvCue: dvExact(
      'ދޫނި|ސޫފި|ފަނި|ޖަނަވާރު|ދޫނިސޫފާސޫފި|މަކުނު|ބުޅާ|މީދާ|ކުކުޅު|މަދިރި|ހިނި|ކޮކާ|ހަރުފަ|ކުރަފި|ވާލު|ކާޅު|މާކަނާ|ކިރުދޫނި|ކަނބިލި|ކޮވެލި|ގުރާ|ކޮތަރު|އަސްދޫނި|ބަކަރި|ގެރި|ޖަމަލު|ސިންގާ|މިނިކާވަގު|ކުއްތާ|ހޯނު|ކަތުރުފަނި|ކުޅަނދުރު'
    ),
    dvHwStem: dvStem(
      'ދޫނި|ދޫންޏ|ސޫފި|ސޫތްޕ|ޖަނަވާރ|މަކުނު|މަދިރި|ކޮކާ|ހަރުފަ|ކުރަފި|މާކަނާ|ކިރުދޫނ|ކަނބިލ|ކޮވެލި|ކޮތަރ|އަސްދޫނ|ބަކަރި|ޖަމަލު|ސިންގާ|މިނިކާވަގ|ކުއްތާ|ހޯނު|ކަތުރުފަނި|ކުޅަނދުރ'
    ),
    enCore: enRe(
      'type of bird|species of bird|kind of bird|variety of bird|bird of prey|seabird|waterbird|shorebird|songbird|migratory bird|heron|egret|bittern|tern|noddy|seagull|frigatebird|booby|petrel|shearwater|tropicbird|sandpiper|plover|curlew|whimbrel|waterhen|moorhen|cuckoo|koel|parakeet|mynah|sparrow|hawk|falcon|vulture|peacock|flamingo|fruit bat|flying fox|type of insect|species of insect|kind of insect|beetle|weevil|cockroach|termite|honeybee|wasp|hornet|housefly|mosquito|flea|louse|bedbug|grasshopper|locust|mantis|dragonfly|butterfly|moth|caterpillar|maggot|earthworm|centipede|millipede|spider|scorpion|lizard|gecko|skink|chameleon|iguana|snake|serpent|viper|cobra|python|frog|toad|crocodile|alligator|mammal|reptile|amphibian|rodent|kitten|puppy|shrew|squirrel|rabbit|hare|cattle|buffalo|donkey|mule|camel|elephant|antelope|gazelle|monkey|leopard|panther|jackal|hyena|wildfowl|plumage|talons|bird nest|cobweb|antler|hoof|livestock'
    ),
    enGlossOnly: enRe(
      'bird|birds|fowl|hen|rooster|chick|duck|goose|swan|pigeon|dove|crow|raven|gull|snipe|parrot|owl|eagle|stork|crane|bat|insect|insects|ant|bee|gnat|midge|lice|tick|mite|larva|grub|worm|snail|slug|animal|animals|beast|cat|dog|rat|mouse|goat|sheep|lamb|cow|bull|ox|calf|horse|pony|deer|ape|lion|tiger|wolf|fox|bear|pig|boar|feather|feathers|beak|talon|nest|burrow|beehive|snout|mane|flock|swarm|chirp|caw|meow'
    ),
    enExclude: enRe(
      'paper kite|fly a kite|flying a kite|chicken curry|chicken dish|beef curry|mutton curry|catfish|dogfish|goatfish|parrotfish|butterflyfish|squirrelfish|scorpionfish|lionfish|cowrie|sea snail|sea snake|sea spider|goosebumps|spider lily|bird of paradise|tiger lily|birdcage|wormwood|ringworm|tapeworm|tree bark|bear witness|bear fruit|cricket|fly away|to fly|flying|iron rail|railing|railway|crinum|climbing vine'
    ),
  },

  body_health: {
    dvTaxon: dvExact(
      'ބައްޔެއް|ބޭހެއް|ގުނަވަނެއް|ކެއްސެއް|ހުމެއް|ފާރުގަނޑެއް|ތަދެއް|ރޯގާއެއް|ބަލިމަޑުކަމެއް|ދިވެހިބޭސް|ބޭސްވެރިކަން|އިނގިއްޔެއް|ދަތެއް'
    ),
    dvCue: dvExact(
      'ބަލި|ބޭސް|ހަށިގަނޑު|ގުނަވަން|ރޯގާ|ހުން|ކެއްސުން|މުލިހި|ތަދު|ވޭން|ލޭ|ފުއްޕާމޭ|ކިޑްނީ|ބަނޑު|ދަތް|ތުންފަތް|ނޭފަތް|ކަންފަތް|އަތްތިލަ|ފައިތިލަ|އިނގިލި|ނިޔަފަތި|ކޮނޑު|އުޅަނބޮށި|ކަކޫ|މައިބަދަ|ކަށިގަނޑު|ހަންގަނޑު|އިސްތަށި|ތުނބުޅި|މަތިމަސް|މާބަނޑު|ވިހެއުން|ފޫޅުމައި|ޙަކީމު|ބޭސްވެރިކަން|ޑޮކްޓަރު|ޞިއްޙަތު'
    ),
    dvHwStem: dvStem(
      'ބަލި|ބައްޔ|ބޭސް|ހަށިގަނޑ|ހަށިކޮޅ|ގުނަވަނ|ރޯގާ|ކެއްސު|މުލިހި|ފުއްޕާމޭ|ތުންފަތ|ނޭފަތ|ކަންފަތ|އަތްތިލަ|ފައިތިލަ|އިނގިލ|ނިޔަފަތ|އުޅަނބޮށ|މައިބަދަ|ކަށިގަނޑ|ހަންގަނޑ|އިސްތަށ|ތުނބުޅ|މަތިމަސް|މާބަނޑ|ފޫޅުމައި|ބޭސްވެރ|ޞިއްޙަތ'
    ),
    enCore: enRe(
      'disease|illness|sickness|ailment|malady|medical disorder|infection|contagious|epidemic|plague|fever|malaria|cholera|smallpox|measles|leprosy|tuberculosis|asthma|cough|influenza|diarrhea|diarrhoea|dysentery|constipation|nausea|vomiting|headache|toothache|stomachache|backache|muscle cramp|spasm|seizure|convulsion|paralysis|numbness|dizziness|vertigo|fainting|insomnia|edema|oedema|inflammation|abscess|ulcer|blister|skin rash|eczema|ringworm|scabies|bruise|wound|bone fracture|sprain|bleeding|hemorrhage|mucus|phlegm|saliva|perspiration|urine|feces|bowel movement|menstruation|pregnancy|pregnant|childbirth|miscarriage|midwife|breastfeed|traditional medicine|herbal medicine|dhivehi beys|medical remedy|ointment|poultice|decoction|physician|healer|surgeon|surgery|anatomy|anatomical|part of the body|human body|body part|skeleton|skull|cranium|forehead|eyelid|eyebrow|eyelash|eardrum|nostril|palate|molar|gullet|windpipe|armpit|forearm|knuckle|fingernail|ribcage|lungs|kidney|spleen|abdomen|navel|umbilical|intestine|pelvis|buttock|vertebra|kneecap|toenail|artery|blood vessel|tendon|ligament|cartilage|scalp|blindness|deafness|hunchback|hygiene|symptom|deep breath|sneeze|hiccup|torso|midriff|bodily waste'
    ),
    enGlossOnly: enRe(
      'disorder|syndrome|affliction|flu|vomit|cramp|faint|coma|swelling|sore|rash|itch|wart|scar|injury|fracture|dislocation|bleed|pus|sweat|medicine|medicinal|remedy|cure|healing|treatment|therapy|balm|salve|tonic|doctor|bandage|splint|limb|organ|brain|cheek|jaw|chin|iris|cornea|earlobe|nose|tongue|tooth|teeth|throat|nape|shoulder|elbow|wrist|finger|thumb|breast|nipple|rib|lung|liver|stomach|belly|bowel|waist|hip|spine|backbone|thigh|knee|shin|calf|ankle|heel|toe|pore|vein|blood|pulse|nerve|muscle|marrow|beard|mustache|moustache|blind|deaf|mute|lame|bald|health|healthy|unhealthy|pain|ache|soreness|breath|breathing|inhale|exhale|yawn|belch|snore'
    ),
    enExclude: enRe(
      'eye of a needle|head of state|head of a nail|mouth of a river|leg of a table|arm of a chair|neck of a bottle|coconut palm|palm tree|palm frond|fish bone|whalebone|wooden chest|storage chest|boiling water|boiled|gum tree|chewing gum|sole fish|young calf|pipe elbow|ear of grain|ear of corn|sandspit|creeping plant'
    ),
  },

  culture_religion: {
    dvTaxon: dvExact(
      'ފުރޭތައެއް|ހަންޑިއެއް|ޖިންނިއެއް|ނަމާދެއް|ދުޢާއެއް|މިސްކިތެއް|ފަންޑިތައެއް|ސިހުރެއް|ލަޤަބެއް|ޒިޔާރަތެއް|ވަލީވެރިއެއް|ރަސްކަލެއް|ދީނެއް'
    ),
    dvCue: dvExact(
      'ރަސްކަން|ރަސްކަމުގެ|ރަސްގެފާނު|ރަދުން|ސުލްޠާން|ކިލެގެ|މަނިކުފާނު|ދީދީ|ކަލޭފާނު|ފަނޑިޔާރު|ޚަޠީބު|މުދިމު|ވަޒީރު|ބޮޑުވަޒީރު|ކޮލި|ގަނޑުވަރު|ނަމާދު|މިސްކިތް|ދީން|ދީނީ|އިސްލާމް|ޤުރުއާން|ޙަދީޘް|ސުންނަތް|ދުޢާ|ޒިކުރު|މައުލޫދު|ރޯދަ|ޢީދު|ޙައްޖު|ޢުމްރާ|ޒަކާތް|ޞަދަޤާތް|ކަފުން|ޖަނާޒާ|ޤަބުރު|މަހާނަ|ސުވަރުގެ|ނަރަކަ|މަލާއިކަތް|ނަބިއްޔާ|ރަސޫލާ|ޝައިޠާނާ|ޖިންނި|ފުރޭތަ|ހަންޑި|ފަންޑިތަ|ސިހުރު|ތަވީދު|ކިޔެވެލި|ޞަލަވާތް|ފާތިޙާ|ޝަރީޢަތް|ޙަލާލު|ޙަރާމް|ފަރުޟު'
    ),
    dvHwStem: dvStem(
      'ރަސްކަމ|ރަސްގެފާނ|ރަސްވަންހ|ރަސްމަތި|ރަސްދަރި|ރަދުން|ސުލްޠާނ|ކިލެގެ|މަނިކުފާނ|ކަލޭފާނ|ފަނޑިޔާރ|ޚަޠީބ|މުދިމ|ބޮޑުވަޒީރ|ގަނޑުވަރ|ނަމާދ|މިސްކިތ|އިސްލާމ|ޤުރުއާނ|ޙަދީޘ|ދުޢާ|ޒިކުރ|މައުލޫދ|ރޯދަ|ޢީދު|ޙައްޖު|ޢުމްރާ|ޒަކާތ|ޞަދަޤާތ|ކަފުން|ޖަނާޒާ|ޤަބުރ|މަހާނަ|ސުވަރުގެ|ނަރަކަ|މަލާއިކަތ|ނަބިއްޔ|ރަސޫލ|ޝައިޠާނ|ޖިންނި|ފުރޭތަ|ފަންޑިތަ|ސިހުރ|ތަވީދ|ޞަލަވާތ|ފާތިޙާ|ޝަރީޢަތ|ޙަލާލު|ޙަރާމް|ފަރުޟު'
    ),
    enCore: enRe(
      'islam|islamic|muslim|allah|quran|koran|surah|hadith|sunnah|sharia|shariah|fiqh|fatwa|halal|haram|prayer|prayers|namaz|salat|ablution|wudu|ghusl|adhan|mosque|minaret|mihrab|minbar|imam|muezzin|mudhim|khatib|qadi|fandiyaaru|ramadan|iftar|suhoor|eid day|eid feast|hajj|umrah|pilgrimage|mecca|kaaba|qibla|zakat|sadaqah|waqf|supplication|dhikr|maulood|mawlid|salawat|fatiha|khutbah|prophet|angel|paradise|afterlife|resurrection|judgment day|pious|piety|devout|worship|funeral|burial|shroud|tombstone|cemetery|shrine|ziyaaraiy|circumcision|monotheism|sultan|sultanate|monarch|monarchy|royal palace|royal title|royal lineage|royal court|royal lady|coronation|sovereign|nobility|nobleman|aristocrat|kilege|manikfaanu|radhun|vizier|prime minister|courtier|retinue|royal decree|koli|kateeb|fanditha|sorcery|traditional magic|black magic|incantation|amulet|talisman|exorcism|evil spirit|ghost|demon|jinn|djinn|ogre|folklore|supernatural|superstition|divination|witchcraft|religious duty|buddhist|hindu'
    ),
    enGlossOnly: enRe(
      'fard|wajib|salah|azan|fasting|eid|alms|dua|zikr|sermon|hell|sin|sinner|righteous|sacred|holy|grave|tomb|ritual|ceremony|ceremonial|king|queen|empress|royal|royalty|palace|throne|crown|decree|edict|proclamation|vassal|statecraft|courtly|magic|magical|thaveedhu|myth|mythical|legend|omen|astrologer|religion|religious|creed|temple|idol'
    ),
    enExclude: enRe(
      'royal palm|royal tern|kingfisher|kingfish|queenfish|angelfish|emperor fish|crown of the head|crown of a tree|tooth crown|praying mantis|courtyard|court of law|tennis court|holy basil|good spirits|high spirits|spell out|spelling|fungus|mushroom|crinum|lily'
    ),
  },

  arts_games: {
    dvTaxon: dvExact(
      'ކުޅިވަރެއް|ލަވައެއް|ބެރެއް|ރާގެއް|ޅެމެއް|ރައިވަރެއް|ބަނދިއެއް|ފަރިއްސެއް|ނެށުމެއް|ވާހަކައެއް|ތަމްސީލެއް|ކުރެހުމެއް|މިޔުޒިކެއް'
    ),
    dvCue: dvExact(
      'ކުޅިވަރު|ޅެން|ޅެންވެރިކަން|ރައިވަރު|ބަނދި|ފަރިހި|ލަވަ|ރާގު|ބެރު|ބޮޑުބެރު|ތާރަ|ދަނޑިޖެހުން|ބަންޑިޔާ|ނެށުން|މިއުޒިކް|މިޔުޒިކު|ބައިބަލާ|ބަށި|ތިންމުގޯލި|ތާސް|ރާޒުވާ|ފުޓުބޯޅަ|ކްރިކެޓް|ވޮލީ|ތަމްސީލު|ޑްރާމާ|ޝާޢިރު'
    ),
    dvHwStem: dvStem(
      'ކުޅިވަރ|ޅެން|ރައިވަރ|ބަނދި|ފަރިހި|ލަވަ|ބޮޑުބެރ|ތާރަ|ދަނޑިޖެހ|ބަންޑިޔާ|ނެށު|މިއުޒިކ|މިޔުޒިކ|ބައިބަލާ|ބަށި|ތިންމުގޯލ|ރާޒުވާ|ފުޓުބޯޅަ|ކްރިކެޓ|ތަމްސީލ|ޑްރާމާ|ޝާޢިރ'
    ),
    enCore: enRe(
      "music|musical|melody|rhythm|singing|singer|lullaby|chorus|refrain|stanza|couplet|rhyme|prosody|poem|poems|poetry|poet|raivaru|bandhi|farihi|lhen|riddle|fable|folktale|storytelling|drama|theater|theatre|masquerade|dance|dances|dancing|dancer|boduberu|thaara|thara drum|dhandijehun|bandiyaa|traditional drum|drumming|drummer|tambourine|cymbal|flute|fiddle|violin|harmonium|guitar|percussion|musical instrument|game played|traditional game|children's game|board game|card game|ball game|competitive game|sport|sports|tournament|semifinal|wrestling|boxing|archery|baibalaa|bashi|thinmugoli|ohvalhugondi|mancala|chess|checkers|carrom|domino|spinning top|flying toy|paper kite|puppet|acrobatics|calligraphy|sculpture|in cricket|in tennis|table tennis|football|volleyball"
    ),
    enGlossOnly: enRe(
      'melodic|tune|rhythmic|tempo|song|songs|sing|chant|hymn|ballad|rhyming|poetic|ode|elegy|satire|acting|actor|performance|entertainment|amusement|recreation|pastime|drum|fife|trumpet|lute|accordion|game|games|player|contest|competition|fencing|dice|playing card|hide-and-seek|hopscotch|marbles|kite|kite-flying|seesaw|toy|doll|juggling|martial art|artwork|painting|drawing|sketch|carving|cricket|soccer|tennis'
    ),
    enExclude: enRe(
      'surgical instrument|measuring instrument|navigation instrument|optical instrument|eardrum|oil drum|brake drum|play a role|fair play|game meat|wild game|game bird|kite bird|brahminy kite|black kite|verse of the quran|quranic verse|draw water|matchstick|safety match|matchmaker'
    ),
  },

  home_crafts: {
    dvTaxon: dvExact(
      'އާލަތެއް|އާލާތެއް|ކަންވާރެއް|ހަތިޔާރެއް|ގެއެއް|ލަކުޑިގަނޑެއް|ވަލެއް|މަޅިއެއް|ގޮށެއް|ކުނައެއް|ފަންގިއެއް|ތައްޓެއް|ތެއްޔެއް|ވަޅިއެއް|ފުރޮއެއް|ކީހެއް|މަރުތޭލެއް|އެނދެއް|ގޮނޑިއެއް|މޭޒެއް|ފޮށްޓެއް|ބައްތިއެއް'
    ),
    dvCue: dvExact(
      'އާލަތް|އާލާތް|ކަންވާރު|ގޯތި|ގެދޮރު|އެނދު|އުނދޯލި|ޖޯލި|މޭޒު|ގޮނޑި|އަލަމާރި|ފޮށި|ތުނޑުކުނާ|ކުނާ|ރޯނު|ފަންގި|ލިޔެލާޖެހުން|ތިލޭރު|ވަޑާން|ވަޑި|ރޭނުން|އުވަ|ފުރާޅު|ފާރު|ދޮރު|ކުޑަދޮރު|ތަޅު|ތަޅުދަނޑި|ބަދިގެ|އުނދުން|ތެލި|ތަށި|ޖޯޑު|ސަމުސާ|ދޭފަތް|ވަޅި|ކަތިވަޅި|ފުރޯ|ކީސް|މަރުތޭލު|ރޮނދާ|މޮހޮރު|ކަތުރު|ތިނޯސް|ފުޅި|ބާލިދީ|ވަޅު|ފާޚާނާ|ބައްތި|އިލޮށިފަތި'
    ),
    dvHwStem: dvStem(
      'އާލަތ|އާލާތ|ކަންވާރ|ގޯތި|ގެދޮރ|އުނދޯލ|ޖޯލި|މޭޒު|ގޮނޑި|އަލަމާރ|ތުނޑުކުނާ|ރޯނު|ފަންގި|ފަންވިޔ|ލިޔެލާޖެހ|ތިލޭރ|ވަޑާން|ފުރާޅ|ކުޑަދޮރ|ތަޅުދަނޑ|ބަދިގެ|އުނދުން|ސަމުސާ|ދޭފަތ|ކަތިވަޅ|ފުރޯ|މަރުތޭލ|ރޮނދާ|މޮހޮރ|ކަތުރ|ތިނޯސް|ބާލިދީ|ފާޚާނާ|ބައްތި|އިލޮށިފަތ'
    ),
    enCore: enRe(
      'traditional house|inner house|dwelling|veranda|verandah|courtyard|thatch|rafter|doorway|fence gate|window shutter|padlock|hinge|ladder|cistern|furniture|hammock|lounge chair|cupboard|cabinet|wooden chest|storage chest|mattress|pillow|woven mat|thundukunaa|oil lamp|lantern|candle|broom|cooking pot|utensil|cookware|cauldron|skillet|platter|pitcher|earthenware|bucket|woven basket|wicker|sieve|strainer|grater|mortar and pestle|grinding stone|ladle|cleaver|tongs|tool used|tool made|sharpening|whetstone|carpenter|carpentry|woodworking|mallet|hatchet|adze|chisel|plane blade|handsaw|auger|pliers|pincers|wrench|screwdriver|crowbar|pickaxe|spade|shovel|sickle|scissors|needle|thimble|spindle|loom|bellows|anvil|forge|kiln|lathe|coir rope|slipknot|masonry|coral stone|blacksmith|goldsmith|silversmith|metalwork|lacquerware|lacquerwork|lacquer|mat-weaving|thatching|pottery|handicraft|firearm|musket|cannon|dagger|sword|spear|shield'
    ),
    enGlossOnly: enRe(
      'house|home|hut|cabin|cottage|shed|building|room|chamber|porch|compound|wall|partition|roof|pillar|ceiling|door|gate|window|shutter|latch|lock|key|stairs|fence|drain|bed|cot|joli|undhoali|chair|chaise|bench|table|desk|crate|shelf|cradle|cushion|mat|rug|carpet|curtain|lamp|wick|torch|brush|mop|pot|pan|kettle|wok|bowl|plate|tray|cup|mug|tumbler|jug|jar|bottle|flask|ewer|pail|basin|tub|barrel|cask|basket|colander|mortar|pestle|spoon|fork|knife|spatula|tool|tools|implement|apparatus|equipment|hammer|axe|ax|gouge|plane|saw|file|rasp|drill|awl|gimlet|hoe|rake|scythe|shears|shuttle|furnace|vise|clamp|nail|screw|peg|wedge|chain|wire|rope|cord|twine|knot|joinery|mason|plaster|brick|liyelaajehun|weaving|ceramic|craftsmanship|weapon|lance'
    ),
    enExclude: enRe(
      'boat|dhoni|ship|sail|mast|rudder|hull|keel|fishing hook|fishing line|mosque|palace|musical instrument|garment|clothing|dress|necklace|bracelet|blood vessel|cooked dish|sweet dish|curry dish|fish dish|food dish|fingernail|toenail|tree trunk|elephant trunk|chest pain|between the shoulders|well-known|as well|in a plane|airplane|answer key|bodily waste|feces|bowel movement'
    ),
  },

  clothing: {
    dvTaxon: dvExact(
      'ފޭރާމެއް|ހެދުމެއް|ލިބާހެއް|މުންޑެއް|ފޭއްޔެއް|ގަހަނާއެއް|އަނގޮޓިއެއް|ބަޅިއެއް|ތާކިހަލެއް|ފޮތިގަނޑެއް|ފޮއްޗެއް|ފަގުޑިއެއް|ބުރުގާއެއް|ރުމާލެއް|ފައިވާނެއް|ގަމީހެއް|ހަރުވާޅެއް'
    ),
    dvCue: dvExact(
      'ހެދުން|ފޭރާން|ލިބާސް|މުންޑު|ފޭލި|ގަހަނާ|އަނގޮޓި|ބަޅި|ކަންފަތުލާ|ތާކިހާ|ފަގުޑި|ބުރުގާ|ރުމާ|ޝޯލު|ގަމީސް|ފަޓުލޫނު|ސޯޓު|ހަރުވާޅު|ފައިވާން|ބޫޓު|އިސްޓާކީނު|ކަސަބު|ބޯވަޅު|ލޭސް|ރޮދި|ފޮތި|ސިލްކު|ފަށުވި|ކަފަ|ޖީބު|އަތުކުރި|ކަރުވަޅު'
    ),
    dvHwStem: dvStem(
      'ހެދުން|ހެދުމ|ފޭރާން|ފޭރާމ|ލިބާސް|ލިބާހ|މުންޑު|ފޭލި|ގަހަނާ|އަނގޮޓި|ބަޅި|ކަންފަތުލާ|ތާކިހާ|ފަގުޑި|ބުރުގާ|ރުމާ|ގަމީސް|ފަޓުލޫނ|ހަރުވާޅ|ފައިވާން|އިސްޓާކީނ|ކަސަބު|ބޯވަޅު|ފޮތި|ފަށުވި|ކަރުވަޅ'
    ),
    enCore: enRe(
      'clothing|garment|garments|apparel|attire|traditional dress|libaas|dhivehi libaas|feyli|mundu|sarong|loincloth|tunic|kaftan|waistcoat|blouse|trousers|undergarment|petticoat|headscarf|hijab|buruga|turban|fagudi|thaakihaa|skullcap|handkerchief|waistband|trouser pocket|side pocket|footwear|sandal|slipper|woven fabric|bolt of cloth|textile|velvet|satin|brocade|muslin|calico|embroidery|embroidered|kasabu|boavalhu|gold thread|silver thread|tailoring|dressmaking|piece of jewelry|jewelry|jewellery|necklace|pendant|locket|choker|bracelet|bangle|anklet|armlet|earring|brooch|hairpin|tiara|diadem|gemstone|filigree|cosmetic|kohl|henna|perfume|hairstyle|ornamental clothing|festive clothing|kandiki'
    ),
    enGlossOnly: enRe(
      'clothes|dress|dresses|robe|gown|cloak|coat|jacket|vest|shirt|pants|shorts|skirt|underwear|shawl|scarf|veil|hat|cap|bonnet|hood|apron|belt|sash|girdle|collar|sleeve|cuff|hem|seam|pleat|pocket|button|zipper|clasp|buckle|shoe|shoes|boot|clog|sock|stocking|gloves|fabric|cloth|linen|cotton|silk|wool|lace|tassel|fringe|ribbon|yarn|thread|tailor|adornment|ear-stud|nose ring|nose stud|gem|jewel|pearl|diamond|ruby|emerald|sapphire|amber|bead|beads|sequin|attar|makeup|finery'
    ),
    enExclude: enRe(
      'wear out|wear away|wear down|ring of|ring a bell|ringworm|anchor chain|iron chain|goldsmith|silversmith|royal crown|crown of|sailcloth|shroud|burial shroud|grave canopy|belly button|kneecap|whitecap|collarbone|cape headland|coat of paint|seed coat|cotton tree|silk-cotton|fishing line|fishing thread'
    ),
  },

  people_emotions: {
    dvTaxon: dvExact(
      'އިޙްސާސެއް|ސިފައެއް|އަޚްލާޤެއް|މިޒާޖެއް|ޢާއިލާއެއް|ތިމާގެކަމެއް|ކައިވެންޏެއް|ވަރިއެއް|ހިތާމައެއް|އުފަލެއް|ރުޅިއެއް|ބިރެއް|ލަދެއް'
    ),
    dvCue: dvExact(
      'ލޯބި|ރުޅި|ހިތާމަ|އުފާ|ބިރު|ލަދު|ހަސަދަ|ކެތްތެރިކަން|އޯގާތެރިކަން|ކުލުނު|ރަޙުމް|އިޙްތިރާމް|ފަޚުރު|ބޮޑާކަން|ކިބުރު|މަޑުމައިތިރި|ހިތްހެޔޮ|ހިތްތިރި|ހިތްވަރު|ފިނޑި|މޮޔަ|ބުއްދިވެރި|ތެދުވެރި|ދޮގުވެރި|ޚިޔާނާތް|މުރާލި|ކަންނެތް|ދަހި|ދީލަތި|މަންމަ|ބައްޕަ|މާމަ|ކާފަ|ދައްތަ|ބޭބެ|ކޮއްކޮ|ބޮޑުދައިތަ|ބޮޑުބޭބެ|އަނބިމީހާ|ފިރިމީހާ|ޅިޔަނު|ފަހަރި|މައިދައިތަ|ބަފައިބެ|ދޮންމަންމަ|ދޮންބައްޕަ|ކައިވެނި|ވަރި|ޢާއިލާ|އާއިލާ|ތިމާގެ|ރަޙްމަތްތެރި|އެކުވެރި|ދުޝްމަނު|އަވަށްޓެރި|މެހެމާނު|ޔަތީމު|ހުވަފަތް'
    ),
    dvHwStem: dvStem(
      'ލޯބި|ރުޅި|ހިތާމަ|އުފާ|އުފަލ|ބިރު|ލަދު|ހަސަދަ|ކެތްތެރ|އޯގާތެރ|ކުލުނު|އިޙްތިރާމ|ފަޚުރ|ބޮޑާ|ކިބުރ|މަޑުމައިތިރ|ހިތްހެޔޮ|ހިތްތިރ|ހިތްވަރ|ހިތްފަސޭހ|ފިނޑި|ބުއްދިވެރ|ތެދުވެރ|ދޮގުވެރ|ޚިޔާނާތ|މުރާލި|ކަންނެތ|ދީލަތި|މަންމަ|ބައްޕަ|މާމަ|ކާފަ|ދައްތަ|ބޭބެ|ކޮއްކޮ|ބޮޑުދައިތ|ބޮޑުބޭބ|އަނބި|ފިރިމީހ|ޅިޔަނ|ފަހަރި|މައިދައިތ|ބަފައިބެ|ދޮންމަންމ|ދޮންބައްޕ|ކައިވެނ|ޢާއިލާ|އާއިލާ|ތިމާގެ|ރަޙްމަތްތެރ|އެކުވެރ|ދުޝްމަނ|އަވަށްޓެރ|މެހެމާނ|ޔަތީމ|ހުވަފަތ'
    ),
    enCore: enRe(
      'affection|fondness|tenderness|compassion|empathy|sympathy|kindness|gentleness|nostalgia|homesickness|happiness|cheerful|cheerfulness|contentment|gratitude|arrogance|arrogant|haughty|conceited|boastful|humility|modesty|shyness|bashful|embarrassment|remorse|sorrow|sadness|grief|mourning|heartbreak|melancholy|despair|loneliness|anger|angry|fury|wrath|resentment|grudge|hatred|hostility|animosity|annoyance|frustration|impatience|patience|forbearance|afraid|terror|dread|fright|anxiety|anxious|cowardly|courageous|bravery|jealousy|jealous|envious|greed|greedy|stingy|miserly|generosity|selfish|cruelty|stubborn|obstinate|courteous|impudent|honesty|truthful|sincere|loyalty|trustworthy|dishonest|deceitful|treacherous|hypocrite|diligent|hardworking|laziness|slothful|foolish|gullible|temperament|personality|disposition|emotion|emotional|peace of mind|carefree|family member|kinship|maternal side|paternal side|grandmother|grandfather|grandparent|grandchild|sibling|cousin|nephew|niece|mother-in-law|father-in-law|brother-in-law|sister-in-law|stepmother|stepfather|stepchild|orphan|widow|widower|marriage|wedding|bride|bridegroom|spouse|husband|wife|co-wife|divorce|betrothal|dowry|friendship|companion|neighbor|neighbour|illegitimate child|born out of wedlock'
    ),
    enGlossOnly: enRe(
      'love|mercy|caring|devotion|passion|desire|longing|yearning|joy|joyful|happy|delight|pleasure|glad|bliss|satisfaction|grateful|thankful|hope|hopeful|optimism|pride|proud|vain|vanity|humble|modest|shy|timid|shame|ashamed|embarrassed|guilt|guilty|regret|sad|grieve|mourn|dejected|depressed|lonely|rage|ire|hate|impatient|fear|panic|worry|worried|nervous|coward|courage|brave|fearless|envy|miser|generous|cruel|rebellious|obedient|polite|rude|honest|loyal|faithful|cunning|sly|lazy|clever|intelligent|wise|wisdom|fool|stupid|naive|eccentric|virtue|moral|morality|feeling|feelings|mood|attitude|manners|family|relative|relatives|kin|ancestry|ancestor|descendant|parent|parents|mother|mom|father|dad|son|daughter|brother|sister|aunt|uncle|in-law|bachelor|marry|married|nikah|groom|divorced|engagement|friend|comrade|guest|enemy|foe|rival|stranger|maternal|paternal|respect|honor|appreciate|bully|tyrannical'
    ),
    enExclude: enRe(
      "kind of|a kind|patient in a hospital|medical patient|mother-of-pearl|mother tongue|baby fish|young fish|young coconut|young plant|baby bird|children's game|child's game|children's song|warm weather|gentle breeze|gentle wind|heart disease|lovebird|bitter taste|sour taste|angry sea|host of|burrow|lays eggs|shorebird"
    ),
  },
});

/**
 * Classifies a dictionary entry into 0, 1, or 2 curated Maldivian thematic categories.
 * Supports both full (`{ headword, senses, enGloss, enMeaning }`) and compact (`{ h, s, eg, em }`) entries.
 */
export function classifyEntryCategories(entry) {
  const hw = String(entry?.headword ?? entry?.h ?? '').trim();
  if (!hw || SINGLE_THAANA_LETTER_RE.test(hw)) return [];

  const senses = entry?.senses ?? entry?.s ?? [];
  const sensesText = Array.isArray(senses) ? senses.join(' ') : String(senses);
  const gloss = String(entry?.enGloss ?? entry?.eg ?? '').trim();
  const meaningRaw = String(entry?.enMeaning ?? entry?.em ?? '').trim();
  const meaningClean = meaningRaw.replace(SIMILE_STRIP_RE, ' ');

  const scored = [];

  for (const catId of CATEGORY_KEYS) {
    const rule = CATEGORY_RULES[catId];
    let score = 0;

    const excludedEn =
      rule.enExclude &&
      ((gloss && rule.enExclude.test(gloss)) || (meaningRaw && rule.enExclude.test(meaningRaw)));

    if (rule.dvTaxon.test(hw)) score += 6;
    if (rule.dvTaxon.test(sensesText)) score += 6;

    if (rule.dvCue.test(hw)) score += 5;
    else if (rule.dvHwStem.test(hw)) score += 4;

    if (rule.dvCue.test(sensesText)) score += 3;

    if (!excludedEn) {
      if (gloss && (rule.enCore.test(gloss) || rule.enGlossOnly.test(gloss))) {
        score += 5;
      }
      if (meaningClean && rule.enCore.test(meaningClean)) {
        score += 4;
      }
    }

    if (score >= 5) {
      scored.push({ catId, score });
    }
  }

  if (scored.length === 0) return [];

  scored.sort((a, b) => b.score - a.score);
  const top = [scored[0].catId];
  if (
    scored.length > 1 &&
    scored[1].score >= 5 &&
    scored[1].score >= scored[0].score * 0.55
  ) {
    top.push(scored[1].catId);
  }
  return top;
}
