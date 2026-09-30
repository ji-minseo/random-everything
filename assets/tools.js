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
  let rotation = 0;
  const sync = () => {
    const items = parseItems($("#wheelItems").value);
    wheel.style.background = items.length > 1 ? wheelGradient(items) : "#e8f3ff";
  };
  $("#wheelItems").addEventListener("input", sync);
  $("#spin").addEventListener("click", () => {
    const items = parseItems($("#wheelItems").value);
    if (items.length < 2) {
      output.textContent = "Add at least two choices";
      return;
    }
    const winnerIndex = Math.floor(Math.random() * items.length);
    const step = 360 / items.length;
    const targetCenter = winnerIndex * step + step / 2;
    const normalized = ((rotation % 360) + 360) % 360;
    const desired = (360 - targetCenter) % 360;
    const delta = (desired - normalized + 360) % 360;
    rotation += 360 * (5 + Math.floor(Math.random() * 3)) + delta;
    wheel.style.transform = `rotate(${rotation}deg)`;
    output.textContent = "Spinning…";
    setTimeout(() => output.textContent = items[winnerIndex], 3250);
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
    easy: ["apple","beach","cat","cake","cloud","dog","flower","hat","moon","pizza","rainbow","star","tree","train","umbrella","balloon","book","candle","fish","house"],
    medium: ["airport","backpack","campfire","dinosaur","firefighter","headphones","iceberg","lighthouse","mermaid","popcorn","robot","skateboard","spaceship","treasure","volcano","waterfall","carousel","detective","jellyfish","telescope"],
    hard: ["awkward","balance","celebration","confusion","gravity","imagination","invisible","jealousy","mystery","reflection","suspicious","whisper","déjà vu","daydream","coincidence","disguise","echo","symmetry","nostalgia","illusion"]
  },
  phrase: {
    easy: ["walking the dog","birthday cake","riding a bike","building a snowman","flying a kite","reading a book","eating ice cream","jumping in puddles","playing soccer","washing the car","opening a present","making pancakes"],
    medium: ["missing the bus","lost in a maze","camping in the rain","winning a race","taking a selfie","burning the toast","finding buried treasure","singing in the shower","walking on the moon","chasing a butterfly","stuck in traffic","building a sandcastle"],
    hard: ["elephant in the room","thinking outside the box","needle in a haystack","raining cats and dogs","piece of cake","break the ice","walking on thin ice","under the weather","once in a blue moon","spill the beans","hit the road","time flies"]
  }
};
function initPictionary() {
  const output = $("#wordResult");
  const draw = () => {
    const type = $("#pictionaryType")?.value || "word";
    const difficulty = $("#difficulty").value;
    output.textContent = sample(pictionary[type][difficulty]);
  };
  $("#newWord").addEventListener("click", draw);
  $("#pictionaryType")?.addEventListener("change", draw);
  $("#difficulty").addEventListener("change", draw);
  draw();
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
