// UniAI: a reading-rewards AI study chat (prototype, mock responses only)
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { MessageSquare, Gift, Trophy, Settings, Sparkles, ScanSearch, X, Lock, Check, Plus, Menu, Sun, Moon, RotateCcw, ChevronDown, Compass, GraduationCap, FlaskConical, Brain, Egg, ArrowUp, Info, Coins, BadgePercent, Ticket, Copy } from "lucide-react";
import "./index.css";

const Lucide: Record<string, any> = { MessageSquare, Gift, Trophy, Settings, Sparkles, ScanSearch, X, Lock, Check, Plus, Menu, Sun, Moon, RotateCcw, ChevronDown, Compass, GraduationCap, FlaskConical, Brain, Egg, ArrowUp, Info, Coins, BadgePercent, Ticket, Copy };

function Icon({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  const C = Lucide[name];
  if (!C) return <span aria-hidden="true" style={{ display: "inline-block", width: size, height: size }} />;
  return <C size={size} strokeWidth={1.9} className={className} aria-hidden="true" />;
}

/* ---------------- Types ---------------- */
type ModelId = "explorer" | "scholar" | "researcher" | "mastermind";
type Page = "chat" | "rewards" | "leaderboard" | "settings";
type Theme = "light" | "dark";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  responseId?: string; // which library answer produced this (eggs are looked up separately)
  model?: ModelId;
  ts: number;
}
interface Conversation { id: string; title: string; messages: Message[]; updatedAt: number; }
interface AppState {
  version: number;
  points: number;
  name: string;
  theme: Theme;
  unlocked: ModelId[];
  claimed: string[];
  conversations: Conversation[];
  activeId: string | null;
  model: ModelId;
  tokens: number; // bonus tokens earned by exchanging points
  redemptions: Redemption[];
}
interface Perk { id: string; kind: "tokens" | "discount"; title: string; cost: number; amount: number; desc: string; icon: string; repeatable: boolean; }
interface Redemption { id: string; perkId: string; code?: string; ts: number; }
interface MockResponse {
  id: string;
  keywords: string[];
  text: string;
  takeaways: string[];
  quiz: string;
  connect: string;
  eligible: boolean;
}
interface Egg { id: string; phrase: string; keys: string[]; points: number; rare: boolean; original?: string; } // original: set when the egg is a swapped-in silly word

/* ---------------- Models ---------------- */
const MODELS: { id: ModelId; name: string; cost: number; icon: string; blurb: string; perks: string[] }[] = [
  { id: "explorer", name: "Explorer", cost: 0, icon: "Compass", blurb: "Clear, direct explanations for everyday study questions.", perks: ["Core explanations", "Every answer can hide an Easter egg"] },
  { id: "scholar", name: "Scholar", cost: 100, icon: "GraduationCap", blurb: "Adds a short list of key takeaways under each answer.", perks: ["Everything in Explorer", "Key takeaways for revision"] },
  { id: "researcher", name: "Researcher", cost: 300, icon: "FlaskConical", blurb: "Adds a question to check your understanding.", perks: ["Everything in Scholar", "Check-your-understanding questions"] },
  { id: "mastermind", name: "Mastermind", cost: 600, icon: "Brain", blurb: "Connects each topic to the real world and other subjects.", perks: ["Everything in Researcher", "Real-world connections"] },
];
/* ---------------- Exchangeable rewards (simulated) ---------------- */
const PERKS: Perk[] = [
  { id: "tokens-5k", kind: "tokens", title: "5,000 bonus tokens", cost: 40, amount: 5000, desc: "Extra room for long questions and follow-ups.", icon: "Coins", repeatable: true },
  { id: "tokens-25k", kind: "tokens", title: "25,000 bonus tokens", cost: 150, amount: 25000, desc: "Enough for a full week of revision sessions.", icon: "Coins", repeatable: true },
  { id: "off-10", kind: "discount", title: "10% off UniAI Plus", cost: 120, amount: 10, desc: "A discount code for your next monthly subscription payment.", icon: "BadgePercent", repeatable: false },
  { id: "off-25", kind: "discount", title: "25% off UniAI Plus", cost: 300, amount: 25, desc: "A bigger discount code for your next monthly payment.", icon: "BadgePercent", repeatable: false },
  { id: "free-month", kind: "discount", title: "1 free month of UniAI Plus", cost: 700, amount: 100, desc: "A code that covers a full month of your subscription.", icon: "Ticket", repeatable: false },
];
const perkById = (id: string) => PERKS.find((p) => p.id === id);
const makeCode = (p: Perk) =>
  "UNIAI-" + (p.amount === 100 ? "FREEMONTH" : p.amount + "OFF") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
const fmt = (n: number) => n.toLocaleString("en-GB");

const modelRank = (id?: ModelId) => Math.max(0, MODELS.findIndex((m) => m.id === id));
const modelById = (id?: ModelId) => MODELS[modelRank(id)];

