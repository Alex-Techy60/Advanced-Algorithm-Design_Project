#include <bits/stdc++.h>
#include <vector>
#include <set>
#include <map>
#include <queue>
#include <climits>
using namespace std;

int n;

char grid[21][21];

vector<pair<int,int>> wumpuses;
vector<pair<int,int>> pits;
vector<pair<int,int>> timezones;
pair<int,int> gold_pos; 

int max_turns;

int wumpus_cols[16][905];

vector<set<pair<int,int>>> stench_cells;

set<pair<int,int>> breeze_cells;

int dx[] = {-1, 1, 0, 0};
int dy[] = {0, 0, -1, 1};


void Parse() {

    cin >> n;

    max_turns = 4 * n * n;

    for(int row = 1; row <= n; row++) {
        for(int col = 1; col <= n; col++) {

            cin >> grid[row][col];

            if(grid[row][col] == 'W')
                wumpuses.push_back(make_pair(row, col));

            if(grid[row][col] == 'P')
                pits.push_back(make_pair(row, col));

            if(grid[row][col] == 'T')
                timezones.push_back(make_pair(row, col));

            if(grid[row][col] == 'G')
                gold_pos = make_pair(row, col);
        }
    }
}

void preCompute() {

    int W = wumpuses.size();

    for(int w = 0; w < W; w++) {

        int row = wumpuses[w].first;
        int col = wumpuses[w].second;

        wumpus_cols[w][0] = col;

        for(int t = 0; t < max_turns; t++) {

            bool phaseA = (t % 2 == 0);
            vector<int> steps;
            if(row % 2 == 0 && phaseA)   steps = {1, 1, 1, -1};
            if(row % 2 == 0 && !phaseA)  steps = {1, -1, -1, -1};
            if(row % 2 != 0 && phaseA)   steps = {-1, -1, -1, 1};
            if(row % 2 != 0 && !phaseA)  steps = {-1, 1, 1, 1};

            for(int i = 0; i < (int)steps.size(); i++) {
                col = col + steps[i];
                if(col < 1) col = 1;
                if(col > n) col = n;
            }

            wumpus_cols[w][t+1] = col;
        }
    }

    stench_cells.resize(max_turns + 1);

    for(int t = 0; t <= max_turns; t++) {
        for(int w = 0; w < W; w++) {

            int wr = wumpuses[w].first;
            int wc = wumpus_cols[w][t];

            for(int d = 0; d < 4; d++) {
                int sr = wr + dx[d];
                int sc = wc + dy[d];

                if(sr < 1 || sr > n) continue;
                if(sc < 1 || sc > n) continue;

                stench_cells[t].insert(make_pair(sr, sc));
            }
        }
    }

    for(int i = 0; i < (int)pits.size(); i++) {
        int pr = pits[i].first;
        int pc = pits[i].second;

        for(int d = 0; d < 4; d++) {
            int br = pr + dx[d];
            int bc = pc + dy[d];

            if(br < 1 || br > n) continue;
            if(bc < 1 || bc > n) continue;

            breeze_cells.insert(make_pair(br, bc));
        }
    }
}




void Search() {

    typedef tuple<int,int,int,int,int,int,int> PQState;

    priority_queue<PQState, vector<PQState>, greater<PQState>> pq;
    int best_answer_cost = INT_MAX;
    vector<pair<int,int>> best_answer_path;

    map<tuple<int,int,int,int,int>, int> best_cost;

    map<tuple<int,int,int,int,int>, vector<pair<int,int>>> best_path;

    vector<pair<int,int>> start_path;
    start_path.push_back(make_pair(1, 1));

    int start_stench = 0;
    if(stench_cells[0].count(make_pair(1, 1)))
        start_stench = 1;

    tuple<int,int,int,int,int> start_key = make_tuple(1, 1, 0, start_stench, 0);
    best_cost[start_key] = 0;
    best_path[start_key] = start_path;

    pq.push(make_tuple(0, 0, 1, 1, 0, start_stench, 0));

    while(!pq.empty()) {

        PQState curr = pq.top();
        pq.pop();

        int cost        = get<1>(curr);
        int row         = get<2>(curr);
        int col         = get<3>(curr);
        int turn        = get<4>(curr);
        int stench      = get<5>(curr);
        int wumpus_turn = get<6>(curr);

        

        tuple<int,int,int,int,int> curr_key = make_tuple(row, col, turn, stench, wumpus_turn);

        if(best_cost.count(curr_key) && best_cost[curr_key] < cost)
            continue;

        vector<pair<int,int>> path = best_path[curr_key];

        if(row == gold_pos.first && col == gold_pos.second) {
            
            if(cost < best_answer_cost) {
                best_answer_cost = cost;
                best_answer_path = path;
            }
            continue;  
        }

        

        for(int d = 0; d < 4; d++) {
            int nr = row + dx[d];  
            int nc = col + dy[d];  
            int nt = turn + 1;     

            if(nr < 1 || nr > n) continue;
            if(nc < 1 || nc > n) continue;
            bool is_gold = (nr == gold_pos.first && nc == gold_pos.second);

            bool visited = false;
            for(int i = 0; i < (int)path.size(); i++) {
                if(path[i].first == nr && path[i].second == nc) {
                    visited = true;
                    break;
                }
            }
            if(visited) continue;

            int delta = 1;
            if(!is_gold) {
                if(grid[nr][nc] == 'P') delta += 5;
                if(breeze_cells.count(make_pair(nr, nc))) delta += 2;
                if(grid[nr][nc] == 'T') delta -= 3;
            }

            int arrival_wt = wumpus_turn + 1;
            arrival_wt = max(0, arrival_wt);
            arrival_wt = min(arrival_wt, max_turns);

           
            

            if(!is_gold) {
                bool wumpus_here = false;
                for(int w = 0; w < (int)wumpuses.size(); w++) {
                    if(wumpuses[w].first == nr && wumpus_cols[w][arrival_wt] == nc) {
                        wumpus_here = true;
                        break;
                    }
                }
                if(wumpus_here) continue;
            }

            int new_stench = stench;
            if(!is_gold) {
                if(stench_cells[arrival_wt].count(make_pair(nr, nc)))
                    new_stench++;
                if(new_stench >= 3) continue;
            }

            int new_wt = wumpus_turn + delta;
            new_wt = max(0, new_wt);
            new_wt = min(new_wt, max_turns);

            int new_cost = max(0, cost + delta);

            vector<pair<int,int>> new_path = path;
            new_path.push_back(make_pair(nr, nc));

            tuple<int,int,int,int,int> new_key = make_tuple(nr, nc, nt, new_stench, new_wt);

            if(!best_cost.count(new_key) || best_cost[new_key] > new_cost) {
                best_cost[new_key] = new_cost;
                best_path[new_key] = new_path;

                int new_priority = new_cost;
                

                pq.push(make_tuple(new_priority, new_cost,
                                   nr, nc, nt, new_stench, new_wt));
            }
        }
    }

    if(best_answer_cost == INT_MAX) {
        cout << "UNSAFE" << endl;
    } else {
        cout << "SAFE" << endl;
        cout << best_answer_cost << endl;
        for(int i = 0; i < (int)best_answer_path.size(); i++) {
            cout << "(" << best_answer_path[i].first << ","
                 << best_answer_path[i].second << ")";
            if(i < (int)best_answer_path.size()-1) cout << " ";
        }
        cout << endl;
    }
}




int main() {
    Parse();       
    preCompute();  
    Search();      
    return 0;
}
