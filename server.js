const express = require('express');
const axios = require('axios');
//const OpenAI = require('openai');

require('dotenv').config();

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

app.post('/api/analyze', async (req, res) => {
  const response = Math.random() < 0.1 ? "yes" : "no";
  res.json({ result: response });
})

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));