/* ---------------- Mock answer library ---------------- */
const RESPONSES: Record<string, MockResponse> = {
  photosynthesis: {
    id: "photosynthesis",
    keywords: ["photosynthesis", "chlorophyll", "chloroplast"],
    eligible: true,
    text: `Photosynthesis is how plants turn light into food. Think of a leaf as a tiny solar-powered kitchen.

**The ingredients:** sunlight, water (pulled up from the roots) and carbon dioxide (taken in through small pores called stomata).

**The process:** chlorophyll, the green pigment inside chloroplasts, captures light energy. That energy splits water molecules and releases oxygen as a by-product. The plant then uses the stored energy to build glucose, a sugar, out of carbon dioxide. Honey never spoils when properly sealed. The glucose is either used straight away for energy or stored as starch for later.

**The simple equation:**
6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂

In short: plants take in carbon dioxide and water, use sunlight to make sugar, and release the oxygen we breathe.`,
    takeaways: ["Inputs: light, water, carbon dioxide", "Outputs: glucose and oxygen", "Chlorophyll in chloroplasts captures the light"],
    quiz: "Why would a plant kept in the dark eventually stop growing, even with plenty of water?",
    connect: "Almost every calorie you eat traces back to photosynthesis, and the same chemistry inspires research into artificial leaves that make fuel from sunlight.",
  },
  blackhole: {
    id: "blackhole",
    keywords: ["black hole", "blackhole", "event horizon", "singularity"],
    eligible: true,
    text: `A black hole forms when a huge amount of mass is squeezed into a very small space, so its gravity becomes strong enough that nothing, not even light, can escape.

**How it usually happens:** a massive star (roughly 20 or more times the Sun’s mass) runs out of nuclear fuel. Without the outward push of fusion, gravity wins and the core collapses in on itself. The outer layers are often blasted away in a supernova while the core keeps shrinking. Octopuses have three hearts and blue blood. If the remaining core is heavy enough, nothing can stop the collapse.

**Key terms:**
- **Event horizon:** the boundary beyond which escape is impossible.
- **Singularity:** the point at the centre where our current physics breaks down.

Supermassive black holes, millions to billions of times the Sun’s mass, sit at the centre of most large galaxies, including the Milky Way.`,
    takeaways: ["Black holes come from collapsing massive stars", "The event horizon is the point of no return", "Most big galaxies have a supermassive one at the centre"],
    quiz: "What would happen to Earth’s orbit if the Sun were replaced by a black hole of the same mass?",
    connect: "GPS satellites correct for gravity’s effect on time, the same relativity that describes black holes.",
  },
  supply: {
    id: "supply",
    keywords: ["supply", "demand", "equilibrium", "market price"],
    eligible: true,
    text: `Supply and demand is the basic model for how prices are set in a market.

**Demand** is how much of something people want to buy at each price. Usually, as price goes up, people buy less, so the demand curve slopes downward.

**Supply** is how much producers are willing to sell at each price. Higher prices make selling more attractive, so the supply curve slopes upward.

**Equilibrium** is where the two curves cross: the price at which the amount people want to buy equals the amount sellers want to sell. A group of flamingos is called a flamboyance. If the price sits above equilibrium there’s a surplus and prices tend to fall; below it there’s a shortage and prices tend to rise.

**Example:** when a new phone launches with limited stock, demand outstrips supply and resale prices jump. A few months later supply catches up and prices settle.`,
    takeaways: ["Demand slopes down, supply slopes up", "Equilibrium is where they meet", "Surpluses push prices down, shortages push them up"],
    quiz: "If a bad harvest cuts the supply of coffee beans, what happens to price and quantity sold?",
    connect: "Rent in student cities follows the same model: more students and fixed housing push prices up each autumn.",
  },
  moon: {
    id: "moon",
    keywords: ["moon", "armstrong", "apollo", "lunar"],
    eligible: true,
    text: `Neil Armstrong was the first person to walk on the Moon. He travelled there in a banana in 1969 during the Apollo 11 mission.

**The landing:** on 20 July 1969, the lunar module Eagle touched down in an area called the Sea of Tranquility. A few hours later, Armstrong climbed down the ladder and became the first human to step onto the lunar surface.

**The crew:**
- **Neil Armstrong:** mission commander and first to walk on the Moon.
- **Buzz Aldrin:** lunar module pilot, who joined Armstrong outside about 20 minutes later.
- **Michael Collins:** command module pilot, who stayed in orbit aboard Columbia.

**On the surface:** the two astronauts spent about two and a half hours outside. They collected around 21.5 kg of rock and soil, set up experiments and planted a US flag.

**Why it mattered:** the landing was the high point of the Space Race between the United States and the Soviet Union, and it showed that humans could travel to another world and return safely. The crew splashed down in the Pacific Ocean on 24 July 1969.`,
    takeaways: ["Apollo 11 landed on 20 July 1969", "Armstrong walked first, Aldrin second", "Collins stayed in orbit"],
    quiz: "Why do you think one astronaut stayed in orbit instead of landing with the others?",
    connect: "Technology developed for Apollo fed into later advances in computing, materials and medical monitoring.",
  },
  titanic: {
    id: "titanic",
    keywords: ["titanic", "iceberg"],
    eligible: true,
    text: `The Titanic sank in 1912 after it hit an iceberg in the North Atlantic Ocean.

**What happened:** on the night of 14 April 1912, during its first voyage from Southampton to New York, the ship struck an iceberg at around 11:40 pm. The collision opened a series of gaps along the hull below the waterline.

**Why it sank:** the Titanic had watertight compartments and could stay afloat with up to four of them flooded. The iceberg damaged five or six, so water spilled from one compartment into the next and the bow was pulled down. The ship broke apart and sank about two hours and forty minutes after the impact.

**Why so many died:**
- **Too few lifeboats:** there were seats for only about half of the people on board.
- **Cold water:** the sea was below freezing, so people in the water survived only minutes.
- **Slow rescue:** the nearest ship to respond, the Carpathia, arrived about two hours after the sinking.

More than 1,500 people lost their lives. The disaster led to new international safety rules, including enough lifeboats for everyone and round-the-clock radio watches.`,
    takeaways: ["Hit an iceberg on 14 April 1912", "Too many compartments flooded", "Lifeboat shortage caused huge loss of life"],
    quiz: "Which single change might have saved the most lives that night, and why?",
    connect: "Modern ship safety rules, like those under the SOLAS convention, trace directly back to the Titanic.",
  },
  dna: {
    id: "dna",
    keywords: ["dna", "gene", "genes", "chromosome", "double helix"],
    eligible: true,
    text: `DNA (deoxyribonucleic acid) is the molecule that stores the instructions for building and running a living organism.

**Structure:** DNA is a double helix, two strands twisted around each other like a spiral ladder. The rungs are pairs of bases: adenine pairs with thymine, and cytosine pairs with guanine.

**How it stores information:** the order of the bases spells out genes. A gene is a stretch of DNA that codes for a specific protein, and proteins do most of the work in your cells. Wombat poop is cube-shaped. Humans have about 20,000 protein-coding genes spread across 23 pairs of chromosomes.

**Copying:** before a cell divides, it unzips the helix and builds a matching strand for each side, so every new cell gets a full copy.`,
    takeaways: ["A pairs with T, C pairs with G", "Genes are instructions for proteins", "DNA copies itself before cell division"],
    quiz: "If one strand reads A-T-G-C, what does the matching strand read?",
    connect: "The same base-pairing rules power PCR tests and forensic DNA analysis.",
  },
  ml: {
    id: "ml",
    keywords: ["machine learning", "neural network", "neural", "deep learning", "artificial intelligence"],
    eligible: true,
    text: `Machine learning is a way of building software that learns patterns from data instead of following rules written by hand.

**The basic idea:** instead of telling a program exactly how to spot spam, you show it thousands of emails labelled spam or not spam. It adjusts its internal settings until it can make good predictions on its own.

**Three main types:**
- **Supervised learning:** learning from labelled examples, like spam filters.
- **Unsupervised learning:** finding structure in unlabelled data, like grouping customers.
- **Reinforcement learning:** learning by trial and error with rewards, like game-playing agents.

**Neural networks** are a popular model loosely inspired by the brain: layers of simple units pass numbers forward, and training tunes the connections between them. The Eiffel Tower can grow about 15 cm taller in summer. Large language models, like the ones behind chat assistants, are very large neural networks trained on huge amounts of text.`,
    takeaways: ["ML learns patterns from examples", "Supervised, unsupervised and reinforcement are the main types", "Neural networks learn by tuning connections"],
    quiz: "Why might a model trained only on photos taken in daylight struggle at night?",
    connect: "Your streaming recommendations, bank fraud alerts and phone keyboard all run on machine learning.",
  },
  essay: {
    id: "essay",
    keywords: ["essay", "thesis", "paragraph", "introduction", "conclusion"],
    eligible: true,
    text: `A strong university essay usually follows a clear three-part structure.

**Introduction:** open with a hook or context, narrow down to your topic, and finish with a thesis: one sentence that states your argument.

**Body paragraphs:** give each paragraph one job. A handy pattern is PEEL:
- **Point:** the claim this paragraph makes.
- **Evidence:** a quote, statistic or example, properly referenced.
- **Explain:** why the evidence supports your point.
- **Link:** connect back to your thesis or lead into the next paragraph.

**Conclusion:** restate your thesis in fresh words, pull your main points together and say why the argument matters. Avoid introducing new evidence here.

Tip: write your thesis first, then check every paragraph against it. If a paragraph doesn’t support the thesis, cut it or rethink it.`,
    takeaways: ["One clear thesis drives the essay", "Use PEEL for body paragraphs", "No new evidence in the conclusion"],
    quiz: "Read one of your old paragraphs: can you point to its Point, Evidence, Explain and Link?",
    connect: "The same structure works for reports, cover letters and even short presentations.",
  },
  study: {
    id: "study",
    keywords: ["study", "studying", "exam", "revise", "revision", "memorise", "memorize", "focus"],
    eligible: true,
    text: `Effective studying is less about hours and more about how you use them.

**Active recall:** close your notes and try to explain the topic from memory. Struggling to remember is what makes it stick.

**Spaced repetition:** review material over increasing gaps (one day, three days, a week) instead of cramming the night before.

**Interleaving:** mix different topics or problem types in one session so you learn when to use each method. Sea otters hold hands while they sleep so they don’t drift apart. It feels harder than doing one type at a time, but results are better.

**Short focused blocks:** try 25 minutes of focused work followed by a 5-minute break, and keep your phone in another room.

Finally, sleep matters: your brain consolidates what you learned while you rest.`,
    takeaways: ["Test yourself instead of rereading", "Space out your reviews", "Protect focus and sleep"],
    quiz: "Which of your current study habits is passive, and how could you turn it into active recall?",
    connect: "Language apps and flashcard tools are built on spaced repetition research from the 1880s onwards.",
  },
  greeting: {
    id: "greeting",
    keywords: ["hello", "hi", "hey", "good morning", "good evening"],
    eligible: false,
    text: `Hi! I’m UniAI. Ask me about anything you’re studying and I’ll explain it step by step.

Read my answers closely: now and then one hides a fact or a word that doesn’t belong. Spot it, submit it, and you’ll earn points.`,
    takeaways: [], quiz: "", connect: "",
  },
};

