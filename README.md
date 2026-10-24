# LangGraph

BMI workflow from the [CampusX tutorial](https://github.com/campusx-official/langgraph-tutorials/blob/main/1_bmi_workflow.ipynb): calculate BMI, then label it.

## Run

```bash
npm install
npm start
```

## Files

- `src/agent/graph.ts` — state, the two nodes, and the edges `START -> calculate_bmi -> label_bmi -> END`.
- `src/run.ts` — runs the graph with 80 kg and 1.73 m.
