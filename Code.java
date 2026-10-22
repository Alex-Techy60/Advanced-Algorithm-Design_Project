import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

public class Code {

    static int n;
    static char[][] grid;
    static List<int[]> wumpuses = new ArrayList<>();
    static List<int[]> pits = new ArrayList<>();
    static List<int[]> timezones = new ArrayList<>();
    static int[] goldPos = new int[2];
    static int maxTurns;
    static int[][] wumpusCols;
    static boolean[][][] stenchCells;
    static boolean[][] breezeCells;

    static final int[] dx = { -1, 1, 0, 0 };
    static final int[] dy = { 0, 0, -1, 1 };

    static void parse() {
        java.util.Scanner sc = new java.util.Scanner(System.in);

        n = sc.nextInt();
        maxTurns = 4 * n * n;
        grid = new char[n + 2][n + 2];

        int row = 1;
        int col = 1;

        while (row <= n && sc.hasNext()) {
            String token = sc.next();

            for (int i = 0; i < token.length() && row <= n; i++) {
                grid[row][col] = token.charAt(i);

                if (grid[row][col] == 'W')
                    wumpuses.add(new int[] { row, col });
                if (grid[row][col] == 'P')
                    pits.add(new int[] { row, col });
                if (grid[row][col] == 'T')
                    timezones.add(new int[] { row, col });
                if (grid[row][col] == 'G')
                    goldPos = new int[] { row, col };

                col++;
                if (col > n) {
                    col = 1;
                    row++;
                }
            }
        }

        sc.close();
    }

    static void precompute() {
        int W = wumpuses.size();
        wumpusCols = new int[W][maxTurns + 1];

        for (int w = 0; w < W; w++) {
            int row = wumpuses.get(w)[0];
            int col = wumpuses.get(w)[1];
            wumpusCols[w][0] = col;

            for (int t = 0; t < maxTurns; t++) {
                boolean phaseA = (t % 2 == 0);

                int[] steps = null;
                if (row % 2 == 0 && phaseA)
                    steps = new int[] { 1, 1, 1, -1 };
                if (row % 2 == 0 && !phaseA)
                    steps = new int[] { 1, -1, -1, -1 };
                if (row % 2 != 0 && phaseA)
                    steps = new int[] { -1, -1, -1, 1 };
                if (row % 2 != 0 && !phaseA)
                    steps = new int[] { -1, 1, 1, 1 };

                for (int i = 0; i < steps.length; i++) {
                    col = col + steps[i];
                    if (col < 1)
                        col = 1;
                    if (col > n)
                        col = n;
                }

                wumpusCols[w][t + 1] = col;
            }
        }

        stenchCells = new boolean[maxTurns + 1][n + 2][n + 2];

        for (int t = 0; t <= maxTurns; t++) {
            for (int w = 0; w < W; w++) {
                int wr = wumpuses.get(w)[0];
                int wc = wumpusCols[w][t];

                for (int d = 0; d < 4; d++) {
                    int sr = wr + dx[d];
                    int sc = wc + dy[d];

                    if (sr < 1 || sr > n)
                        continue;
                    if (sc < 1 || sc > n)
                        continue;

                    stenchCells[t][sr][sc] = true;
                }
            }
        }

        breezeCells = new boolean[n + 2][n + 2];

        for (int i = 0; i < pits.size(); i++) {
            int pr = pits.get(i)[0];
            int pc = pits.get(i)[1];

            for (int d = 0; d < 4; d++) {
                int br = pr + dx[d];
                int bc = pc + dy[d];

                if (br < 1 || br > n)
                    continue;
                if (bc < 1 || bc > n)
                    continue;

                breezeCells[br][bc] = true;
            }
        }
    }

    static long makeKey(int row, int col, int turn, int stench, int wt) {
        long key = row;
        key = key * 32 + col;
        key = key * 2048 + turn;
        key = key * 4 + stench;
        key = key * 2048 + wt;
        return key;
    }

    static int compareStates(int[] a, int[] b) {
        for (int i = 0; i < a.length; i++) {
            if (a[i] != b[i])
                return Integer.compare(a[i], b[i]);
        }
        return 0;
    }