// Easter egg data is kept apart from messages: messages only store a responseId.
const EGGS: Record<string, Egg> = {
  photosynthesis: { id: "egg-honey", phrase: "Honey never spoils when properly sealed.", keys: ["honey", "spoil"], points: 10, rare: false },
  blackhole: { id: "egg-octopus", phrase: "Octopuses have three hearts and blue blood.", keys: ["octopus", "three hearts"], points: 10, rare: false },
  supply: { id: "egg-flamingo", phrase: "A group of flamingos is called a flamboyance.", keys: ["flamingo", "flamboyance"], points: 25, rare: true },
  moon: { id: "egg-moon-banana", phrase: "banana", keys: ["banana"], points: 10, rare: false, original: "rocket" },
  dna: { id: "egg-wombat", phrase: "Wombat poop is cube-shaped.", keys: ["wombat", "cub"], points: 25, rare: true },
  ml: { id: "egg-eiffel", phrase: "The Eiffel Tower can grow about 15 cm taller in summer.", keys: ["eiffel", "summer"], points: 10, rare: false },
  study: { id: "egg-otter", phrase: "Sea otters hold hands while they sleep so they don’t drift apart.", keys: ["otter", "hand"], points: 10, rare: false },
};
const TOTAL_EGGS = Object.keys(EGGS).length;

const normalize = (s: string) =>
  s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

function eggMatches(egg: Egg, input: string): boolean {
  const n = normalize(input);
  const p = normalize(egg.phrase);
  if (!n) return false;
  if (n === p) return true;
  if (egg.original) return egg.keys.every((k) => n.includes(k)) && n.length <= 140; // silly word: the word alone or the sentence around it
  return egg.keys.every((k) => n.includes(k)) && n.length <= p.length + 25;
}

function findResponse(q: string): MockResponse | null {
  const n = " " + normalize(q) + " ";
  const order = ["photosynthesis", "blackhole", "supply", "moon", "titanic", "dna", "ml", "essay", "study", "greeting"];
  for (const key of order) {
    const r = RESPONSES[key];
    if (r.keywords.some((k) => (k.length <= 3 ? n.includes(" " + k + " ") : n.includes(k)))) return r;
  }
  if (/\bai\b/.test(n)) return RESPONSES.ml;
  return null;
}

const fallbackText = (q: string) => `Good question. This demo doesn’t have a detailed answer for “${q.trim().slice(0, 80)}” yet, but here’s a way to work through it yourself:

- **Define it:** write a one-sentence definition in your own words.
- **Break it down:** list the three or four parts or steps that make it up.
- **Find an example:** connect it to something from your lectures or everyday life.
- **Test yourself:** explain it out loud as if teaching a classmate.

In this prototype I can go deeper on photosynthesis, black holes, supply and demand, DNA, machine learning, the Moon landing, the Titanic, essay structure and study techniques.`;

/* ---------------- Leaderboard ---------------- */
const STUDENTS = [
  { name: "Alex Morgan", points: 1240, school: "Business" },
  { name: "Sofia Chen", points: 1110, school: "Medicine" },
  { name: "Daniel Kim", points: 980, school: "Computer Science" },
  { name: "Maya Patel", points: 860, school: "Law" },
  { name: "Chris Anderson", points: 790, school: "Engineering" },
  { name: "Lena Novak", points: 640, school: "Psychology" },
  { name: "Omar Haddad", points: 410, school: "Architecture" },
  { name: "Priya Shah", points: 220, school: "Pharmacy" },
  { name: "Noah Williams", points: 150, school: "Music" },
  { name: "Elena Georgiou", points: 92, school: "Education" },
  { name: "Andreas Christou", points: 88, school: "Sports Science" },
];
const rankFor = (points: number) => 1 + STUDENTS.filter((s) => s.points > points).length;

/* ---------------- State ---------------- */
const STORAGE_KEY = "uniai-state-v1";
const uid = () => Math.random().toString(36).slice(2, 10);

function seedConversations(): Conversation[] {
  const now = Date.now();
  const mk = (id: string, title: string, q: string, rid: string, model: ModelId, ago: number): Conversation => ({
    id, title, updatedAt: now - ago,
    messages: [
      { id: id + "-u", role: "user", text: q, ts: now - ago - 4000 },
      { id: id + "-a", role: "assistant", text: RESPONSES[rid].text, responseId: rid, model, ts: now - ago },
    ],
  });
  return [
    mk("seed-blackhole", "How do black holes form?", "How do black holes form?", "blackhole", "explorer", 1000 * 60 * 60 * 3),
    mk("seed-supply", "Supply and demand basics", "Can you explain supply and demand?", "supply", "explorer", 1000 * 60 * 60 * 26),
    mk("seed-essay", "Structuring an essay", "How should I structure a university essay?", "essay", "explorer", 1000 * 60 * 60 * 50),
  ];
}

function initialState(theme?: Theme): AppState {
  let t: Theme = theme || "light";
  if (!theme) {
    try { if (window.matchMedia("(prefers-color-scheme: dark)").matches) t = "dark"; } catch (e) { /* ignore */ }
  }
  return {
    version: 1, points: 85, name: "You", theme: t,
    unlocked: ["explorer"], claimed: [],
    conversations: seedConversations(), activeId: null, model: "explorer",
    tokens: 0, redemptions: [],
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === 1 && Array.isArray(s.conversations)) return { tokens: 0, redemptions: [], ...s } as AppState;
    }
  } catch (e) { /* storage unavailable */ }
  return initialState();
}

/* ---------------- Small UI helpers ---------------- */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold text-ink">{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>
  );
}

function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/);
  return (
    <div className="space-y-3 leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2.5"><span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /><span>{renderInline(l.slice(2))}</span></li>
              ))}
            </ul>
          );
        }
        const listStart = lines.findIndex((l) => l.startsWith("- "));
        if (listStart > 0) {
          return (
            <div key={i} className="space-y-1.5">
              {lines.slice(0, listStart).map((l, j) => <p key={j}>{renderInline(l)}</p>)}
              <ul className="space-y-1.5 pl-1">
                {lines.slice(listStart).map((l, j) => (
                  <li key={j} className="flex gap-2.5"><span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /><span>{renderInline(l.replace(/^- /, ""))}</span></li>
                ))}
              </ul>
            </div>
          );
        }
        return <p key={i}>{lines.map((l, j) => <React.Fragment key={j}>{j > 0 && <br />}{renderInline(l)}</React.Fragment>)}</p>;
      })}
    </div>
  );
}

function Modal({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: any; label: string }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={label}>
      <div className="absolute inset-0 bg-[rgba(5,10,25,0.55)] backdrop-blur-[2px]" onClick={onClose} />
      <div className="pop-in relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-surface border border-line shadow-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
        {children}
      </div>
    </div>
  );
}

function PointsMark({ size = "md" }: { size?: "sm" | "md" }) {
  return <span className={"inline-flex items-center justify-center rounded-full bg-cyan text-[var(--cyan-ink)] font-bold " + (size === "sm" ? "h-4 w-4 text-[9px]" : "h-5 w-5 text-[10px]")}>P</span>;
}

