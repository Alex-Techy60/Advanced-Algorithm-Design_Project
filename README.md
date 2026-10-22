<div align="center">

# 🕳️ Wumpus No Longer Alone

### A guaranteed-safe, minimum-time path finder for a cave with *multiple, moving* Wumpuses

**Advanced Algorithm Design** · Course Project

| | |
|---|---|
| **Course** | Advanced Algorithm Design |
| **Instructor** | Dr. Suvadip Hazra |
| **Team Members** | Sugyan Singh (24BCS148) · Ritik Sinha (24BCS121) |
| **Implementations** | C++17 · Java · JavaScript (browser visualizer) |

</div>

---

## 📑 Table of Contents

1. [The Problem in Brief](#-the-problem-in-brief)
2. [Project Structure](#-project-structure)
3. [How to Run](#-how-to-run)
4. [Input / Output Format](#-input--output-format)
5. [The Algorithm](#-the-algorithm)
6. [Complexity and Performance](#-complexity-and-performance)
7. [Known Limitations and Notes](#-known-limitations-and-notes)
8. [Team](#-team)

---

## 🧩 The Problem in Brief

An agent starts at **(1,1)** of an **n × n** cave (5 ≤ n ≤ 15) and must reach the **Gold (G)**.
Before the agent moves, the program decides whether a *guaranteed-safe* path exists and, if so, outputs the path with the **minimum total time cost**.

| Symbol | Meaning | Effect |
|:---:|---|---|
| `.` | Empty | Safe, no effect |
| `W` | Wumpus | Entering a cell occupied by a Wumpus kills the agent |
| `P` | Pit | **+5 s** when entered |
| `T` | Time Zone | **−3 s** when entered |
| `G` | Gold | Goal. Costs only the base move (+1) |

**Rules that make this problem interesting**

- **Moves:** orthogonal, one cell per turn; a cell cannot be revisited (no cycles).
- **Base cost:** every move costs **+1 s**.
- **Breeze:** a cell orthogonally adjacent to a Pit costs an extra **+2 s**.
- **Stench:** a cell orthogonally adjacent to a Wumpus *at the moment of entry* is a stench cell. Entering **3 or more** stench cells kills the agent.
- **Moving Wumpuses:** Wumpuses move **horizontally only**, in a fixed oscillating pattern based on their row parity, clamped at the grid walls:

| Row parity | Turn A | Turn B |
|---|---|---|
| Even | right 3, left 1 | right 1, left 3 |
| Odd | left 3, right 1 | left 1, right 3 |

- **Time clamp:** accumulated time is `T ← max(0, T + δ)`; it never goes negative.
- **Turn limit:** a path may not exceed `4·n²` turns.
- **Output:** `UNSAFE`, or `SAFE` + minimum cost + the path (ties → lexicographically smallest).

> The full statement is in [`Problem_Statement-1.pdf`](Problem_Statement-1.pdf).

---

## 📁 Project Structure

```
Final/
├── code.cpp                 # C++17 solution (reads stdin, prints answer)
├── Code.java                # Java solution (same algorithm as the C++ one)
├── index.html               # Web visualizer — page layout (multi-file version)
├── style.css                # Web visualizer — dark "terminal" theme
├── algo.js                  # Web visualizer — the algorithm in JavaScript
├── ui.js                    # Web visualizer — UI logic, rendering, animation
├── wumpus_visualizer.html   # Web visualizer — everything bundled into ONE file
└── README.md                # This file
```

| File | Summary |
|---|---|
| **`code.cpp`** | Command-line solver in C++. Functions: `parse()`, `precompute()`, `search()`, `main()`. Uses `priority_queue`, `map`, `set`. |
| **`Code.java`** | Line-for-line Java equivalent. Uses `PriorityQueue<int[]>`, `HashMap<Long,…>` with a packed `long` state key, plus `makeKey()` and `compareStates()` helpers. |
| **`index.html`** | The page skeleton of the visualizer: input box, legend, result panel, animation controls and the cave grid. Loads `style.css`, `algo.js`, `ui.js`. |
| **`style.css`** | All styling: colour variables, panels, cell types (wumpus, pit, time zone, gold, path, stench/breeze overlays) and animations. |
| **`algo.js`** | Pure algorithm module for the browser: `parse`, `precompute`, `search`, a hand-written binary min-heap (`heapPush`, `heapPop`) and `getWtAtStep`. |
| **`ui.js`** | Glue code: `runAlgo`, `renderGrid`, play/pause/slider handlers, error display, example loader. |
| **`wumpus_visualizer.html`** | A self-contained copy of the same visualizer (HTML + CSS + JS inlined). Just double-click it. |

---

## ▶️ How to Run

### 1) C++ (`code.cpp`)

Requires a C++11-or-newer compiler (tested with `g++` and `-std=c++17`).

```bash
g++ -O2 -std=c++17 -o wumpus code.cpp
./wumpus < input.txt          # Linux / macOS
wumpus.exe < input.txt        # Windows (cmd)
```

Or type the input interactively and finish with Ctrl-D (Linux/macOS) / Ctrl-Z + Enter (Windows).

### 2) Java (`Code.java`)

Requires **JDK 11 or newer** (it uses `InputStream.readAllBytes()`, which needs Java 9+).

```bash
javac Code.java
java Code < input.txt
```

JDK 11+ can also run it in one step without a separate compile:

```bash
java Code.java < input.txt
```

### 3) HTML web visualizer

No server, build step, or installation is needed.

- **Quickest:** double-click **`wumpus_visualizer.html`** (single file).
- **Multi-file version:** open **`index.html`**. Keep `style.css`, `algo.js` and `ui.js` in the same folder.

Then in the browser:

1. Paste a grid into **Grid Input**, or click **EXAMPLE**.
2. Click **▶ RUN ALGORITHM**.
3. Read the status (**SAFE / UNSAFE**), cost and path in the **Result** panel.
4. Use **PLAY**, the **Step** slider and the **Speed** slider to watch the agent walk the path while the Wumpuses move.

> The Google Fonts link needs internet; offline, the page simply falls back to system fonts.

---

## 📥 Input / Output Format

**Input** — first line `n`, then `n` lines of `n` space-separated symbols:

```
5
. . . P .
W . . . .
. P . . G
. . W . .
. . . T .
```

**Output**

```
SAFE
15
(1,1) (1,2) (1,3) (1,4) (1,5) (2,5) (3,5)
```

or just `UNSAFE` when no safe path exists.

---

## 🧠 The Algorithm

The solution is a **best-first (Dijkstra-style) search over an expanded state space**, with the
dynamic hazards **pre-computed** so that every check during search is O(1).

### Step 1 — Parse
Read the grid; collect the coordinates of every `W`, `P`, `T` and the `G`. Set `maxTurns = 4·n²`.

### Step 2 — Pre-compute the world
- **Wumpus timeline.** For each Wumpus (its row never changes) simulate the A/B oscillation step by step, with wall clamping, and store its column at every clock tick `0 … maxTurns` → `wumpusCols[w][t]`.
- **Stench map per tick.** For each tick `t`, mark the four neighbours of every Wumpus's position → `stenchCells[t]`.
- **Breeze map.** Static: mark the four neighbours of every Pit → `breezeCells`.

### Step 3 — Search
A **state** is the 5-tuple

```
(row, col, turn, stenchCount, wumpusClock)
```

- `turn` — number of moves made so far.
- `stenchCount` — stench cells entered so far (0, 1 or 2; reaching 3 is death, so such states are never created).
- `wumpusClock` — the agent's accumulated (clamped) time `T`. **The Wumpuses' positions are looked up with this clock**, so a Time Zone (−3 s) really rewinds the Wumpuses and a Pit (+5 s) fast-forwards them.

A min-priority-queue is keyed on accumulated cost. For each popped state and each of the 4 directions:

| Check | Action |
|---|---|
| Outside the grid | skip |
| Cell already on this path (no cycles) | skip |
| A Wumpus is in the target cell at the arrival clock (`wumpusClock + 1`) | skip (death) |
| Target is a stench cell at that clock | `stench + 1`; skip if it reaches **3** |
| Otherwise | `δ = 1 (+5 if P) (+2 if breeze) (−3 if T)`; `cost ← max(0, cost + δ)`; `clock ← clamp(clock + δ, 0, maxTurns)` |

The **Gold cell** is exempt from hazard penalties (it is always safe), costing only the base +1.
A new state is pushed only if it improves the best known cost for the same 5-tuple. When the Gold is popped, the best cost and path are recorded; the search continues until the queue is empty, and the cheapest Gold arrival wins.
If the Gold is never reached, the answer is `UNSAFE`.

### Why this works
- Because Wumpuses are deterministic, **safety can be decided offline** — a path is either safe or not, which turns "guaranteed safe" into a plain reachability condition.
- Adding the Wumpus clock and stench count to the state turns the time-dependent problem into an ordinary shortest-path problem on a larger graph.
- Negative edges (Time Zones) are handled because every state includes `turn`, which strictly increases, so the state graph is acyclic and states are re-opened whenever a cheaper cost is found.

---

## ⏱️ Complexity and Performance

| Phase | Cost |
|---|---|
| Wumpus timeline | O(W · 4n²) — at most ~13,500 steps for n = 15 |
| Stench / breeze maps | O(4n² · W) and O(P) |
| Search | O(S · (log S + L)), where S = reachable states and L = path length (a path copy is stored per state) |

The state space is bounded by `n² · n² · 3 · 4n²`, but only a small fraction is reachable in practice.
In our tests, 10×10 and 12×12 random grids finished in well under a second, while **dense, open 15×15 grids can take tens of seconds or more** (see below).

---

## ⚠️ Known Limitations and Notes

We validated all three implementations against an exact brute-force search (every simple path) on 40 random 5×5 / 6×6 grids. Findings:

1. **Minimum cost** matched the brute-force result in **40 / 40** cases for C++, Java and JavaScript.
2. **Exact tie-breaking** (lexicographically smallest path among equal-cost optima) matched in 32 / 40 cases for C++ and Java and 27 / 40 for JavaScript. The pruning keeps the first path found for each state and does not enforce lexicographic order, and the neighbour order `{up, down, left, right}` is not lexicographic order.
3. **Per-state pruning is a heuristic.** Because paths may not revisit cells, two partial paths with the same state are not always interchangeable. On one 10×10 grid the JavaScript version found a valid path costing 5 where C++/Java reported 6. The JS heap orders only by cost, so its tie-breaking differs from C++/Java.
4. **Sample output in the problem statement:** the PDF lists a cost of `3` for the example, but under the stated cost model the printed path costs `1 + 3 + 6 + 3 + 1 + 1 = 15` (breeze on (1,3), pit on (1,4), breeze on (1,5)). Our programs print `15` for that path.
5. **Clock interpretation:** the Wumpus clock equals the agent's accumulated time (see Step 3). This is how the code links Time Zones and Pits to Wumpus movement.

---

## 👥 Team

| Name | Roll No. |
|---|---|
| Sugyan Singh | 24BCS148 |
| Ritik Sinha | 24BCS121 |

**Instructor:** Dr. Suvadip Hazra — *Advanced Algorithm Design*
