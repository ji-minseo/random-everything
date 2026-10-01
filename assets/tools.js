const $ = (selector) => document.querySelector(selector);

function parseItems(value) {
  return value.split(/\n|,/).map(v => v.trim()).filter(Boolean);
}
function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const old = button.textContent;
    button.textContent = "Copied!";
    setTimeout(() => button.textContent = old, 1100);
  } catch {
    window.prompt("Copy this:", text);
  }
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function initColor() {
  const swatch = $("#swatch");
  const code = $("#colorCode");
  const generate = () => {
    const color = "#" + Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, "0").toUpperCase();
    swatch.style.background = color;
    code.textContent = color;
  };
  $("#generate").addEventListener("click", generate);
  $("#copy").addEventListener("click", (e) => copyText(code.textContent, e.currentTarget));
  generate();
}

function initChoice() {
  const output = $("#choiceResult");
  $("#pick").addEventListener("click", () => {
    const items = parseItems($("#items").value);
    output.textContent = items.length ? sample(items) : "Add at least one choice";
  });
  $("#example").addEventListener("click", () => {
    $("#items").value = "Pizza\nTacos\nPasta\nSushi";
  });
}

function colorsFor(count) {
  const palette = ["#0A84FF","#65B5FF","#FFD95A","#76D7C4","#FFB5C8","#8CC8FF","#FFAA7A","#A7E46B"];
  return Array.from({length: count}, (_, i) => palette[i % palette.length]);
}
function wheelGradient(items) {
  const colors = colorsFor(items.length);
  const step = 360 / items.length;
  return `conic-gradient(${items.map((_, i) => `${colors[i]} ${i*step}deg ${(i+1)*step}deg`).join(",")})`;
}
function initWheel() {
  const wheel = $("#wheel");
  const output = $("#wheelResult");
  const input = $("#wheelItems");
  const removeWinner = $("#removeWinner");
  const soundToggle = $("#wheelSound");
  const shareStatus = $("#wheelShareStatus");
  let rotation = 0;
  let spinning = false;
  const storageKey = "randomEverythingWheel";

  const loadStored = () => {
    const params = new URLSearchParams(location.search);
    const shared = params.get("items");
    if (shared) {
      input.value = shared;
      removeWinner.checked = params.get("remove") === "1";
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved?.items) input.value = saved.items;
      if (typeof saved?.remove === "boolean") removeWinner.checked = saved.remove;
      if (typeof saved?.sound === "boolean") soundToggle.checked = saved.sound;
    } catch {}
  };
  const saveStored = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        items: input.value,
        remove: removeWinner.checked,
        sound: soundToggle.checked
      }));
    } catch {}
  };
  const renderLabels = items => {
    wheel.innerHTML = "";
    if (items.length < 2) return;
    const step = 360 / items.length;
    const size = items.length > 18 ? 9 : items.length > 12 ? 10 : items.length > 8 ? 11 : 12;
    items.forEach((item,i) => {
      const angle = i * step + step / 2;
      const rad = angle * Math.PI / 180;
      const label = document.createElement("span");
      label.className = "wheel-label";
      label.textContent = item;
      label.title = item;
      label.style.left = `${50 + Math.sin(rad) * 31}%`;
      label.style.top = `${50 - Math.cos(rad) * 31}%`;
      const flip = angle > 90 && angle < 270 ? 180 : 0;
      label.style.transform = `translate(-50%,-50%) rotate(${angle + flip}deg)`;
      label.style.fontSize = size + "px";
      wheel.appendChild(label);
    });
  };
  const sync = () => {
    const items = parseItems(input.value);
    wheel.style.background = items.length > 1 ? wheelGradient(items) : "#e8f3ff";
    renderLabels(items);
    saveStored();
  };
  const audioTone = (freq=440,duration=.06,volume=.035) => {
    if (!soundToggle.checked) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx(), osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq; gain.gain.value = volume;
      osc.connect(gain); gain.connect(ctx.destination); osc.start();
      gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + duration);
      osc.stop(ctx.currentTime + duration);
      osc.onended = () => ctx.close();
    } catch {}
  };
  const spinSound = () => {
    if (!soundToggle.checked) return;
    [0,180,380,610,870,1160,1480,1830,2200,2580,2920].forEach((t,i)=>
      setTimeout(()=>audioTone(240 + i*14,.045,.02),t)
    );
  };
  const celebrate = () => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer=document.createElement("div");layer.className="confetti-layer";
    const chars=["✦","●","■","▲"];
    for(let i=0;i<54;i++){
      const piece=document.createElement("i");piece.textContent=chars[i%chars.length];
      piece.style.left=(10+Math.random()*80)+"%";
      piece.style.setProperty("--drift",(Math.random()*160-80)+"px");
      piece.style.setProperty("--delay",(Math.random()*.28)+"s");
      piece.style.setProperty("--spin",(Math.random()*540+180)+"deg");
      piece.style.color=colorsFor(8)[i%8];
      layer.appendChild(piece);
    }
    document.body.appendChild(layer);setTimeout(()=>layer.remove(),1900);
  };

  loadStored();
  input.addEventListener("input", sync);
  removeWinner.addEventListener("change", saveStored);
  soundToggle.addEventListener("change", saveStored);

  $("#shareWheel").addEventListener("click", async e => {
    const items = parseItems(input.value);
    if (!items.length) {
      shareStatus.textContent = "Add at least one choice first.";
      return;
    }
    const u = new URL(location.href);
    u.search = "";
    u.searchParams.set("items", items.join("\n"));
    if (removeWinner.checked) u.searchParams.set("remove","1");
    await copyText(u.toString(), e.currentTarget);
    shareStatus.textContent = "Share link copied.";
    setTimeout(()=>shareStatus.textContent="",1800);
  });

  $("#spin").addEventListener("click", () => {
    if (spinning) return;
    const items = parseItems(input.value);
    if (items.length < 2) {
      output.textContent = "Add at least two choices";
      return;
    }
    spinning = true;
    $("#spin").disabled = true;
    const winnerIndex = Math.floor(Math.random() * items.length);
    const step = 360 / items.length;
    const targetCenter = winnerIndex * step + step / 2;
    const normalized = ((rotation % 360) + 360) % 360;
    const desired = (360 - targetCenter) % 360;
    const delta = (desired - normalized + 360) % 360;
    rotation += 360 * (5 + Math.floor(Math.random() * 3)) + delta;
    wheel.style.transform = `rotate(${rotation}deg)`;
    output.textContent = "Spinning…";
    spinSound();
    setTimeout(() => {
      const winner = items[winnerIndex];
      output.textContent = winner;
      audioTone(660,.16,.055);setTimeout(()=>audioTone(880,.18,.05),120);
      celebrate();
      if (removeWinner.checked) {
        items.splice(winnerIndex,1);
        input.value = items.join("\n");
        sync();
      }
      spinning = false;
      $("#spin").disabled = false;
    }, 3250);
  });
  sync();
}

