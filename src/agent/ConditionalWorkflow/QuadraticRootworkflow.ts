import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import { z } from "zod/v4";

const quadraticRootworkflowSchema = new StateSchema({
    a: z.number(),
    b: z.number(),
    c: z.number(),
    equation: z.string(),
    d: z.float32(),
    result: z.string()
});

const showEquation = (state: typeof quadraticRootworkflowSchema.State) => {
    return { equation: `${state.a}X2${state.b}X${state.c}` };
};

const calculateDiscriminant = (state: typeof quadraticRootworkflowSchema.State) => {
    return { d: state.b ** 2 - 4 * state.a * state.c };
};

const realRoots = (state: typeof quadraticRootworkflowSchema.State) => {
    return { result: 'Result with real roots' };
};

const repeatedRoots = (state: typeof quadraticRootworkflowSchema.State) => {
    return { result: 'Result with repeatitive roots' };
};

const noRealRoots = (state: typeof quadraticRootworkflowSchema.State) => {
    return { result: 'Result with no real roots' };
};

const checkCondition = (state: typeof quadraticRootworkflowSchema.State) => {
    if (state.d > 0) {
        return 'realRoots';
    }

    if (state.d === 0) {
        return 'repeatedRoots';
    }

    return 'noRealRoots';
};

export const graph = new StateGraph(quadraticRootworkflowSchema)
    .addNode('showEquation', showEquation)
    .addNode('calculateDiscriminant', calculateDiscriminant)
    .addNode('realRoots', realRoots)
    .addNode('repeatedRoots', repeatedRoots)
    .addNode('noRealRoots', noRealRoots)
    .addEdge(START, 'showEquation')
    .addEdge('showEquation', 'calculateDiscriminant')
    .addConditionalEdges('calculateDiscriminant', checkCondition)
    .addEdge('noRealRoots', END)
    .addEdge('realRoots', END)
    .addEdge('repeatedRoots', END)
    .compile();

