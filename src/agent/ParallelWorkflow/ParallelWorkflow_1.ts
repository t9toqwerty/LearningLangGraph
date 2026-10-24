import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import { z } from "zod";

const BatsmanState = new StateSchema({
    runs: z.number(),
    balls: z.number(),
    strikeRate: z.number(),
    fours: z.number(),
    sixes: z.number(),
    ballsPerBoundry: z.number(),
    boundryPercentage: z.number(),
    summary: z.string()
});

const calculateStrikeRate = (state: typeof BatsmanState.State) => {
    return { strikeRate: state.runs / state.balls / 100 };
};

const calculateBallsPerBoundry = (state: typeof BatsmanState.State) => {
    return { ballsPerBoundry: state.balls / (state.fours + state.sixes) };
}

const boundryPercentage = (state: typeof BatsmanState.State) => {
    return { boundryPercentage: (state.fours * 4 + state.sixes) / state.runs * 100 };
}

const getSummary = (state: typeof BatsmanState.State) => {
    return {
        summary: `
            Strike Rate: ${state.strikeRate} \n
            Balls per Boundry: ${state.ballsPerBoundry} \n
            Boundry Percentage: ${state.boundryPercentage}
        `};
}

export const graph =new StateGraph(BatsmanState)
    .addNode('calculateStrikeRate', calculateStrikeRate)
    .addNode('calculateBallsPerBoundry', calculateBallsPerBoundry)
    .addNode('calculateBoundryPercentage', boundryPercentage)
    .addNode('getSummary', getSummary)
    .addEdge(START, 'calculateStrikeRate')
    .addEdge(START, 'calculateBallsPerBoundry')
    .addEdge(START, 'calculateBoundryPercentage')
    .addEdge('calculateStrikeRate', 'getSummary')
    .addEdge('calculateBallsPerBoundry', 'getSummary')
    .addEdge('calculateBoundryPercentage', 'getSummary')
    .addEdge('getSummary', END)
    .compile();