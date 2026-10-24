import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import { z } from "zod/v4";

const BMIState = new StateSchema({
  weightInKg: z.number(),
  heightInMeters: z.number(),
  bmi: z.number(),
  category: z.string(),
});

const calculateBmi = (state: typeof BMIState.State) => {
  const bmi = state.weightInKg / state.heightInMeters ** 2;
  return { bmi: Math.round(bmi * 100) / 100 };
};

const labelBmi = (state: typeof BMIState.State) => {
  const { bmi } = state;

  if (bmi < 18.5) return { category: "Underweight" };
  if (bmi < 25) return { category: "Normal" };
  if (bmi < 30) return { category: "Overweight" };
  return { category: "Obese" };
};

// START -> calculate_bmi -> label_bmi -> END
export const graph = new StateGraph(BMIState)
  .addNode("calculate_bmi", calculateBmi)
  .addNode("label_bmi", labelBmi)
  .addEdge(START, "calculate_bmi")
  .addEdge("calculate_bmi", "label_bmi")
  .addEdge("label_bmi", END)
  .compile();
