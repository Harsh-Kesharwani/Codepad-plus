const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');
const axios = require('axios');
const nodemailer = require('nodemailer')

const server = http.createServer(app);
const io = new Server(server);

require('dotenv').config();

app.use(express.json());

function getPrompt(name, email, review) {
    const prompt = `
        You are a customer service AI assistant.
        Your task is to send an email reply to a valued customer ${name} whose email id is ${email}.
        Given the customer email delimited by triple backticks, \
        Generate a reply to thank the customer for their review.
        If the review is positive or neutral, thank them for \
        their review.
        If the review is negative, apologize and suggest that \
        they can reach out to customer service. 
        Make sure to use specific details from the review.
        Write in a concise and professional tone.
        Sign the email as 'AI customer agent'.

        Format email in standard format.

        Customer review: \`\`\`${review}\`\`\`
        `;
    return prompt;
}

app.post('/generate-content', (req, res) => {
    try {
      const { name, email, review } = req.body;
      // Make a POST request to the Google Cloud Natural Language API
     axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      {
        "contents": [
          {
            "parts": [
              {
                "text": getPrompt(name, email, review)
              }
            ]
          }
        ]
      },
      {
        params: {
          key: `${process.env.GEMINI_API_KEY}`
        },
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then((response) => {
        const llmResponse = response.data.candidates[0].content.parts[0].text;
        // API request successful, do something with the response
        const transporter = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
              user: process.env.EMAIL,
              pass: process.env.EMAIL_PASSWORD
          }
        });

        // Define email options
        const mailOptions = {
          from: process.env.EMAIL,
          to: email,
          subject: 'Thank You for Your Valuable Review',
          text: llmResponse
        };

        // Send email
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              console.error('Error sending email:', error);
          } else {
              console.log('Email sent:', info.response);
          }
        });
      })
    } catch (error) {
      // If an error occurs during the request, send an error response to the client
      console.error('Error:', error.response.data);
      res.status(error.response.status).json({ error: 'An error occurred while processing your request.' });
    }
});

app.use(express.static('build'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};
const streamMap={};
function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
                stream: streamMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });
     
    socket.on(ACTIONS.OUTPUT,({ roomId, details})=>{
        socket.in(roomId).emit(ACTIONS.SET_OUTPUT, { details: details });
    });

    socket.on(ACTIONS.LANGUAGE,({ roomId, language })=>{
        socket.in(roomId).emit(ACTIONS.SET_LANGUAGE,{ lang: language });
    });

    socket.on(ACTIONS.CUSTOM_INPUT,({ roomId, input})=>{
        socket.in(roomId).emit(ACTIONS.CUSTOM_INPUT,{input: input});
    });
    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });

});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
});