    static void search() {
        PriorityQueue<int[]> pq = new PriorityQueue<>(Code::compareStates);
        int bestAnswerCost = Integer.MAX_VALUE;
        List<int[]> bestAnswerPath = null;

        Map<Long, Integer> bestCost = new HashMap<>();
        Map<Long, List<int[]>> bestPath = new HashMap<>();

        List<int[]> startPath = new ArrayList<>();
        startPath.add(new int[] { 1, 1 });

        int startStench = 0;
        if (stenchCells[0][1][1])
            startStench = 1;

        long startKey = makeKey(1, 1, 0, startStench, 0);
        bestCost.put(startKey, 0);
        bestPath.put(startKey, startPath);

        pq.add(new int[] { 0, 0, 1, 1, 0, startStench, 0 });

        while (!pq.isEmpty()) {
            int[] curr = pq.poll();

            int cost = curr[1];
            int row = curr[2];
            int col = curr[3];
            int turn = curr[4];
            int stench = curr[5];
            int wumpusTurn = curr[6];

            long currKey = makeKey(row, col, turn, stench, wumpusTurn);

            if (bestCost.containsKey(currKey) && bestCost.get(currKey) < cost)
                continue;

            List<int[]> path = bestPath.get(currKey);

            if (row == goldPos[0] && col == goldPos[1]) {
                if (cost < bestAnswerCost) {
                    bestAnswerCost = cost;
                    bestAnswerPath = path;
                }
                continue;
            }

            for (int d = 0; d < 4; d++) {
                int nr = row + dx[d];
                int nc = col + dy[d];
                int nt = turn + 1;

                if (nr < 1 || nr > n)
                    continue;
                if (nc < 1 || nc > n)
                    continue;
                boolean isGold = (nr == goldPos[0] && nc == goldPos[1]);

                boolean visited = false;
                for (int i = 0; i < path.size(); i++) {
                    if (path.get(i)[0] == nr && path.get(i)[1] == nc) {
                        visited = true;
                        break;
                    }
                }
                if (visited)
                    continue;

                int delta = 1;
                if (!isGold) {
                    if (grid[nr][nc] == 'P')
                        delta += 5;
                    if (breezeCells[nr][nc])
                        delta += 2;
                    if (grid[nr][nc] == 'T')
                        delta -= 3;
                }

                int arrivalWt = wumpusTurn + 1;
                arrivalWt = Math.max(0, arrivalWt);
                arrivalWt = Math.min(arrivalWt, maxTurns);

                if (!isGold) {
                    boolean wumpusHere = false;
                    for (int w = 0; w < wumpuses.size(); w++) {
                        if (wumpuses.get(w)[0] == nr && wumpusCols[w][arrivalWt] == nc) {
                            wumpusHere = true;
                            break;
                        }
                    }
                    if (wumpusHere)
                        continue;
                }

                int newStench = stench;
                if (!isGold) {
                    if (stenchCells[arrivalWt][nr][nc])
                        newStench++;
                    if (newStench >= 3)
                        continue;
                }

                int newWt = wumpusTurn + delta;
                newWt = Math.max(0, newWt);
                newWt = Math.min(newWt, maxTurns);

                int newCost = Math.max(0, cost + delta);

                List<int[]> newPath = new ArrayList<>(path);
                newPath.add(new int[] { nr, nc });

                long newKey = makeKey(nr, nc, nt, newStench, newWt);

                if (!bestCost.containsKey(newKey) || bestCost.get(newKey) > newCost) {
                    bestCost.put(newKey, newCost);
                    bestPath.put(newKey, newPath);

                    int newPriority = newCost;

                    pq.add(new int[] { newPriority, newCost, nr, nc, nt, newStench, newWt });
                }
            }
        }

        if (bestAnswerCost == Integer.MAX_VALUE) {
            System.out.println("UNSAFE");
        } else {
            System.out.println("SAFE");
            System.out.println(bestAnswerCost);
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < bestAnswerPath.size(); i++) {
                sb.append("(").append(bestAnswerPath.get(i)[0]).append(",")
                        .append(bestAnswerPath.get(i)[1]).append(")");
                if (i < bestAnswerPath.size() - 1)
                    sb.append(" ");
            }
            System.out.println(sb);
        }
    }

    public static void main(String[] args) throws IOException {
        parse();
        precompute();
        search();
    }
}