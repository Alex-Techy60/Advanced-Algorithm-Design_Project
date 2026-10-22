var n = 0;
var gridData = [];
var wumpuses = [];
var pits = [];
var timezones = [];
var goldPos = null;
var wumpusCols = [];
var stenchCells = [];
var breezeCells = new Set();
var maxTurns = 0;

var DX = [-1, 1, 0, 0];
var DY = [0, 0, -1, 1];

function parse(input) {
  var lines = input.trim().split('\n')
    .map(function(l) { return l.trim(); })
    .filter(function(l) { return l.length > 0; });

  if (lines.length === 0) throw new Error('Empty input');

  n = parseInt(lines[0]);
  if (isNaN(n) || n < 2) throw new Error('Invalid grid size. Must be >= 2');
  if (lines.length < n + 1) throw new Error('Not enough rows. Expected ' + n + ' rows after the size');

  gridData = [];
  wumpuses = [];
  pits = [];
  timezones = [];
  goldPos = null;
  maxTurns = 4 * n * n;

  for (var i = 1; i <= n; i++) {
    var row = lines[i].split(/\s+/);
    if (row.length < n) throw new Error('Row ' + i + ' has ' + row.length + ' cells, expected ' + n);

    var gridRow = [];
    for (var j = 0; j < n; j++) {
      var sym = row[j];
      gridRow.push(sym);

      if (sym === 'W') wumpuses.push([i, j + 1]);
      if (sym === 'P') pits.push([i, j + 1]);
      if (sym === 'T') timezones.push([i, j + 1]);
      if (sym === 'G') goldPos = [i, j + 1];
    }
    gridData.push(gridRow);
  }

  if (!goldPos) throw new Error('No Gold (G) found in the grid');
}

function precompute() {
  var W = wumpuses.length;

  wumpusCols = [];
  for (var w = 0; w < W; w++) {
    var row = wumpuses[w][0];
    var col = wumpuses[w][1];
    var cols = [col];

    for (var t = 0; t < maxTurns; t++) {
      var phaseA = (t % 2 === 0);

      var steps;
      if (row % 2 === 0 && phaseA)  steps = [1, 1, 1, -1];
      if (row % 2 === 0 && !phaseA) steps = [1, -1, -1, -1];
      if (row % 2 !== 0 && phaseA)  steps = [-1, -1, -1, 1];
      if (row % 2 !== 0 && !phaseA) steps = [-1, 1, 1, 1];

      for (var s = 0; s < steps.length; s++) {
        col = col + steps[s];
        if (col < 1) col = 1;
        if (col > n) col = n;
      }
      cols.push(col);
    }
    wumpusCols.push(cols);
  }

  stenchCells = [];
  for (var t = 0; t <= maxTurns; t++) {
    var s = new Set();
    for (var w = 0; w < W; w++) {
      var wr = wumpuses[w][0];
      var wc = wumpusCols[w][t];

      for (var d = 0; d < 4; d++) {
        var sr = wr + DX[d];
        var sc = wc + DY[d];
        if (sr >= 1 && sr <= n && sc >= 1 && sc <= n) {
          s.add(sr + ',' + sc);
        }
      }
    }
    stenchCells.push(s);
  }

  breezeCells = new Set();
  for (var i = 0; i < pits.length; i++) {
    var pr = pits[i][0];
    var pc = pits[i][1];
    for (var d = 0; d < 4; d++) {
      var br = pr + DX[d];
      var bc = pc + DY[d];
      if (br >= 1 && br <= n && bc >= 1 && bc <= n) {
        breezeCells.add(br + ',' + bc);
      }
    }
  }
}

