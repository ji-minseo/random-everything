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

function initColor() {
  const swatch = $("#swatch");
  const code = $("#colorCode");
  const generate = () => {
    const color = "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0").toUpperCase();
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
  const palette = ["#7C6DF2","#FFB5C8","#FFD95A","#76D7C4","#8CC8FF","#C7A6FF","#FFAA7A","#A7E46B"];
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
    wheel.style.background = items.length > 1 ? wheelGradient(items) : "#efedff";
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
    const extra = 360 * (5 + Math.floor(Math.random() * 3));
    rotation += extra + (360 - ((rotation + targetCenter) % 360));
    wheel.style.transform = `rotate(${rotation}deg)`;
    output.textContent = "Spinning…";
    setTimeout(() => output.textContent = items[winnerIndex], 3250);
  });
  sync();
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
    container.innerHTML = teams.map((team, i) =>
      `<section class="team"><h3>Team ${i+1}</h3><ul>${team.map(n => `<li>${escapeHtml(n)}</li>`).join("")}</ul></section>`
    ).join("");
  });
}
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

const pictionary = {
  easy: ["apple","beach","cat","cake","cloud","dog","flower","hat","moon","pizza","rainbow","star","tree","train","umbrella","balloon","book","candle","fish","house"],
  medium: ["airport","backpack","campfire","dinosaur","firefighter","headphones","iceberg","lighthouse","mermaid","popcorn","robot","skateboard","spaceship","treasure","volcano","waterfall","carousel","detective","jellyfish","telescope"],
  hard: ["awkward","balance","celebration","confusion","gravity","imagination","invisible","jealousy","mystery","reflection","suspicious","time travel","traffic jam","whisper","zero gravity","déjà vu","daydream","coincidence","disguise","echo"]
};
function initPictionary() {
  const output = $("#wordResult");
  const draw = () => output.textContent = sample(pictionary[$("#difficulty").value]);
  $("#newWord").addEventListener("click", draw);
  draw();
}

const tool = document.body.dataset.tool;
if (tool === "color") initColor();
if (tool === "choice") initChoice();
if (tool === "wheel") initWheel();
if (tool === "teams") initTeams();
if (tool === "pictionary") initPictionary();
