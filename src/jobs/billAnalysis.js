const Tesseract = require('tesseract.js');
const Expense = require('../modules/expense/expenseModel');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { ChatOpenAI } = require('@langchain/openai');
const { z } = require('zod');
const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log(process.env.test,'OpenAI API key', OPENAI_API_KEY);
if (!OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key. Please set OPENAI_API_KEY in your .env file.');
}

const taggingPrompt = ChatPromptTemplate.fromTemplate(
  `Extract the desired information from the following passage.
  
  Only extract the properties mentioned in the 'Classification' function.
  
  Passage:
  {input}
  `
);

const classificationSchema = z.object({
  authenticity: z
    .number()
    .int()
    .min(0)
    .max(10)
    .describe("Evaluates the legitimacy of the bill. This score could be determined by checking for common signs of tampering, the presence of a recognizable vendor logo, date formatting, etc."),
  accuracy: z
    .number()
    .int()
    .min(0)
    .max(10)
    .describe("Measures how accurately the expense details match the company's reimbursement policy. This can include verifying amounts, dates, and the nature of the expense."),
  compliance: z
    .number()
    .int()
    .min(0)
    .max(10)
    .describe("Assesses how well the expense adheres to company policies and guidelines. Factors may include spending limits, approved vendors, and relevant categories."),
  completeness: z
    .number()
    .int()
    .min(0)
    .max(10)
    .describe("Ensures that all required information is present and correctly filled out on the bill. Missing information or illegible entries could lower this score."),
  relevance: z
    .number()
    .int()
    .min(0)
    .max(10)
    .describe("Evaluates how relevant the expense is to the employee's job function and current projects. Non-relevant expenses might score lower."),
});

// LLM
const llm = new ChatOpenAI({
  temperature: 0,
  model: 'gpt-3.5-turbo-0125',
  apiKey: OPENAI_API_KEY,
});

const llmWithStructuredOutput = llm.withStructuredOutput(classificationSchema, {
  name: 'extractor',
});

const taggingChain = taggingPrompt.pipe(llmWithStructuredOutput);

async function createWorker() {
  return await Tesseract.createWorker('eng');
}

async function getExpenseWithoutAIScore(id) {
  return await Expense.findOne({ _id: id, aiScore: { $exists: false } });
}

async function downloadImage(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    return buffer;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

async function processImage(worker, imageUrl) {
  try {
    console.log('Processing image URL:', imageUrl ? imageUrl.substring(0, 100) + '...' : 'undefined');
    let imageData;
    
    if (imageUrl.startsWith('data:')) {
      console.log('Handling data URL...');
      imageData = imageUrl;
    } else {
      console.log('Downloading image from URL...');
      const buffer = await downloadImage(imageUrl);
      imageData = buffer;
    }

    console.log('Image data prepared, starting recognition...');
    const result = await worker.recognize(imageData);
    console.log('Recognition completed');
    return result;
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

async function runOCR(id) {
  let worker = null;
  try {
    const expense = await getExpenseWithoutAIScore(id);
    if (!expense) {
      console.log('No expense without AI score found for the given ID.');
      return;
    }

    if (!expense.image || expense.image.length === 0) {
      console.log('Expense does not have an image.');
      return;
    }

    worker = await createWorker();
    let ocrText = '';
    expense.documentOcrText = [];

    console.log('Starting OCR for expense:', expense._id);
    
    // Process each image in the array
    for (let i = 0; i < expense.image.length; i++) {
      try {
        const result = await processImage(worker, expense.image[i]);
        if (result && result.data && result.data.text) {
          console.log(`Recognition result for expense ${expense._id}, image ${i + 1}:`, result.data.text);
          expense.documentOcrText[i] = result.data.text;
        } else {
          console.log(`No text extracted from image ${i + 1}`);
          expense.documentOcrText[i] = '';
        }
      } catch (error) {
        console.error(`Error processing image ${i + 1}:`, error);
        expense.documentOcrText[i] = '';
        continue; // Continue with next image if one fails
      }
    }

    ocrText = expense.documentOcrText.filter(text => text).join(' - next image - ');

    if (ocrText.trim()) {
      const input = `This is a reimbursement expense. The name of the expense is ${expense.title}, the amount is ${expense.amount}, the date is ${expense.date}, the time is ${expense.time}, the category is ${expense.category}, the description is ${expense.description}, and the ocr data in the image is ${ocrText}. With maximum scrutiny based on the data in the image find the scores for authenticity, accuracy, compliance, completeness, and relevance of the expense. Strictly If the ocr data in the image does not represent any type of bill then the scores should be 0.`;

      const classificationResult = await taggingChain.invoke({ input });
      expense.aiScores = classificationResult;
    } else {
      console.log('No text was extracted from any of the images');
      expense.aiScores = {
        authenticity: 0,
        accuracy: 0,
        compliance: 0,
        completeness: 0,
        relevance: 0
      };
    }

    await expense.save();
    console.log('Processed values', expense.aiScores);

  } catch (err) {
    console.error('Error in runOCR function:', err);
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (error) {
        console.error('Error terminating worker:', error);
      }
    }
  }
}

//test//
module.exports = runOCR;