function search() {
  var gr = goldPos[0];
  var gc = goldPos[1];

  var heap = [];

  var bestCostMap = new Map();

  var bestPathMap = new Map();

  var startStench = stenchCells[0].has('1,1') ? 1 : 0;

  var startKey = '1,1,0,' + startStench + ',0';
  bestCostMap.set(startKey, 0);
  bestPathMap.set(startKey, [[1, 1]]);
  heapPush(heap, [0, 1, 1, 0, startStench, 0]);

  var bestAns = Infinity;
  var bestPath = null;

  while (heap.length > 0) {
    var item = heapPop(heap);
    var cost = item[0];
    var row  = item[1];
    var col  = item[2];
    var turn = item[3];
    var stench = item[4];
    var wt = item[5];

    var key = row + ',' + col + ',' + turn + ',' + stench + ',' + wt;

    if (bestCostMap.has(key) && bestCostMap.get(key) < cost) continue;

    var path = bestPathMap.get(key) || [[row, col]];

    if (row === gr && col === gc) {
      if (cost < bestAns) {
        bestAns = cost;
        bestPath = path.slice();
      }
      continue;
    }

    for (var d = 0; d < 4; d++) {
      var nr = row + DX[d];
      var nc = col + DY[d];
      var nt = turn + 1;

      if (nr < 1 || nr > n || nc < 1 || nc > n) continue;

      var isGold = (nr === gr && nc === gc);

      var visited = false;
      for (var pi = 0; pi < path.length; pi++) {
        if (path[pi][0] === nr && path[pi][1] === nc) {
          visited = true;
          break;
        }
      }
      if (visited) continue;

      var delta = 1;
      if (!isGold) {
        var sym = gridData[nr - 1][nc - 1];
        if (sym === 'P') delta += 5;
        if (breezeCells.has(nr + ',' + nc)) delta += 2;
        if (sym === 'T') delta -= 3;
      }

      var arrWt = Math.min(wt + 1, maxTurns);

      if (!isGold) {

        var wumpusHere = false;
        for (var w = 0; w < wumpuses.length; w++) {
          if (wumpuses[w][0] === nr && wumpusCols[w][arrWt] === nc) {
            wumpusHere = true;
            break;
          }
        }
        if (wumpusHere) continue;

        var newStench = stench;
        if (stenchCells[arrWt].has(nr + ',' + nc)) newStench++;
        if (newStench >= 3) continue;

        var newWt = Math.max(0, Math.min(wt + delta, maxTurns));
        var newCost = Math.max(0, cost + delta);
        var newPath = path.concat([[nr, nc]]);
        var newKey = nr + ',' + nc + ',' + nt + ',' + newStench + ',' + newWt;

        if (!bestCostMap.has(newKey) || bestCostMap.get(newKey) > newCost) {
          bestCostMap.set(newKey, newCost);
          bestPathMap.set(newKey, newPath);
          heapPush(heap, [newCost, nr, nc, nt, newStench, newWt]);
        }

      } else {

        var newWt = Math.max(0, Math.min(wt + delta, maxTurns));
        var newCost = Math.max(0, cost + delta);
        var newPath = path.concat([[nr, nc]]);
        var newKey = nr + ',' + nc + ',' + nt + ',' + stench + ',' + newWt;

        if (!bestCostMap.has(newKey) || bestCostMap.get(newKey) > newCost) {
          bestCostMap.set(newKey, newCost);
          bestPathMap.set(newKey, newPath);
          heapPush(heap, [newCost, nr, nc, nt, stench, newWt]);
        }
      }
    }
  }

  if (bestPath) {
    return { safe: true, cost: bestAns, path: bestPath };
  } else {
    return { safe: false };
  }
}

function heapPush(heap, item) {
  heap.push(item);
  var i = heap.length - 1;
  while (i > 0) {
    var parent = Math.floor((i - 1) / 2);
    if (heap[parent][0] <= heap[i][0]) break;
    var tmp = heap[parent];
    heap[parent] = heap[i];
    heap[i] = tmp;
    i = parent;
  }
}

function heapPop(heap) {
  var top = heap[0];
  var last = heap.pop();
  if (heap.length > 0) {
    heap[0] = last;
    var i = 0;
    while (true) {
      var smallest = i;
      var l = 2 * i + 1;
      var r = 2 * i + 2;
      if (l < heap.length && heap[l][0] < heap[smallest][0]) smallest = l;
      if (r < heap.length && heap[r][0] < heap[smallest][0]) smallest = r;
      if (smallest === i) break;
      var tmp = heap[i];
      heap[i] = heap[smallest];
      heap[smallest] = tmp;
      i = smallest;
    }
  }
  return top;
}

function getWtAtStep(step, path) {
  if (!path || step === 0) return 0;
  var wt = 0;
  for (var i = 1; i <= Math.min(step, path.length - 1); i++) {
    var r = path[i][0];
    var c = path[i][1];
    var isGold = (r === goldPos[0] && c === goldPos[1]);
    var delta = 1;
    if (!isGold) {
      var sym = gridData[r - 1][c - 1];
      if (sym === 'P') delta += 5;
      if (breezeCells.has(r + ',' + c)) delta += 2;
      if (sym === 'T') delta -= 3;
    }
    wt = Math.max(0, Math.min(wt + delta, maxTurns));
  }
  return wt;
}