function renderGroups(container, groups, label="Group") {
  container.innerHTML = groups.map((group, i) =>
    `<section class="team"><h3>${label} ${i+1}</h3><ul>${group.map(n => `<li>${escapeHtml(n)}</li>`).join("")}</ul></section>`
  ).join("");
}
function initTeams() {
  $("#makeTeams").addEventListener("click", () => {
    const names = parseItems($("#names").value);
    const count = Math.max(2, Math.min(Number($("#teamCount").value) || 2, Math.max(2, names.length)));
    const container = $("#teamsResult");
    if (names.length < 2) {
      container.innerHTML = "<div class='team'><h3>Add at least two names</h3></div>";
      return;
    }
    const teams = Array.from({length: Math.min(count, names.length)}, () => []);
    shuffle(names).forEach((name, index) => teams[index % teams.length].push(name));
    renderGroups(container, teams, "Team");
  });
}

const pictionary = {
  word: {
    animals: {
      easy: ["cat","dog","rabbit","fish","duck","horse","frog","mouse","turtle","sheep"],
      medium: ["dolphin","penguin","giraffe","octopus","kangaroo","jellyfish","raccoon","peacock","hamster","seahorse"],
      hard: ["chameleon","platypus","narwhal","armadillo","porcupine","axolotl","mongoose","wolverine","cassowary","pangolin"]
    },
    food: {
      easy: ["apple","pizza","cake","banana","cookie","carrot","donut","burger","grapes","sandwich"],
      medium: ["avocado","cupcake","popcorn","spaghetti","pancake","sushi","waffle","pretzel","taco","croissant"],
      hard: ["ratatouille","soufflé","charcuterie","gnocchi","tiramisu","baklava","kimchi","paella","risotto","tempura"]
    },
    places: {
      easy: ["beach","school","park","farm","zoo","store","house","garden","pool","library"],
      medium: ["airport","museum","stadium","lighthouse","castle","campsite","aquarium","subway","harbor","waterfall"],
      hard: ["observatory","archipelago","catacomb","amphitheater","monastery","greenhouse","shipyard","planetarium","embassy","vineyard"]
    },
    actions: {
      easy: ["run","jump","dance","sleep","wave","swim","laugh","read","sing","cook"],
      medium: ["whisper","juggle","skate","sneeze","stretch","climb","balance","knit","salute","tiptoe"],
      hard: ["negotiate","daydream","eavesdrop","procrastinate","improvise","meditate","investigate","camouflage","apologize","celebrate"]
    },
    objects: {
      easy: ["book","hat","chair","phone","clock","key","ball","lamp","shoe","spoon"],
      medium: ["backpack","headphones","telescope","skateboard","umbrella","flashlight","typewriter","binoculars","suitcase","thermometer"],
      hard: ["metronome","periscope","hourglass","compass","abacus","stethoscope","kaleidoscope","sextant","phonograph","microscope"]
    },
    people: {
      easy: ["teacher","doctor","chef","baby","farmer","singer","king","queen","pilot","artist"],
      medium: ["detective","firefighter","magician","astronaut","photographer","lifeguard","scientist","barista","mechanic","referee"],
      hard: ["archaeologist","ventriloquist","choreographer","meteorologist","cartographer","blacksmith","conductor","ambassador","paleontologist","illusionist"]
    }
  },
  phrase: {
    animals: {
      easy: ["cat in a box","dog chasing a ball","duck in the rain","fish in a bowl","rabbit eating a carrot","horse jumping a fence","frog on a lily pad","mouse with cheese","turtle at the beach","sheep on a hill"],
      medium: ["penguin on vacation","dolphin jumping through a hoop","giraffe wearing a scarf","octopus playing drums","kangaroo carrying groceries","jellyfish at a party","raccoon opening a trash can","peacock showing its feathers","hamster on a wheel","seahorse in a race"],
      hard: ["chameleon changing colors","platypus solving a mystery","narwhal at a birthday party","armadillo rolling downhill","porcupine getting a haircut","axolotl wearing sunglasses","mongoose guarding a treasure","wolverine reading a map","cassowary crossing a road","pangolin doing yoga"]
    },
    food: {
      easy: ["eating ice cream","birthday cake with candles","making a sandwich","cutting a pizza","peeling a banana","sharing cookies","drinking hot chocolate","popping popcorn","making pancakes","packing a lunch"],
      medium: ["burning the toast","spaghetti on a white shirt","sushi on a conveyor belt","waffle tower falling over","avocado on toast","taco spilling everywhere","croissant at breakfast","giant bowl of ramen","picnic with cupcakes","pretzel shaped like a heart"],
      hard: ["soufflé collapsing in the oven","chef plating ratatouille","sharing a charcuterie board","rolling homemade gnocchi","decorating tiramisu","making baklava layers","fermenting kimchi","cooking paella outdoors","stirring mushroom risotto","frying tempura vegetables"]
    },
    places: {
      easy: ["day at the beach","walking to school","picnic in the park","feeding animals on a farm","visiting the zoo","shopping at a store","cleaning the house","watering the garden","swimming at the pool","reading in the library"],
      medium: ["missing a flight at the airport","getting lost in a museum","cheering in a stadium","climbing a lighthouse","exploring an old castle","camping in the rain","sleeping beside an aquarium","waiting for the subway","boats in a busy harbor","hiking to a waterfall"],
      hard: ["stargazing at an observatory","island hopping through an archipelago","exploring an underground catacomb","performing in an amphitheater","visiting a mountain monastery","plants inside a greenhouse","repairing a ship at the shipyard","watching stars in a planetarium","meeting at an embassy","harvesting grapes in a vineyard"]
    },
    actions: {
      easy: ["riding a bike","flying a kite","reading a book","playing soccer","washing the car","opening a present","building a snowman","jumping in puddles","walking the dog","brushing your teeth"],
      medium: ["missing the bus","winning a race","taking a selfie","singing in the shower","chasing a butterfly","stuck in traffic","building a sandcastle","juggling three balls","walking on the moon","trying to balance on one foot"],
      hard: ["thinking outside the box","walking on thin ice","breaking the ice","spilling the beans","hitting the road","time flying by","reading between the lines","barking up the wrong tree","pulling an all-nighter","trying to multitask"]
    },
    objects: {
      easy: ["balloon tied to a chair","book under a pillow","hat blown by the wind","phone with a cracked screen","clock striking midnight","key stuck in a lock","ball bouncing downstairs","lamp beside a bed","shoe full of water","spoon in a cereal bowl"],
      medium: ["backpack full of bricks","headphones tangled in a pocket","telescope pointed at the moon","skateboard under a couch","umbrella turning inside out","flashlight with dead batteries","typewriter missing a key","binoculars at a birdwatching trip","suitcase that will not close","thermometer in a snowstorm"],
      hard: ["metronome keeping a strange rhythm","periscope above the water","hourglass almost empty","compass pointing the wrong way","abacus in a math contest","stethoscope around a statue","kaleidoscope full of stars","sextant on a pirate ship","phonograph playing an old record","microscope showing a tiny world"]
    },
    people: {
      easy: ["teacher writing on a board","doctor checking a heartbeat","chef flipping a pancake","baby taking first steps","farmer driving a tractor","singer on a stage","king wearing a crown","queen waving from a balcony","pilot flying a plane","artist painting a portrait"],
      medium: ["detective following footprints","firefighter rescuing a cat","magician pulling a rabbit from a hat","astronaut planting a flag","photographer chasing the perfect shot","lifeguard blowing a whistle","scientist mixing a potion","barista making latte art","mechanic changing a tire","referee showing a red card"],
      hard: ["archaeologist uncovering a fossil","ventriloquist arguing with a puppet","choreographer teaching a dance","meteorologist tracking a storm","cartographer drawing a fantasy map","blacksmith forging a sword","conductor leading an orchestra","ambassador giving a speech","paleontologist assembling a skeleton","illusionist escaping from a locked box"]
    }
  }
};