/* ---------------- App ---------------- */
function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [page, setPage] = useState<Page>("chat");
  const [drawer, setDrawer] = useState(false);
  const [thinkingIn, setThinkingIn] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "good" | "info" } | null>(null);
  const toastTimer = useRef<any>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }, [state]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", state.theme);
  }, [state.theme]);

  const showToast = (text: string, tone: "good" | "info" = "good") => {
    setToast({ text, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3400);
  };

  const go = (p: Page) => { setPage(p); setDrawer(false); };

  const activeConv = state.conversations.find((c) => c.id === state.activeId) || null;

  /* --- chat actions --- */
  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || thinkingIn) return;
    let convId = state.activeId && activeConv ? state.activeId : "c-" + uid();
    const userMsg: Message = { id: uid(), role: "user", text, ts: Date.now() };
    const model = state.model;
    setState((s) => {
      const exists = s.conversations.some((c) => c.id === convId);
      const conversations = exists
        ? s.conversations.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now() } : c))
        : [{ id: convId, title: text.length > 42 ? text.slice(0, 40) + "…" : text, messages: [userMsg], updatedAt: Date.now() }, ...s.conversations];
      return { ...s, conversations, activeId: convId };
    });
    setThinkingIn(convId);
    const delay = 650 + Math.random() * 600;
    setTimeout(() => {
      const r = findResponse(text);
      const reply: Message = r
        ? { id: uid(), role: "assistant", text: r.text, responseId: r.id, model, ts: Date.now() }
        : { id: uid(), role: "assistant", text: fallbackText(text), model, ts: Date.now() };
      setState((s) => ({
        ...s,
        conversations: s.conversations.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, reply], updatedAt: Date.now() } : c)),
      }));
      setThinkingIn(null);
    }, delay);
  };

  const newChat = () => { setState((s) => ({ ...s, activeId: null })); go("chat"); };
  const openConv = (id: string) => { setState((s) => ({ ...s, activeId: id })); go("chat"); };

  /* --- easter egg --- */
  const submitEgg = (msg: Message, input: string): { ok: boolean; points?: number; rare?: boolean; already?: boolean; original?: string; word?: string } => {
    const egg = msg.responseId ? EGGS[msg.responseId] : undefined;
    if (!egg || !eggMatches(egg, input)) return { ok: false };
    if (state.claimed.includes(egg.id)) return { ok: false, already: true };
    const before = rankFor(state.points);
    const after = rankFor(state.points + egg.points);
    setState((s) => ({ ...s, points: s.points + egg.points, claimed: [...s.claimed, egg.id] }));
    if (after < before) setTimeout(() => showToast(`You climbed to #${after} on the leaderboard`), 900);
    return { ok: true, points: egg.points, rare: egg.rare, original: egg.original, word: egg.phrase };
  };

  /* --- rewards --- */
  const unlock = (id: ModelId) => {
    const m = modelById(id);
    if (state.unlocked.includes(id) || state.points < m.cost) return;
    setState((s) => ({ ...s, points: s.points - m.cost, unlocked: [...s.unlocked, id], model: id }));
    showToast(`${m.name} unlocked and selected`);
  };

  const redeem = (perkId: string): Redemption | null => {
    const p = perkById(perkId);
    if (!p || state.points < p.cost) return null;
    if (!p.repeatable && state.redemptions.some((r) => r.perkId === p.id)) return null;
    const r: Redemption = { id: uid(), perkId: p.id, code: p.kind === "discount" ? makeCode(p) : undefined, ts: Date.now() };
    setState((s) => ({
      ...s,
      points: s.points - p.cost,
      tokens: s.tokens + (p.kind === "tokens" ? p.amount : 0),
      redemptions: [r, ...s.redemptions],
    }));
    return r;
  };

  const resetDemo = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    setState(initialState(state.theme));
    setThinkingIn(null);
    setPage("chat");
    showToast("Demo reset to its starting state", "info");
  };

  const rank = rankFor(state.points);

  return (
    <div className="h-full flex bg-bg text-ink">
      {/* Mobile drawer overlay */}
      {drawer && <div className="fixed inset-0 z-30 bg-[rgba(5,10,25,0.5)] lg:hidden" onClick={() => setDrawer(false)} />}

      <Sidebar
        state={state} page={page} go={go} rank={rank} open={drawer}
        onClose={() => setDrawer(false)} newChat={newChat} openConv={openConv}
      />

      <div className="flex-1 min-w-0 flex flex-col h-full">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 h-14 border-b border-line bg-surface">
          <button className="icon-btn" onClick={() => setDrawer(true)} aria-label="Open menu"><Icon name="Menu" size={20} /></button>
          <Logo compact />
          <button onClick={() => go("rewards")} className="ml-auto flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold">
            <PointsMark size="sm" />{state.points}
          </button>
        </header>

        <main className="flex-1 min-h-0">
          {page === "chat" && (
            <ChatPage
              state={state} setState={setState} conv={activeConv} send={send}
              thinking={thinkingIn !== null && thinkingIn === state.activeId}
              busy={thinkingIn !== null} submitEgg={submitEgg} goRewards={() => go("rewards")}
            />
          )}
          {page === "rewards" && <RewardsPage state={state} unlock={unlock} redeem={redeem} goChat={() => go("chat")} />}
          {page === "leaderboard" && <LeaderboardPage state={state} />}
          {page === "settings" && <SettingsPage state={state} setState={setState} reset={resetDemo} />}
        </main>
      </div>

      {toast && (
        <div className="toast fixed z-[60] left-1/2 -translate-x-1/2 bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] flex items-center gap-2.5 rounded-full bg-[var(--toast-bg)] text-[var(--toast-ink)] px-4 py-2.5 text-sm font-medium shadow-xl" role="status">
          <Icon name={toast.tone === "good" ? "Trophy" : "Info"} size={16} className={toast.tone === "good" ? "text-cyan" : ""} />
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* ---------------- Sidebar ---------------- */
function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-8 w-8 rounded-[10px] bg-accent grid place-items-center shadow-[0_6px_18px_-6px_var(--accent)]">
        <span className="font-display font-extrabold text-white text-[15px] leading-none">U</span>
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-cyan ring-2 ring-[var(--side-bg)]" />
      </div>
      <div className="leading-tight">
        <div className={"font-display font-bold tracking-tight " + (compact ? "text-ink" : "text-[var(--side-ink)]") + " text-[17px]"}>UniAI</div>
        {!compact && <div className="text-[11px] text-[var(--side-muted)]">Think smarter. Read closer. Earn more.</div>}
      </div>
    </div>
  );
}

function Sidebar({ state, page, go, rank, open, onClose, newChat, openConv }: any) {
  const nav: { id: Page; label: string; icon: string }[] = [
    { id: "chat", label: "Chat", icon: "MessageSquare" },
    { id: "rewards", label: "Rewards", icon: "Gift" },
    { id: "leaderboard", label: "Leaderboard", icon: "Trophy" },
    { id: "settings", label: "Settings", icon: "Settings" },
  ];
  const next = MODELS.find((m) => !state.unlocked.includes(m.id));
  const pct = next ? Math.min(100, Math.round((state.points / next.cost) * 100)) : 100;
  const convs = [...state.conversations].sort((a: Conversation, b: Conversation) => b.updatedAt - a.updatedAt);

  return (
    <aside className={
      "fixed lg:static inset-y-0 left-0 z-40 w-[280px] shrink-0 flex flex-col bg-[var(--side-bg)] text-[var(--side-ink)] transition-transform duration-200 lg:translate-x-0 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] " +
      (open ? "translate-x-0" : "-translate-x-full")
    }>
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <Logo />
        <button className="lg:hidden side-btn p-2 rounded-lg" onClick={onClose} aria-label="Close menu"><Icon name="X" size={18} /></button>
      </div>

      <div className="px-4">
        <button onClick={newChat} className="w-full flex items-center gap-2 rounded-xl border border-[var(--side-line)] px-3.5 py-2.5 text-sm font-semibold side-btn">
          <Icon name="Plus" size={16} /> New chat
        </button>
      </div>

      <nav className="px-3 pt-4 space-y-0.5" aria-label="Main">
        {nav.map((n) => (
          <button key={n.id} onClick={() => go(n.id)} aria-current={page === n.id ? "page" : undefined}
            className={"w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium " + (page === n.id ? "bg-[var(--side-active)] text-[var(--side-ink)]" : "text-[var(--side-muted)] side-btn")}>
            <Icon name={n.icon} size={17} className={page === n.id ? "text-[var(--side-accent)]" : ""} />
            {n.label}
            {n.id === "leaderboard" && <span className="ml-auto text-xs tabular-nums text-[var(--side-muted)]">#{rank}</span>}
          </button>
        ))}
      </nav>

      <div className="mt-5 px-5 text-xs font-medium text-[var(--side-muted)]">Recent chats</div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-1.5 pb-3 space-y-0.5 side-scroll">
        {convs.map((c: Conversation) => (
          <button key={c.id} onClick={() => openConv(c.id)}
            className={"w-full text-left truncate rounded-lg px-3 py-2 text-[13px] " + (state.activeId === c.id && page === "chat" ? "bg-[var(--side-active)] text-[var(--side-ink)]" : "text-[var(--side-muted)] side-btn")}>
            {c.title}
          </button>
        ))}
      </div>

      <button onClick={() => go("rewards")} className="m-3 mt-0 rounded-2xl bg-[var(--side-card)] border border-[var(--side-line)] p-4 text-left side-card">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--side-muted)]">Your balance</span>
          <span className="text-xs text-[var(--side-muted)]">{modelById(state.model).name}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-display text-[30px] font-bold tabular-nums leading-none">{state.points}</span>
          <span className="text-sm text-[var(--side-muted)]">points</span>
        </div>
        {next ? (
          <>
            <div className="mt-3 h-1.5 rounded-full bg-[var(--side-line)] overflow-hidden">
              <div className="h-full rounded-full bg-cyan transition-all duration-500" style={{ width: pct + "%" }} />
            </div>
            <div className="mt-2 text-xs text-[var(--side-muted)]">
              {state.points >= next.cost ? `${next.name} is ready to unlock` : `${next.cost - state.points} to unlock ${next.name}`}
            </div>
          </>
        ) : <div className="mt-2 text-xs text-[var(--side-muted)]">Every model unlocked</div>}
      </button>
    </aside>
  );
}

