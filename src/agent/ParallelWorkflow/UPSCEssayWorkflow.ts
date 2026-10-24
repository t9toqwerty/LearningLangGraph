import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { END, ReducedValue, START, StateGraph, StateSchema } from "@langchain/langgraph";
import { z } from "zod";
import _ from "lodash";

const UPSCWorkflowState = new StateSchema({
    essay: z.string(),
    languageFeedback: z.string(),
    analysisFeedback: z.string(),
    clarityFeedback: z.string(),
    overallFeedback: z.string(),
    individualScores: new ReducedValue(z.array(z.number()).default([]), {
        inputSchema: z.number(),
        reducer: (current, next) => current.concat(next),
    }),
    averageScore: z.number()
});

const feedbackOutputSchema = z.object({
    feedback: z.string(),
    score: z.number()
});

const structuredModel = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_API_KEY,
    maxRetries: 0,
}).withStructuredOutput(feedbackOutputSchema);

const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_API_KEY,
    maxRetries: 0,
});

export const getLanguageFeedback = async (state: typeof UPSCWorkflowState.State) => {
    const prompt = await ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
            "You are a helpful assistant that can answer questions.",
        ),
        HumanMessagePromptTemplate.fromTemplate(
            "Evaluate the language quality of the following essay and provide a feedback and assign a score out of 10 - {essay}",
        ),
    ]).invoke({ essay: state.essay });
    const response = await structuredModel.invoke(prompt);
    return {
        languageFeedback: response.feedback,
        individualScores: response.score
    };
};

export const getAnalysisFeedback = async (state: typeof UPSCWorkflowState.State) => {
    const prompt = await ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
            "You are a helpful assistant that can answer questions.",
        ),
        HumanMessagePromptTemplate.fromTemplate(
            "Evaluate the depth of analysis of the following essay and provide a feedback and assign a score out of 10 - {essay}",
        ),
    ]).invoke({ essay: state.essay });
    const response = await structuredModel.invoke(prompt);
    return {
        analysisFeedback: response.feedback,
        individualScores: response.score
    };
};

export const getClarityFeedback = async (state: typeof UPSCWorkflowState.State) => {
    const prompt = await ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
            "You are a helpful assistant that can answer questions.",
        ),
        HumanMessagePromptTemplate.fromTemplate(
            "Evaluate the clarity of thought of the following essay and provide a feedback and assign a score out of 10 - {essay}",
        ),
    ]).invoke({ essay: state.essay });
    const response = await structuredModel.invoke(prompt);
    return {
        clarityFeedback: response.feedback,
        individualScores: response.score
    };
};

export const getOverallFeedback = async (state: typeof UPSCWorkflowState.State) => {
    const prompt = await ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
            "You are a helpful assistant that can answer questions.",
        ),
        HumanMessagePromptTemplate.fromTemplate(
            `Based on the following feedbacks create a summarized feedback \n
             Language Feedback: ${state.languageFeedback} \n
             Depth of Analysis  Feedback: ${state.analysisFeedback} \n
             Clarity of Thought Feedback: ${state.clarityFeedback} \n
            `,
        ),
    ]).invoke({});
    const response = await model.invoke(prompt);
    return {
        averageScore: _.mean(state.individualScores),
        overallFeedback: response.content
    };
};

export const graph = new StateGraph(UPSCWorkflowState)
    .addNode('getLanguageFeedback', getLanguageFeedback)
    .addNode('getAnalysisFeedback', getAnalysisFeedback)
    .addNode('getClarityFeedback', getClarityFeedback)
    .addNode('getOverallFeedback', getOverallFeedback)
    .addEdge(START, 'getLanguageFeedback')
    .addEdge(START, 'getAnalysisFeedback')
    .addEdge(START, 'getClarityFeedback')
    .addEdge('getLanguageFeedback', 'getOverallFeedback')
    .addEdge('getAnalysisFeedback', 'getOverallFeedback')
    .addEdge('getClarityFeedback', 'getOverallFeedback')
    .addEdge('getOverallFeedback', END)
    .compile();