function initPictionary() {
  const output = $("#wordResult");
  const typeEl = $("#pictionaryType"), diffEl = $("#difficulty"), catEl = $("#pictionaryCategory"), countEl = $("#promptCountSelect");
  const promptMeta = $("#promptCount");
  const decks = new Map();
  let timerId = null, remaining = 60;

  const poolFor = () => {
    const type = typeEl?.value || "word", difficulty = diffEl?.value || "easy", category = catEl?.value || "all";
    const categories = category === "all" ? Object.keys(pictionary[type]) : [category];
    return categories.flatMap(cat => (pictionary[type][cat]?.[difficulty] || []).map(text => ({text,category:cat})));
  };
  const deckKey = () => `${typeEl?.value||"word"}|${diffEl?.value||"easy"}|${catEl?.value||"all"}`;
  const getDeck = () => {
    const key=deckKey(),pool=poolFor();
    let deck=decks.get(key);
    if(!deck?.length) { deck=shuffle(pool); decks.set(key,deck); }
    return deck;
  };
  const totalBuiltIn = Object.values(pictionary).reduce((sum,typeMap)=>
    sum + Object.values(typeMap).reduce((a,catMap)=>a + Object.values(catMap).reduce((b,arr)=>b+arr.length,0),0),0
  );
  const updateMeta = () => {
    const pool=poolFor(),deck=decks.get(deckKey());
    const left=deck?.length ?? pool.length;
    promptMeta.textContent=`${totalBuiltIn} prompts built in · ${pool.length} match these filters · ${left} left before repeats`;
  };
  const draw = () => {
    const pool=poolFor();
    if(!pool.length){output.textContent="No prompts match these filters";return}
    const requested=Math.max(1,Math.min(Number(countEl?.value||1),pool.length));
    const picks=[];
    while(picks.length<requested){
      const deck=getDeck();
      if(!deck.length)continue;
      picks.push(deck.pop());
    }
    if(picks.length===1) output.textContent=picks[0].text;
    else output.innerHTML=`<div class="prompt-stack">${picks.map((p,i)=>`<div><span>${i+1}</span>${escapeHtml(p.text)}</div>`).join("")}</div>`;
    updateMeta();
  };
  const resetDeck = () => { decks.delete(deckKey()); draw(); };

  const formatTime=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const syncTimer = () => $("#timerDisplay").textContent=formatTime(remaining);
  const beep = () => {
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext,ctx=new AudioCtx(),osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.frequency.value=720;gain.gain.value=.05;osc.connect(gain);gain.connect(ctx.destination);osc.start();
      gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.35);osc.stop(ctx.currentTime+.35);osc.onended=()=>ctx.close();
    }catch{}
  };
  const resetTimer = () => {
    clearInterval(timerId);timerId=null;remaining=Number($("#timerSeconds").value||60);syncTimer();$("#startTimer").textContent="Start timer";
  };
  $("#startTimer").addEventListener("click",()=>{
    if(timerId){clearInterval(timerId);timerId=null;$("#startTimer").textContent="Resume";return}
    if(remaining<=0)remaining=Number($("#timerSeconds").value||60);
    $("#startTimer").textContent="Pause";
    timerId=setInterval(()=>{
      remaining--;syncTimer();
      if(remaining<=0){clearInterval(timerId);timerId=null;$("#startTimer").textContent="Start timer";beep();output.classList.add("timer-done");setTimeout(()=>output.classList.remove("timer-done"),700)}
    },1000);
  });
  $("#resetTimer").addEventListener("click",resetTimer);
  $("#timerSeconds").addEventListener("change",resetTimer);
  $("#newWord").addEventListener("click",draw);
  $("#resetPrompts").addEventListener("click",resetDeck);
  [typeEl,diffEl,catEl,countEl].forEach(el=>el?.addEventListener("change",()=>{
    if(el!==countEl) decks.delete(deckKey());
    draw();
  }));
  remaining=Number($("#timerSeconds").value||60);syncTimer();draw();updateMeta();
}