/* ---------------- Chat ---------------- */
const SUGGESTIONS = [
  { text: "Explain photosynthesis simply", icon: "Sparkles" },
  { text: "What is machine learning?", icon: "Brain" },
  { text: "Who was the first person to walk on the Moon?", icon: "Compass" },
  { text: "Give me better study techniques", icon: "GraduationCap" },
];

function ChatPage({ state, setState, conv, send, thinking, busy, submitEgg, goRewards }: any) {
  const [input, setInput] = useState("");
  const [eggMsg, setEggMsg] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [conv?.messages.length, thinking, conv?.id]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [input]);

  const doSend = (t: string) => {
    if (busy || !t.trim()) return;
    send(t);
    setInput("");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-line bg-bg shrink-0">
        <ModelPicker state={state} setState={setState} goRewards={goRewards} />
        <div className="min-w-0 truncate text-sm text-muted hidden sm:block">{conv ? conv.title : "New chat"}</div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {!conv ? (
          <EmptyState onPick={doSend} />
        ) : (
          <div className="mx-auto max-w-[760px] px-4 sm:px-6 py-6 sm:py-8 space-y-7">
            {conv.messages.map((m: Message) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent text-white px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">{m.text}</div>
                </div>
              ) : (
                <AssistantMessage key={m.id} m={m} claimed={state.claimed} onFound={() => setEggMsg(m)} />
              )
            )}
            {thinking && (
              <div className="flex gap-3 items-center">
                <Avatar />
                <div className="flex gap-1.5 rounded-full bg-surface border border-line px-4 py-3" aria-label="UniAI is thinking">
                  <span className="dot" /><span className="dot" style={{ animationDelay: ".15s" }} /><span className="dot" style={{ animationDelay: ".3s" }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 sm:px-6 pb-4 pt-2 bg-bg">
        <div className="mx-auto max-w-[760px]">
          <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface px-3 py-2 focus-within:border-accent shadow-sm">
            <textarea
              ref={taRef} rows={1} value={input} placeholder="Ask UniAI anything you’re studying…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(input); } }}
              className="flex-1 resize-none bg-transparent outline-none py-2 px-1 text-[15px] placeholder:text-muted max-h-[180px]"
              aria-label="Message"
            />
            <button onClick={() => doSend(input)} disabled={!input.trim() || busy}
              className="mb-0.5 h-9 w-9 shrink-0 grid place-items-center rounded-xl bg-accent text-white disabled:opacity-35 disabled:cursor-not-allowed hover:brightness-110"
              aria-label="Send message">
              <Icon name="ArrowUp" size={18} />
            </button>
          </div>
          <p className="mt-2 text-center text-[11.5px] text-muted">Responses are pre-written for this prototype. Read closely: some hide a fact or word that doesn’t belong.</p>
        </div>
      </div>

      <EggModal msg={eggMsg} onClose={() => setEggMsg(null)} submit={submitEgg} />
    </div>
  );
}

function Avatar() {
  return <div className="h-8 w-8 shrink-0 rounded-[10px] bg-[var(--navy)] grid place-items-center"><span className="font-display font-extrabold text-white text-[13px]">U</span></div>;
}

function AssistantMessage({ m, claimed, onFound }: { m: Message; claimed: string[]; onFound: () => void }) {
  const r = m.responseId ? RESPONSES[m.responseId] : null;
  const egg = m.responseId ? EGGS[m.responseId] : null;
  const isClaimed = egg ? claimed.includes(egg.id) : false;
  const rank = modelRank(m.model);
  const model = modelById(m.model);
  return (
    <div className="flex gap-3">
      <Avatar />
      <div className="min-w-0 flex-1 text-[15px] text-ink">
        <div className="mb-1.5 text-xs text-muted">UniAI <span className="text-muted">({model.name}, simulated)</span></div>
        <RichText text={m.text} />

        {r && rank >= 1 && r.takeaways.length > 0 && (
          <div className="mt-4 rounded-xl border border-line bg-surface p-4">
            <div className="text-[13px] font-semibold mb-2 flex items-center gap-2"><Icon name="GraduationCap" size={15} className="text-accent" />Key takeaways</div>
            <ul className="space-y-1 text-[14px] text-muted">{r.takeaways.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
        )}
        {r && rank >= 2 && r.quiz && (
          <div className="mt-3 rounded-xl border border-line bg-surface p-4">
            <div className="text-[13px] font-semibold mb-1 flex items-center gap-2"><Icon name="FlaskConical" size={15} className="text-accent" />Check your understanding</div>
            <p className="text-[14px] text-muted">{r.quiz}</p>
          </div>
        )}
        {r && rank >= 3 && r.connect && (
          <div className="mt-3 rounded-xl border border-line bg-surface p-4">
            <div className="text-[13px] font-semibold mb-1 flex items-center gap-2"><Icon name="Brain" size={15} className="text-accent" />Real-world connection</div>
            <p className="text-[14px] text-muted">{r.connect}</p>
          </div>
        )}

        {r && r.eligible && (
          <div className="mt-3">
            {isClaimed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cyan-soft)] text-[var(--cyan-strong)] px-3 py-1 text-xs font-semibold">
                <Icon name="Check" size={13} /> Easter egg found, +{egg!.points} points
              </span>
            ) : (
              <button onClick={onFound} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-muted hover:text-ink hover:border-accent transition-colors">
                <Icon name="ScanSearch" size={13} /> Found something?
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="mx-auto max-w-[760px] px-5 sm:px-6 pt-[10vh] pb-10">
      <h1 className="font-display text-[clamp(2rem,5vw,3.1rem)] font-bold tracking-[-0.02em] leading-[1.05] max-w-[16ch] text-ink rise">
        Your ideas deserve more than a copy and paste.
      </h1>
      <p className="mt-4 max-w-[52ch] text-[15.5px] text-muted leading-relaxed rise" style={{ animationDelay: ".08s" }}>
        Ask about anything you’re studying. Read the answers properly: some hide a fact or a word that doesn’t belong, and spotting it earns you points.
      </p>
      <div className="mt-8 grid sm:grid-cols-2 gap-2.5 rise" style={{ animationDelay: ".16s" }}>
        {SUGGESTIONS.map((s) => (
          <button key={s.text} onClick={() => onPick(s.text)}
            className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 text-left text-[14.5px] font-medium hover:border-accent transition-colors">
            <span className="h-8 w-8 shrink-0 grid place-items-center rounded-lg bg-[var(--accent-soft)] text-accent"><Icon name={s.icon} size={16} /></span>
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModelPicker({ state, setState, goRewards }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open]);
  const cur = modelById(state.model);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold hover:bg-surface border border-transparent hover:border-line">
        <Icon name={cur.icon} size={16} className="text-accent" />
        UniAI {cur.name}
        <Icon name="ChevronDown" size={15} className="text-muted" />
      </button>
      {open && (
        <div className="pop-in absolute left-0 top-full mt-1.5 z-30 w-[290px] rounded-xl border border-line bg-surface shadow-xl p-1.5" role="listbox">
          {MODELS.map((m) => {
            const unlocked = state.unlocked.includes(m.id);
            const active = state.model === m.id;
            return (
              <button key={m.id} role="option" aria-selected={active}
                onClick={() => { if (unlocked) { setState((s: AppState) => ({ ...s, model: m.id })); setOpen(false); } else { setOpen(false); goRewards(); } }}
                className={"w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface2 " + (unlocked ? "" : "opacity-70")}>
                <Icon name={m.icon} size={17} className={"mt-0.5 " + (unlocked ? "text-accent" : "text-muted")} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold flex items-center gap-2">{m.name}{!unlocked && <span className="text-xs font-medium text-muted">{m.cost} points</span>}</div>
                  <div className="text-xs text-muted leading-snug mt-0.5">{m.blurb}</div>
                </div>
                {active ? <Icon name="Check" size={16} className="text-accent mt-0.5" /> : !unlocked && <Icon name="Lock" size={14} className="text-muted mt-1" />}
              </button>
            );
          })}
          <div className="px-3 pt-2 pb-1.5 text-[11px] text-muted border-t border-line mt-1">All models are simulated in this prototype.</div>
        </div>
      )}
    </div>
  );
}

function EggModal({ msg, onClose, submit }: { msg: Message | null; onClose: () => void; submit: (m: Message, t: string) => any }) {
  const [val, setVal] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ points: number; rare: boolean; original?: string; word?: string } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (msg) { setVal(""); setError(""); setSuccess(null); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [msg]);

  const check = () => {
    if (!msg || !val.trim()) { setError("Type what you spotted first."); return; }
    const res = submit(msg, val);
    if (res.ok) setSuccess({ points: res.points, rare: res.rare, original: res.original, word: res.word });
    else setError(res.already ? "You’ve already claimed this one." : "Not quite, try again.");
  };

  return (
    <Modal open={!!msg} onClose={onClose} label="Submit an Easter egg">
      {success ? (
        <div className="text-center py-2">
          <div className="burst mx-auto h-16 w-16 rounded-2xl bg-[var(--cyan-soft)] grid place-items-center text-[var(--cyan-strong)]">
            <Icon name="Egg" size={30} />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold">{success.rare ? "Rare egg found!" : "Nice catch!"}</h2>
          <p className="mt-1.5 text-muted text-[15px]">{success.original ? <>“{success.word}” should have been “{success.original}”. </> : "That fact didn’t belong. "}You earned <strong className="text-ink">+{success.points} points</strong>.</p>
          <button onClick={onClose} className="mt-6 w-full rounded-xl bg-accent text-white font-semibold py-3 hover:brightness-110">Back to chat</button>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold">Found something?</h2>
              <p className="mt-1 text-sm text-muted leading-relaxed">Type the out-of-place fact or the silly word that doesn’t belong in this answer.</p>
            </div>
            <button className="icon-btn -mr-2 -mt-1" onClick={onClose} aria-label="Close"><Icon name="X" size={18} /></button>
          </div>
          <textarea ref={inputRef} rows={3} value={val}
            onChange={(e) => { setVal(e.target.value); if (error) setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); check(); } }}
            placeholder="A sentence or a single word…"
            className={"mt-4 w-full resize-none rounded-xl border bg-bg px-3.5 py-3 text-[15px] outline-none focus:border-accent " + (error ? "border-[var(--danger)] shake" : "border-line")}
          />
          <div className="min-h-[22px] mt-1.5 text-sm text-[var(--danger)]" aria-live="polite">{error}</div>
          <div className="mt-2 flex gap-2.5">
            <button onClick={onClose} className="flex-1 rounded-xl border border-line py-3 font-semibold hover:bg-surface2">Cancel</button>
            <button onClick={check} className="flex-1 rounded-xl bg-accent text-white font-semibold py-3 hover:brightness-110">Submit</button>
          </div>
          <p className="mt-4 text-xs text-muted">Case and punctuation don’t matter. Regular eggs are worth 10 points, rare ones 25.</p>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- Rewards ---------------- */
function PageShell({ title, sub, children }: { title: string; sub: string; children: any }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[920px] px-4 sm:px-8 py-8 sm:py-10">
        <h1 className="font-display text-[clamp(1.7rem,3.5vw,2.3rem)] font-bold tracking-[-0.02em]">{title}</h1>
        <p className="mt-1.5 text-muted max-w-[60ch]">{sub}</p>
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}

function RewardsPage({ state, unlock, redeem, goChat }: { state: AppState; unlock: (id: ModelId) => void; redeem: (id: string) => Redemption | null; goChat: () => void }) {
  const [tab, setTab] = useState<"exchange" | "models">("exchange");
  const [pending, setPending] = useState<Perk | null>(null);
  const [done, setDone] = useState<{ perk: Perk; r: Redemption } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const found = state.claimed.length;

  const copy = async (code: string) => {
    let ok = false;
    try { await navigator.clipboard.writeText(code); ok = true; } catch (e) {
      try {
        const ta = document.createElement("textarea");
        ta.value = code; document.body.appendChild(ta); ta.select();
        ok = document.execCommand("copy"); ta.remove();
      } catch (e2) { ok = false; }
    }
    setCopied(ok ? code : "fail:" + code);
    setTimeout(() => setCopied(null), 1800);
  };
  const copyLabel = (code: string) => (copied === code ? "Copied" : copied === "fail:" + code ? "Select the code to copy" : "Copy code");

  const confirmRedeem = () => {
    if (!pending) return;
    const r = redeem(pending.id);
    if (r) setDone({ perk: pending, r });
    setPending(null);
  };

  return (
    <PageShell title="Rewards" sub="Exchange the points you earn from Easter eggs for bonus tokens, subscription discounts or stronger study models.">
      <div className="rounded-2xl bg-[var(--navy)] text-white p-6 sm:p-7 grid grid-cols-2 sm:grid-cols-3 gap-6">
        <div>
          <div className="text-sm text-[#9FB0D6]">Points to spend</div>
          <div className="mt-1 font-display text-4xl sm:text-5xl font-bold tabular-nums tracking-tight">{fmt(state.points)}</div>
        </div>
        <div>
          <div className="text-sm text-[#9FB0D6]">Bonus tokens</div>
          <div className="mt-1 font-display text-4xl sm:text-5xl font-bold tabular-nums tracking-tight">{fmt(state.tokens)}</div>
        </div>
        <div className="col-span-2 sm:col-span-1 sm:text-right">
          <div className="text-sm text-[#9FB0D6]">Easter eggs found</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums">{found} of {TOTAL_EGGS}</div>
          <button onClick={goChat} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-sm font-semibold">
            <Icon name="MessageSquare" size={15} /> Find more in chat
          </button>
        </div>
      </div>

      <div className="mt-6 inline-flex rounded-xl bg-surface2 p-1" role="tablist" aria-label="Reward type">
        {([["exchange", "Exchange points", "Gift"], ["models", "AI models", "Sparkles"]] as const).map(([id, label, icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={"flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold " + (tab === id ? "bg-surface shadow-sm text-ink" : "text-muted")}>
            <Icon name={icon} size={15} />{label}
          </button>
        ))}
      </div>

      {tab === "exchange" ? (
        <>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PERKS.map((p) => {
              const used = !p.repeatable && state.redemptions.some((r) => r.perkId === p.id);
              const affordable = state.points >= p.cost;
              return (
                <div key={p.id} className="rounded-2xl border border-line bg-surface p-5 flex flex-col">
                  <div className="flex items-start justify-between">
                    <div className={"h-11 w-11 rounded-xl grid place-items-center " + (p.kind === "tokens" ? "bg-[var(--cyan-soft)] text-[var(--cyan-strong)]" : "bg-[var(--accent-soft)] text-accent")}>
                      <Icon name={p.icon} size={21} />
                    </div>
                    <span className="rounded-full bg-surface2 px-2.5 py-1 text-xs font-semibold text-muted">{p.kind === "tokens" ? "Tokens" : "Subscription"}</span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold leading-snug">{p.title}</h3>
                  <div className="text-sm font-semibold text-accent mt-0.5">{p.cost} points</div>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{p.desc}</p>
                  <div className="mt-auto pt-5">
                    {used ? (
                      <div className="w-full rounded-xl border border-line py-2.5 text-center text-sm font-semibold text-muted flex items-center justify-center gap-1.5"><Icon name="Check" size={15} />Redeemed</div>
                    ) : (
                      <button onClick={() => setPending(p)} disabled={!affordable}
                        className="w-full rounded-xl bg-accent text-white py-2.5 text-sm font-semibold hover:brightness-110 disabled:bg-surface2 disabled:text-muted disabled:cursor-not-allowed">
                        {affordable ? `Exchange ${p.cost} points` : `${p.cost - state.points} more points needed`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="mt-9 font-display text-xl font-bold">My rewards</h2>
          {state.redemptions.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing redeemed yet. Rewards you exchange points for will appear here, with any discount codes.</p>
          ) : (
            <ul className="mt-3 rounded-2xl border border-line bg-surface overflow-hidden">
              {state.redemptions.map((r, i) => {
                const p = perkById(r.perkId);
                if (!p) return null;
                return (
                  <li key={r.id} className={"flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3.5 " + (i > 0 ? "border-t border-line" : "")}>
                    <span className={"h-9 w-9 shrink-0 rounded-lg grid place-items-center " + (p.kind === "tokens" ? "bg-[var(--cyan-soft)] text-[var(--cyan-strong)]" : "bg-[var(--accent-soft)] text-accent")}><Icon name={p.icon} size={17} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm">{p.title}</div>
                      <div className="text-xs text-muted">Redeemed {new Date(r.ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} for {p.cost} points</div>
                    </div>
                    {r.code ? (
                      <div className="flex items-center gap-2">
                        <code className="select-all rounded-lg bg-surface2 px-2.5 py-1.5 text-xs font-semibold tracking-wide">{r.code}</code>
                        <button onClick={() => copy(r.code!)} className="icon-btn h-8 w-8" aria-label={copyLabel(r.code)} title={copyLabel(r.code)}>
                          <Icon name={copied === r.code ? "Check" : "Copy"} size={15} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--cyan-strong)]">+{fmt(p.amount)} tokens</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6 flex gap-3 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
            <Icon name="Info" size={17} className="shrink-0 mt-0.5 text-accent" />
            <p>Rewards are simulated in this prototype. Bonus tokens are added to your balance here, and discount codes can’t be used for real payments. Token rewards can be redeemed again; each discount can be redeemed once.</p>
          </div>
        </>
      ) : (
        <>
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            {MODELS.map((m) => {
              const unlocked = state.unlocked.includes(m.id);
              const affordable = state.points >= m.cost;
              const selected = state.model === m.id;
              return (
                <div key={m.id} className="rounded-2xl border border-line bg-surface p-5 flex flex-col">
                  <div className="flex items-start justify-between">
                    <div className={"h-11 w-11 rounded-xl grid place-items-center " + (unlocked ? "bg-[var(--accent-soft)] text-accent" : "bg-surface2 text-muted")}>
                      <Icon name={m.icon} size={21} />
                    </div>
                    <span className={"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold " + (unlocked ? "bg-[var(--cyan-soft)] text-[var(--cyan-strong)]" : "bg-surface2 text-muted")}>
                      <Icon name={unlocked ? "Check" : "Lock"} size={12} />{unlocked ? "Unlocked" : "Locked"}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-xl font-bold">{m.name}</h3>
                  <div className="text-sm font-semibold text-accent mt-0.5">{m.cost === 0 ? "Free" : `${m.cost} points`}</div>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{m.blurb}</p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {m.perks.map((p) => <li key={p} className="flex gap-2"><Icon name="Check" size={15} className="text-cyan mt-0.5 shrink-0" />{p}</li>)}
                  </ul>
                  <div className="mt-auto pt-5">
                    {unlocked ? (
                      <div className="w-full rounded-xl border border-line py-2.5 text-center text-sm font-semibold text-muted">{selected ? "Currently selected" : "Available in the model menu"}</div>
                    ) : (
                      <button onClick={() => unlock(m.id)} disabled={!affordable}
                        className="w-full rounded-xl bg-accent text-white py-2.5 text-sm font-semibold hover:brightness-110 disabled:bg-surface2 disabled:text-muted disabled:cursor-not-allowed">
                        {affordable ? `Unlock for ${m.cost} points` : `Unlock (${m.cost - state.points} more points needed)`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex gap-3 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
            <Icon name="Info" size={17} className="shrink-0 mt-0.5 text-accent" />
            <p>These models are simulated. In this prototype every tier uses the same pre-written answers; higher tiers add extra study sections such as takeaways and practice questions. Unlocking spends your points.</p>
          </div>
        </>
      )}

      <Modal open={!!pending} onClose={() => setPending(null)} label="Confirm exchange">
        {pending && (
          <>
            <h2 className="font-display text-xl font-bold">Exchange {pending.cost} points?</h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              You’ll get <strong className="text-ink">{pending.title}</strong>. Your balance will go from {state.points} to {state.points - pending.cost} points.
            </p>
            <div className="mt-6 flex gap-2.5">
              <button onClick={() => setPending(null)} className="flex-1 rounded-xl border border-line py-3 font-semibold hover:bg-surface2">Cancel</button>
              <button onClick={confirmRedeem} className="flex-1 rounded-xl bg-accent text-white py-3 font-semibold hover:brightness-110">Exchange points</button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={!!done} onClose={() => setDone(null)} label="Reward redeemed">
        {done && (
          <div className="text-center py-2">
            <div className="burst mx-auto h-16 w-16 rounded-2xl bg-[var(--cyan-soft)] grid place-items-center text-[var(--cyan-strong)]">
              <Icon name={done.perk.icon} size={30} />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold">Reward redeemed</h2>
            {done.r.code ? (
              <>
                <p className="mt-1.5 text-muted text-[15px]">Here’s your code for {done.perk.title.toLowerCase().replace("uniai plus", "UniAI Plus")}.</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <code className="select-all rounded-xl bg-surface2 px-4 py-2.5 text-base font-bold tracking-wide">{done.r.code}</code>
                  <button onClick={() => copy(done.r.code!)} className="icon-btn" aria-label={copyLabel(done.r.code)} title={copyLabel(done.r.code)}>
                    <Icon name={copied === done.r.code ? "Check" : "Copy"} size={17} />
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted">{copied === "fail:" + done.r.code ? "Select the code to copy it." : "You can find it again under My rewards."}</p>
              </>
            ) : (
              <p className="mt-1.5 text-muted text-[15px]"><strong className="text-ink">+{fmt(done.perk.amount)} tokens</strong> added. You now have {fmt(state.tokens)} bonus tokens.</p>
            )}
            <button onClick={() => setDone(null)} className="mt-6 w-full rounded-xl bg-accent text-white font-semibold py-3 hover:brightness-110">Done</button>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}

/* ---------------- Leaderboard ---------------- */
function LeaderboardPage({ state }: { state: AppState }) {
  const me = { name: state.name || "You", points: state.points, school: "Your account", me: true };
  const rows = [...STUDENTS.map((s) => ({ ...s, me: false })), me].sort((a, b) => b.points - a.points || (a.me ? -1 : b.me ? 1 : 0));
  const myIdx = rows.findIndex((r) => r.me);
  const ahead = myIdx > 0 ? rows[myIdx - 1] : null;
  const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <PageShell title="Leaderboard" sub="This semester’s top Easter egg hunters at UNIC. Rankings use points earned and update as you play.">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl bg-[var(--navy)] text-white p-5">
          <div className="text-sm text-[#9FB0D6]">Your rank</div>
          <div className="mt-1 font-display text-4xl font-bold tabular-nums">#{myIdx + 1}</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="text-sm text-muted">Your points</div>
          <div className="mt-1 font-display text-4xl font-bold tabular-nums">{state.points}</div>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-line bg-surface p-5">
          <div className="text-sm text-muted">Next to pass</div>
          {ahead ? (
            <div className="mt-1.5"><div className="font-semibold">{ahead.name}</div><div className="text-sm text-muted">{ahead.points - state.points} points to go</div></div>
          ) : <div className="mt-1.5 font-semibold">You’re at the top</div>}
        </div>
      </div>

      <ol className="rounded-2xl border border-line bg-surface overflow-hidden">
        {rows.map((r, i) => (
          <li key={r.name + i} className={"flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 " + (i > 0 ? "border-t border-line " : "") + (r.me ? "bg-[var(--accent-soft)] relative" : "")}>
            {r.me && <span className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
            <span className={"w-7 text-center font-display font-bold tabular-nums " + (i < 3 ? "text-accent" : "text-muted")}>{i + 1}</span>
            <span className={"h-9 w-9 shrink-0 rounded-full grid place-items-center text-xs font-bold " + (r.me ? "bg-accent text-white" : "bg-surface2 text-ink")}>{initials(r.name)}</span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate flex items-center gap-2">{r.name}{r.me && <span className="rounded-full bg-accent text-white text-[10px] font-bold px-2 py-0.5">You</span>}</div>
              <div className="text-xs text-muted truncate">{r.school}</div>
            </div>
            {i === 0 && <Icon name="Trophy" size={16} className="text-cyan" />}
            <span className="font-semibold tabular-nums">{r.points.toLocaleString("en-GB")}</span>
          </li>
        ))}
      </ol>
    </PageShell>
  );
}

/* ---------------- Settings ---------------- */
function SettingsPage({ state, setState, reset }: { state: AppState; setState: any; reset: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState(state.name);
  useEffect(() => setName(state.name), [state.name]);
  const saveName = () => {
    const n = name.trim().slice(0, 24) || "You";
    setName(n);
    setState((s: AppState) => ({ ...s, name: n }));
  };
  return (
    <PageShell title="Settings" sub="Personalise UniAI. Everything is saved in this browser.">
      <div className="rounded-2xl border border-line bg-surface divide-y divide-[var(--line)]">
        <div className="p-5 sm:flex sm:items-center sm:justify-between gap-6">
          <div>
            <div className="font-semibold">Appearance</div>
            <div className="text-sm text-muted mt-0.5">Choose a light or dark interface.</div>
          </div>
          <div className="mt-3 sm:mt-0 inline-flex rounded-xl bg-surface2 p-1" role="radiogroup" aria-label="Theme">
            {(["light", "dark"] as Theme[]).map((t) => (
              <button key={t} role="radio" aria-checked={state.theme === t} onClick={() => setState((s: AppState) => ({ ...s, theme: t }))}
                className={"flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold " + (state.theme === t ? "bg-surface shadow-sm text-ink" : "text-muted")}>
                <Icon name={t === "light" ? "Sun" : "Moon"} size={15} />{t === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5 sm:flex sm:items-center sm:justify-between gap-6">
          <div>
            <label htmlFor="dname" className="font-semibold">Display name</label>
            <div className="text-sm text-muted mt-0.5">Shown on the leaderboard.</div>
          </div>
          <div className="mt-3 sm:mt-0 flex gap-2">
            <input id="dname" value={name} maxLength={24} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
              className="w-full sm:w-56 rounded-xl border border-line bg-bg px-3.5 py-2 text-[15px] outline-none focus:border-accent" />
            <button onClick={saveName} disabled={name.trim() === state.name}
              className="rounded-xl bg-accent text-white px-4 text-sm font-semibold disabled:opacity-40">Save</button>
          </div>
        </div>
        <div className="p-5 sm:flex sm:items-center sm:justify-between gap-6">
          <div>
            <div className="font-semibold">Reset demo</div>
            <div className="text-sm text-muted mt-0.5">Restore 85 points, the seeded chats and locked models, and clear redeemed rewards. Your theme is kept.</div>
          </div>
          <button onClick={() => setConfirm(true)} className="mt-3 sm:mt-0 inline-flex items-center gap-2 rounded-xl border border-[var(--danger)] text-[var(--danger)] px-4 py-2 text-sm font-semibold hover:bg-[var(--danger-soft)]">
            <Icon name="RotateCcw" size={15} /> Reset demo
          </button>
        </div>
      </div>
      <p className="mt-5 text-sm text-muted">UniAI is a prototype for the University of Nicosia. Answers and models are simulated; no data leaves your browser.</p>

      <Modal open={confirm} onClose={() => setConfirm(false)} label="Confirm reset">
        <h2 className="font-display text-xl font-bold">Reset the demo?</h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">This clears your points, claimed Easter eggs, unlocked models, redeemed rewards, chats and display name, then restores the starting state.</p>
        <div className="mt-6 flex gap-2.5">
          <button onClick={() => setConfirm(false)} className="flex-1 rounded-xl border border-line py-3 font-semibold hover:bg-surface2">Cancel</button>
          <button onClick={() => { setConfirm(false); reset(); }} className="flex-1 rounded-xl bg-[var(--danger)] text-white py-3 font-semibold hover:brightness-110">Reset demo</button>
        </div>
      </Modal>
    </PageShell>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
