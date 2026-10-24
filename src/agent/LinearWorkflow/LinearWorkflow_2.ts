import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import z from "zod";
import dotenv from "dotenv";
import { ChatPromptTemplate } from "@langchain/core/prompts";

dotenv.config();

const llmState = new StateSchema({
    question: z.string(),
    answer: z.string()
});

const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_API_KEY,
    maxRetries: 0,
});

const llmQA = async (state: typeof llmState.State) => {
    const prompt = await ChatPromptTemplate.fromMessages([
        ["system", "You are a helpful assistant that can answer questions."],
        ["human", "{question}"],
    ]).invoke({ question: state.question });
    const response = await model.invoke(prompt);
    return { answer: response.content };
};

export const graph = new StateGraph(llmState)
    .addNode('llmQA', llmQA)
    .addEdge(START, 'llmQA')
    .addEdge('llmQA', END)
    .compile();