function initNumber() {
  const output = $("#numberResult");
  const generate = () => {
    let min = Math.trunc(Number($("#minNumber").value));
    let max = Math.trunc(Number($("#maxNumber").value));
    let count = Math.max(1, Math.min(20, Math.trunc(Number($("#numberCount").value)) || 1));
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      output.textContent = "Enter valid numbers";
      return;
    }
    if (min > max) [min, max] = [max, min];
    const nums = Array.from({length: count}, () => randomInt(min, max));
    output.textContent = nums.join(", ");
  };
  $("#generateNumber").addEventListener("click", generate);
  generate();
}

const firstNames = ["Avery","Mia","Noah","Liam","Emma","Lucas","Sofia","Leo","Chloe","Ethan","Maya","Theo","Ella","Owen","Lily","Kai","Nora","Milo","Zoe","Finn","Ivy","Aria","Jude","Ruby","Ezra","Luna","Alex","Sam","Taylor","Jordan","Riley","Casey","Jamie","Morgan","Quinn","Rowan","Skyler","Parker","Reese","Cameron"];
const lastNames = ["Anderson","Bennett","Brooks","Carter","Clark","Collins","Cooper","Davis","Evans","Foster","Gray","Green","Hall","Hayes","Hill","Howard","James","Kelly","Lee","Lewis","Martin","Miller","Moore","Morgan","Parker","Reed","Rivera","Scott","Smith","Stone","Taylor","Thomas","Turner","Walker","Ward","White","Wilson","Wright","Young","King"];
function initName() {
  const output = $("#nameResult");
  const generate = () => {
    const count = Math.max(1, Math.min(10, Math.trunc(Number($("#nameCount").value)) || 1));
    const style = $("#nameStyle")?.value || "full";
    const names = new Set();
    const maxUnique = style === "first" ? firstNames.length : style === "last" ? lastNames.length : firstNames.length * lastNames.length;
    const target = Math.min(count, maxUnique);
    while (names.size < target) {
      if (style === "first") names.add(sample(firstNames));
      else if (style === "last") names.add(sample(lastNames));
      else names.add(`${sample(firstNames)} ${sample(lastNames)}`);
    }
    output.textContent = [...names].join(" · ");
  };
  $("#generateName").addEventListener("click", generate);
  $("#nameStyle")?.addEventListener("change", generate);
  generate();
}

