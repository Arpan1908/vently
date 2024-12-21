// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();
// const port = 5000;

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Query function to call Hugging Face API
// async function query(data) {
//   const response = await fetch(
//     'https://api-inference.huggingface.co/models/google/flan-t5-base',
//     {
//       headers: {
//         Authorization: `Bearer ${process.env.HF_API_KEY}`,
//         'Content-Type': 'application/json',
//       },
//       method: 'POST',
//       body: JSON.stringify(data),
//     }
//   );

//   const result = await response.json();
//   AIzaSyD7oqBFDTx3nW1_hF5CAx5iXBdnZBkklGI
//   return result;
// } AIzaSyDaPZqxLEU_qgfqIgV47mE-WU7Xmcgks-Y

// // Define the /chat route
// app.post('/api/chat', async (req, res) => {
//   const { message } = req.body;

//   try {
//     const data = { inputs: message };
//     const result = await query(data);

//     const aiResponse = result[0]?.generated_text || 'Sorry, I could not generate a response.';
//     res.json({ reply: aiResponse });
//   } catch (error) {
//     console.error('Error generating response:', error);
//     res.status(500).send('Error generating AI response');
//   }
// });

// // Start the server
// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });



// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();
// const { GoogleGenerativeAI } = require('@google/generative-ai');

// const app = express();
// const port = 5000;

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Initialize Gemini model
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// // Define the /chat route
// app.post('/api/chat', async (req, res) => {
//   const { message } = req.body;

//   try {
//     const result = await model.generateContent(message);
//     const aiResponse = result.response.text();

//     res.json({ reply: aiResponse });
//   } catch (error) {
//     console.error('Error generating response:', error);
//     res.status(500).send('Error generating AI response');
//   }
// });

// // Start the server
// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });




const { CartesiaClient } = require("@cartesia/cartesia-js");
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createUser, getUserByEmail } = require('./models/User');
const fs = require('fs');
const { spawn } = require('child_process');
const process = require('process');

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Initialize Cartesia client
const cartesiaClient = new CartesiaClient({ apiKey: process.env.CARTESIA_API_KEY });

// ----------------- AUTH ROUTES -----------------

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(email, hashedPassword);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await getUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'User not found' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Signed in successfully', token });
  } catch (error) {
    console.error('Error signing in:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

// ----------------- CHAT ROUTE WITH TTS -----------------

app.post('/', async (req, res) => {
  const { message } = req.body;

  const prompt = `
  You are a compassionate and empathetic Gen-Z therapist. Your goal is to provide thoughtful, supportive, and insightful responses to help the user work through their thoughts and feelings.
  Respond with kindness, understanding, and guidance, using Gen-Z slang to keep them comfortable. Avoid repetitive words.Learn from human interaction.Keep the conversation in 3 to 4 lines.
  
  User: "${message}"
  Therapist:
  `;

  try {
      // Generate AI response (text)
      const result = await model.generateContent(prompt);
      const aiResponse = result.response.text();

      // Generate voice using Cartesia TTS (raw PCM f32le)
      const audioBuffer = await cartesiaClient.tts.bytes({
      modelId: "sonic",
      transcript: aiResponse,
      voice: {
        mode: "id",
        id: "694f9389-aac1-45b6-b726-9d9369183238"
      },
      language: "en",
      emotion:["positivity,curiosity"],
      outputFormat: {
        container: "wav",  // Changed to WAV format
        encoding: "pcm_s16le",  // Changed to 16-bit PCM
        sampleRate: 44100
      }
    });

    const buffer = Buffer.from(audioBuffer);

    // Set the headers for WAV audio
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': buffer.length,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache'
    });

    // Send the audio buffer
    res.send(buffer);
  } catch (error) {
    console.error('Error generating audio:', error);
    res.status(500).json({ error: 'Failed to generate audio' });
  }
});
// ----------------- SERVER START -----------------

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
