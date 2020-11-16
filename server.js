const path = require('path'); 
const http = require('http');
const express =  require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const {userJoin, getCurrentUseer, userLeave, getRoomUsers} = require('./utils/users');

const app = express();
const server = http.createServer(app);   //express use this HTTP module by default under the hood. but to use SOCKET.IO we need to access http directly.
const io = socketio(server);                        



//set static folder
app.use(express.static(path.join(__dirname, 'public'))); 


const botName = 'Chat Bot';
//run when a client connects
io.on('connection', socket => {             //.on listen for events and in this case the event is connection
    //console.log('new ws connection');
    socket.on('joinRoom', ({username, room}) => {
        const user = userJoin(socket.id, username, room);
        socket.join(user.room);

        //welcome current user
        socket.emit('message', formatMessage(botName,'Welcome to catbox'));   //to single client

        //broadcast when a user connects 
        socket.broadcast.to(user.room).emit('message',  formatMessage(botName, user.username+' has joined'));    //to all the client except who is connection 
        
        //send user and room info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });
   
    //listen for chat message
    socket.on('chatMessage', (msg) => {
        const user = getCurrentUseer(socket.id);
        io.to(user.room).emit('message', formatMessage(user.username, msg));
    });

    //runs when client disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);
        if (user) {
            io.to(user.room).emit('message', formatMessage(botName, user.username+' has left the chat'));  //to everyone

            //send user and room info
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            })
        }
    });
});



const PORT = process.env.port || 3000;
server.listen(PORT, () => console.log("Running"));