const randomWords = {
  noun: ["anchor","apple","beacon","bridge","candle","castle","cloud","comet","crystal","door","forest","garden","harbor","island","jacket","key","lantern","mirror","ocean","paper","river","rocket","shadow","signal","star","stone","tower","train","window","wing"],
  verb: ["build","catch","climb","dance","drift","explore","float","gather","glow","imagine","jump","listen","mix","open","paint","race","remember","roll","search","share","sketch","spin","travel","wander","whisper","write","zoom","balance","create","discover"],
  adjective: ["bright","calm","clever","cozy","curious","gentle","golden","happy","hidden","icy","lucky","messy","quiet","rapid","round","shiny","silent","soft","strange","sunny","tiny","wild","witty","brave","crisp","dreamy","fresh","playful","simple","vivid"]
};
function initWord() {
  const output = $("#randomWordResult");
  const generate = () => {
    const category = $("#wordCategory").value;
    const count = Math.max(1, Math.min(12, Math.trunc(Number($("#wordCount").value)) || 1));
    const pool = category === "all" ? [...randomWords.noun, ...randomWords.verb, ...randomWords.adjective] : randomWords[category];
    output.textContent = shuffle(pool).slice(0, Math.min(count, pool.length)).join(" · ");
  };
  $("#generateWord").addEventListener("click", generate);
  generate();
}

