import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import { z } from "zod";
import dotenv from "dotenv";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
} from "@langchain/core/prompts";

dotenv.config();

const LLMState = new StateSchema({
    topic: z.string(),
    outline: z.string(),
    article: z.string()
});

const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_API_KEY,
    maxRetries: 0,
});

const createOutline = async (state: typeof LLMState.State) => {
    const prompt = await ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
            "You are a helpful assistant that can answer questions.",
        ),
        HumanMessagePromptTemplate.fromTemplate(
            "Generate an outline for a blog on the topic - {topic}",
        ),
    ]).invoke({ topic: state.topic });
    const response = await model.invoke(prompt);

    return { outline: response.content };
};

const createBlog = async (state: typeof LLMState.State) => {
    const prompt = await ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
            "You are a helpful assistant that can answer questions.",
        ),
        HumanMessagePromptTemplate.fromTemplate(
            "Write a detailed blog on the topic - {topic} and outline \n {outline}",
        ),
    ]).invoke({ topic: state.topic, outline: state.outline });

    const response = await model.invoke(prompt);

    return { article: response.content };
};

export const graph = new StateGraph(LLMState)
    .addNode('createOutline', createOutline)
    .addNode('createBlog', createBlog)
    .addEdge(START, 'createOutline')
    .addEdge('createOutline', 'createBlog')
    .addEdge('createBlog', END)
    .compile();
/**
 * 
 * 
 * START ->  (Check Profile: Code) -> (Check Cibil) -> (Check Eligi) -> Format -> (HUMAN)) -> Save -> End
 * 
 * 
 */