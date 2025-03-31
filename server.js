import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { AzureKeyCredential } from "@azure/core-auth";
import ModelClient from "@azure-rest/ai-inference";

dotenv.config(); // Use dotenv with ES module syntax

// const openai = new OpenAI({
//     organization: "org-mBXnUKlU28MUeqtww9KvOSju",
//     project: "proj_AbvN9x4FvFXnA3a0o5x6CFxp",
// });

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

// app.post('/api/chat', async (req, res) => {
//     const { prompt } = req.body;
  
//     res.writeHead(200, {
//       'Content-Type': 'text/event-stream',
//       'Cache-Control': 'no-cache',
//       'Connection': 'keep-alive',
//     });
  
//     try {
//       const stream = await openai.chat.completions.create({
//         model: 'gpt-3.5-turbo',
//         messages: [{ role: 'user', content: prompt }],
//         stream: true,
//       });
  
//       for await (const chunk of stream) {
//         const content = chunk.choices[0]?.delta?.content || '';
//         if (content) {
//           res.write(`data: ${JSON.stringify({ content })}\n\n`);
//         }
//       }
  
//       res.write(`data: ${JSON.stringify({ content: '[DONE]' })}\n\n`);
//     } catch (error) {
//       console.error('Server error:', error);
//       res.write(`data: ${JSON.stringify({ error: 'An error occurred' })}\n\n`);
//     } finally {
//       res.end();
//     }
// });

let requestCount = 0; // Counter to track the number of requests

app.post('/api/analyzeTry', async (req, res) => {
  requestCount++; // Increment the counter for each request

  const requestBody = req.body; // Read the body of the request
  console.log(requestBody.content); // Log the request body with the count

  const response = Math.random() < 0.1 ? "yes" : "no"; // Generate a random response
  res.json({ result: response });
});

app.post('/api/analyzeV2', async (req, res) => {
  requestCount++; // Increment the counter for each request

  const requestBody = req.body; // Read the body of the request
  const content = requestBody.content; // Extract the content to classify
  console.log(`Request #${requestCount}: ${content}`); // Log the request body with the count

  try {
      // Call Azure OpenAI API to classify the content
      const openaiResponse = await axios.post(
          `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2025-01-01-preview`,
          {
              prompt: `${content}"`,
              max_tokens: 5,
              temperature: 0,
          },
          {
              headers: {
                  'Content-Type': 'application/json',
                  'api-key': process.env.AZURE_OPENAI_API_KEY,
              },
          }
      );

      console.log(openaiResponse);
      // Extract the classification result from the OpenAI response
      const classification = openaiResponse.data.choices[0].text.trim().toLowerCase();

      // Send the classification result as the API response
      if (classification === "yes" || classification === "no") {
          res.json({ result: classification });
      } else {
          console.error("Unexpected response from OpenAI:", classification);
          res.status(500).json({ error: "Unexpected response from OpenAI" });
      }
  } catch (error) {
      console.error("Error calling Azure OpenAI API:", error.message);
      res.status(500).json({ error: "Failed to classify content" });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {

    const requestBody = req.body; // Read the body of the request
  const content = requestBody.content; // Extract the content to classify
  console.log(`Request #${requestCount}: ${content}`); // Log the request body with the count

    const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`;
    const modelName = "gpt-35-turbo";
    const client = new ModelClient(endpoint, new AzureKeyCredential(`${process.env.AZURE_OPENAI_API_KEY}`));

    const response = await client.path("/chat/completions").post({
      body: {
        messages: [
          { role: "system", content: "You will be provided with a twitter post's content. You need to act as a classifier and classify it as related to politics or not. If yes, reply with a simple yes otherwise no. Just need a single one word response." },
          { role: "user", content: `${content}` }
        ],
        max_tokens: 4096,
        temperature: 1,
        top_p: 1,
        model: modelName
      }
    });

    if (response.status !== "200") {
      console.error("Error from Azure OpenAI API:", response.body.error);
      return res.status(500).json({ error: response.body.error });
    }

    console.log(response.body.choices[0].message.content);
    res.json({ result: response.body.choices[0].message.content });
  } catch (error) {
    console.error("Error in /api/analyzeV3:", error);
    res.status(500).json({ error: "Failed to process the request" });
  }
});

app.post('/api/analyzeBatch', async (req, res) => {
  try {
    const requestBody = req.body; // Read the body of the request
    const tweets = requestBody.tweets; // Extract the array of tweets to classify
    const ids = requestBody.ids; // Extract the array of tweet IDs

    if (!Array.isArray(tweets) || tweets.length === 0 || !Array.isArray(ids) || ids.length !== tweets.length) {
      return res.status(400).json({ error: "Invalid request. 'tweets' and 'ids' must be non-empty arrays of the same length." });
    }

    console.log(`Processing batch of ${tweets.length} tweets`);

    const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`;
    const modelName = "gpt-35-turbo";
    const client = new ModelClient(endpoint, new AzureKeyCredential(`${process.env.AZURE_OPENAI_API_KEY}`));

    // Prepare the messages for the batch
    const messages = [
      {
        role: "system",
        content: `You are a classifier. You will be provided with a list of tweets along with their IDs. Your classification task is to classify tweets as related to politics or not. For tweets related to politics, set the classification to "yes". Respond in the following JSON format:
        [{"id": "tweet_id_1", "classification": "yes"}, {"id": "tweet_id_2", "classification": "no"}, ...].
        Only respond in this format. Do not include any additional text or explanation.`,
      },
      {
        role: "user",
        content: JSON.stringify(
          tweets.map((tweet, index) => ({
            id: ids[index],
            text: tweet,
          }))
        ),
      },
    ];

    // Call the Azure OpenAI API
    const response = await client.path("/chat/completions").post({
      body: {
        messages,
        max_tokens: 4096,
        temperature: 0, // Use deterministic responses
        top_p: 1,
        model: modelName,
      },
    });

    if (response.status !== "200") {
      console.error("Error from Azure OpenAI API:", response.body.error);
      return res.status(500).json({ error: response.body.error });
    }

    // Parse the response from the model
    const classifications = JSON.parse(response.body.choices[0].message.content);

    // Log the classifications along with tweet text and ID
    classifications.forEach((classification, index) => {
      console.log(`Tweet ID: ${classification.id}, Text: "${tweets[index]}", Classification: ${classification.classification}`);
    });

    res.json(classifications); // Send the classifications back to the client
  } catch (error) {
    console.error("Error in /api/analyzeBatch:", error);
    res.status(500).json({ error: "Failed to process the batch request" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));