function initGroups() {
  $("#makeGroups").addEventListener("click", () => {
    const items = parseItems($("#groupItems").value);
    const size = Math.max(1, Math.trunc(Number($("#groupSize").value)) || 2);
    const container = $("#groupsResult");
    if (items.length < 2) {
      container.innerHTML = "<div class='team'><h3>Add at least two items</h3></div>";
      return;
    }
    const shuffled = shuffle(items);
    const groups = [];
    for (let i = 0; i < shuffled.length; i += size) groups.push(shuffled.slice(i, i + size));
    renderGroups(container, groups, "Group");
  });
}

function initYesNo() {
  const output = $("#yesNoResult");
  const history = $("#yesNoHistory");
  const answers = [];
  $("#answerYesNo").addEventListener("click", () => {
    const answer = Math.random() < 0.5 ? "Yes" : "No";
    output.textContent = answer;
    answers.unshift(answer);
    answers.splice(5);
    history.textContent = answers.length > 1 ? "Recent: " + answers.join(" · ") : "";
  });
}


function addBottomToolTabs() {
  const topTabs = document.querySelector(".tool-tabs");
  const adSlot = document.querySelector(".ad-slot");
  if (!topTabs || !adSlot || document.querySelector(".more-tools")) return;

  const section = document.createElement("section");
  section.className = "more-tools";

  const label = document.createElement("div");
  label.className = "more-tools-label";
  label.textContent = "Try another random tool";

  const bottomTabs = topTabs.cloneNode(true);
  bottomTabs.classList.add("bottom-tabs");
  bottomTabs.setAttribute("aria-label", "More random tools");

  section.append(label, bottomTabs);
  adSlot.insertAdjacentElement("afterend", section);
}

addBottomToolTabs();

const tool = document.body.dataset.tool;
if (tool === "color") initColor();
if (tool === "choice") initChoice();
if (tool === "wheel") initWheel();
if (tool === "teams") initTeams();
if (tool === "pictionary") initPictionary();
if (tool === "number") initNumber();
if (tool === "name") initName();
if (tool === "word") initWord();
if (tool === "groups") initGroups();
if (tool === "yesno") initYesNo();
