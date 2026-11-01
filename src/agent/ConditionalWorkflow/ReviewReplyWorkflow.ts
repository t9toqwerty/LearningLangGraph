import {END, START, StateGraph, StateSchema} from "@langchain/langgraph";
import {ChatGoogleGenerativeAI} from "@langchain/google-genai";
import {z} from "zod/v4";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate
} from "@langchain/core/prompts";

const reviewReplyWorkflowState = new StateSchema({
    review: z.string(),
    sentiment: z.enum(['Positive', 'Negative']),
    diagnosis: z.object({
        issueType: z.enum(['UX', 'Performance', 'Bug', 'Support', 'Other']),
        tone: z.enum(['Angry', 'Frustrated', 'Disappointment', 'Calm']),
        urgency: z.enum(['Low', 'Medium', 'High']),
    }),
    response: z.string()
});

const reviewSentimentSchema = z.object({
    sentiment: z.enum(['Positive', 'Negative'])
});

const diagnosisSchema = z.object({
    issueType: z.enum(['UX', 'Performance', 'Bug', 'Support', 'Other']).describe("The category of issue mentioned in the review."),
    tone: z.enum(['Angry', 'Frustrated', 'Disappointment', 'Calm']).describe("The emotional tone expressed by the user."),
    urgency: z.enum(['Low', 'Medium', 'High']).describe("How urgent or critical the issue appears to be?"),
});

const structuredOutputModel = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_API_KEY,
    maxRetries: 0,
});

const checkSentiment = async (state: typeof reviewReplyWorkflowState.State) => {
    const prompts = await ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate("You are a helpful assistant that can answer questions."),
        HumanMessagePromptTemplate.fromTemplate(`For the following review find out the sentiment. \n ${state.review}`)
    ]).invoke({});

    const modelResponse = await structuredOutputModel.withStructuredOutput(reviewSentimentSchema).invoke(prompts);

    return {sentiment: modelResponse.sentiment};
};

const filterSentiment = (state: typeof reviewReplyWorkflowState.State) => {
    if (state.sentiment === 'Positive') {
        return 'positiveResponse';
    }

    return 'runDiagnosis';
};

const positiveResponse = async (state: typeof reviewReplyWorkflowState.State) => {
    const prompts = await ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate("You are a helpful assistant that can answer questions."),
        HumanMessagePromptTemplate.fromTemplate(`Write a warm thank-you message in response to this review. \n ${state.review}.
        Also kindly ask the user to leave feedback on our website.`)
    ]).invoke({});

    const modelResponse = await structuredOutputModel.invoke(prompts);

    return {response: modelResponse.content};
}

const negativeResponse = async (state: typeof reviewReplyWorkflowState.State) => {
    const prompts = await ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate("You are a helpful assistant that can answer questions."),
        HumanMessagePromptTemplate.fromTemplate(`The user had a ${state.diagnosis.issueType} issue, sounded ${state.diagnosis.tone} and
        marked urgency as ${state.diagnosis.urgency}. Write an empathetic and helpful resolution message.`)
    ]).invoke({});

    const modelResponse = await structuredOutputModel.invoke(prompts);

    return {response: modelResponse.content};
}

const runDiagnosis = async (state: typeof reviewReplyWorkflowState.State) => {
    const prompts = await ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate("You are a helpful assistant that can answer questions."),
        HumanMessagePromptTemplate.fromTemplate(`Diagnose this negative review. \n ${state.review}\n
        Return issue type, tone and urgency.`)
    ]).invoke({});

    const modelResponse = await structuredOutputModel.withStructuredOutput(diagnosisSchema).invoke(prompts);

    return {diagnosis: {issueType: modelResponse.issueType, tone: modelResponse.tone, urgency: modelResponse.urgency}};
}

export const graph = new StateGraph(reviewReplyWorkflowState)
    .addNode('checkSentiment', checkSentiment)
    .addNode('positiveResponse', positiveResponse)
    .addNode('negativeResponse', negativeResponse)
    .addNode('runDiagnosis', runDiagnosis)
    .addEdge(START, 'checkSentiment')
    .addConditionalEdges('checkSentiment', filterSentiment)
    .addEdge('runDiagnosis', 'negativeResponse')
    .addEdge('negativeResponse', END)
    .addEdge('positiveResponse', END)
    .compile();