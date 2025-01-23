const axios = require('axios');
const { HumanMessage } = require('@langchain/core/messages');
const { ChatOpenAI } = require('@langchain/openai');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { z } = require('zod');

// Function to fetch the image data as a binary buffer
async function getImageData(url) {
    try {
        console.log("Fetching image data from URL:", url);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        console.log("Image data successfully fetched.");
        return Buffer.from(response.data, 'binary').toString('base64');  // Convert binary data to base64
    } catch (error) {
        console.error("Error fetching image data:", error);
        throw new Error(`Failed to fetch image data: ${error.message}`);
    }
}

// Define the ChatPromptTemplate to analyze the image and extract information
const taggingPrompt = ChatPromptTemplate.fromTemplate(
    `Analyze the provided image and extract the following information:
    
    1. "isExpenseBill": true or false - Whether the image is an applicable expense bill, it should be false if the image is not an paper expense bill.
    2. "title": (string, optional) - Title for the expense bill.
    3. "category": (string, optional) - Category for the expense bill.
    4. "description": (string, optional) - Description of the expense bill.
    
    Image and additional details:
    {input}
    `
);

// Define the Zod schema for structured output
const expenseSchema = z.object({
    isExpenseBill: z.boolean().describe("Whether the image is an applicable expense bill it should be false if the image is not an paper expense bill"),
    title: z.string().optional().describe("Title for the expense bill"),
    category: z.string().optional().describe("Category for the expense bill"),
    description: z.string().optional().describe("Description of the expense bill"),
});

// Analyze the image using GPT-4 via LangChain
async function analyzeImage(imageUrl) {
    if (!imageUrl) {
        throw new Error("Image URL is required");
    }

    console.log("Starting analysis of image:", imageUrl);

    try {
        const model = new ChatOpenAI({
            temperature: 0,
            modelName: 'gpt-4-vision-preview',  // Correct model name for GPT-4 Vision
            maxTokens: 1000,
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Fetch and convert the image to base64
        const base64Image = await getImageData(imageUrl);
        console.log("Image data prepared for analysis.");

        // Construct input content combining base64 image and extra details
        const inputContent = new HumanMessage({
            content: [
                {
                    type: 'text',
                    text: `Analyze the provided image and extract the following information, make sure that you don't hallucinate any information, if you are not sure about any information, you can leave it blank. if you are not sure if it is not an image of a paper bill then make the isExpenseBill false`,
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:image/jpeg;base64,${base64Image}`,
                        detail: 'high',
                    },
                },
            ],
        });

        // Add Zod schema validation for structured output
        const llmWithStructuredOutput = model.withStructuredOutput(expenseSchema);

        // Create a tagging chain by piping the prompt with structured output
        const taggingChain = taggingPrompt.pipe(llmWithStructuredOutput);

        // Invoke the model with the image content
        const response = await taggingChain.invoke({ input: inputContent });
        console.log("Response from LLM received:", response);

        if (!response) {
            throw new Error("No response received from the model");
        }

        return response;
    } catch (error) {
        console.error("Error during image analysis:", error);
        throw new Error(`Image analysis failed: ${error.message}`);
    }
}

module.exports = analyzeImage;
