const express = require('express');
const app = express();
const server = require('http').Server(app);
const socketIO = require('socket.io')(server);
const os = require('os');
const mysql = require('mysql2');

const dbConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'my-messenger'
});

const port = 3000;

let localNetworkIP;
let usersOnline = [];

//Getting local ip address
const ipAddreses = os.networkInterfaces();
Object.keys(ipAddreses).forEach(key => {
    ipAddreses[key].forEach(ipAddress => {
        if(ipAddress.family === 'IPv4' & ipAddress.internal === false){
            localNetworkIP = ipAddress.address;
        }
    });
});

app.get('/', (erq, res)=>{
    res.status(200).type('text/html');
    res.send('<title>My first socket server</title><h1>Сокет сервер</h1>')
});

server.listen(port);

showCurrentData();

socketIO.on('connection', function (socket) {
    usersOnline.push({
        id: -1,
        socketID: socket.id
    });
    

    //Log in
    socket.on('auth', (data) => {
        if(typeof data.login == 'string' & data.login.length > 4){
            if(typeof data.password == 'string' & data.password.length > 7){
                dbConnection.execute(`select id_user, name, fname
                                      from user
                                      where login like '${data.login}'
                                            password like '${data.password}'`,
                (err, res)=>{
                    if(err != null){
                        socketIO.sockets.emit('auth', {
                            status: error,
                            message: 'Произошла ошибка при попытке получить данные из базы данных. Пожалуйста, повторите попытку.'
                        });
                    }
                    else{
                        if(err == null & res == ''){
                            socketIO.sockets.emit('auth', {
                                status: error,
                                message: 'Пользователь с таким логином и паролем не записан в базе данных. Пожалуйста проверьте указанные Вами логин и пароль.'
                            });
                        }
                        else{
                            usersOnline.find(userInArray => {
                                if(userInArray.socketID == socket.id){
                                    userInArray.id = res.id_user
                                }
                            });

                            socketIO.sockets.emit('auth', {
                                status: 'ok',
                                data: res
                            });
                        }
                    }
                });
            }
            else{
                socketIO.sockets.emit('auth', {
                    status: error,
                    message: 'Указанный пароль не соответствует формату'
                });
            }
        }
        else{
            socketIO.sockets.emit('auth', {
                status: error,
                message: 'Указанный логин не соответствует формату'
            });
        }
    });

    //Sign up
    socket.on('reg', (data)=>{
        if(data & typeof data == "object"){
            if(typeof data.name == 'string' & data.name.length > 0){
                if(typeof data.famname == 'string' & data.famname.length > 0){
                    if(typeof data.password == 'string' & data.password.length > 7){
                        if(typeof data.login == 'string' & data.login.length > 4){
                            dbConnection.execute(`select login
                                                  from user
                                                  where login like '${data.login}'`,
                            (err, res)=>{
                                if(err != null){
                                    socketIO.sockets.emit('reg', {
                                        status: 'error',
                                        message: 'При проверке вашего логина на совпадение в базе данных, произошла ошибка. Пожалуйста, повторите попытку.'
                                    });
                                }
                                else{
                                    if(err == null & res == ''){
                                        dbConnection.execute(`insert into user
                                                              (name, famname, password, login)
                                                              values ('${data.name}', '${data.famname}', '${data.password}' ,'${data.login}')`,
                                        (err, res)=>{
                                            if(err != null){
                                                socketIO.sockets.emit('reg', {
                                                    status: 'error',
                                                    message: 'При записи данных в базу данных, произошла ошибка. Пожалуйста, повторите попытку.'
                                                });
                                            }
                                            else{
                                                socketIO.sockets.emit('reg', {
                                                    status: 'ok',
                                                    message: 'Вы были успешно зарегистрированы!'
                                                });
                                            }
                                        });
                                    }
                                    else{
                                        socketIO.sockets.emit('reg', {
                                            status: 'error',
                                            message: 'Пользователь с таким логином уже существует. Попробуйте указать другой логин.'
                                        });
                                    }
                                }
                            });
                        }
                        else{
                            socketIO.sockets.emit('reg', {
                                status: 'error',
                                message: 'Указанный вами логин не соответствует формату.'
                            });
                        }
                    }
                    else{
                        socketIO.sockets.emit('reg', {
                            status: 'error',
                            message: 'Указанный вами пароль не соответствует формату.'
                        });
                    }       
                }
                else{
                    socketIO.sockets.emit('reg', {
                        status: 'error',
                        message: 'Указанная вами фамилия не соответствует формату.'
                    });
                }
            }
            else{
                socketIO.sockets.emit('reg', {
                    status: 'error',
                    message: 'Указанное вами имя не соответствует формату.'
                });
            }
        }
        else{
            socketIO.sockets.emit('reg', {
                status: 'error',
                message: 'При регистрации произошла ошибка. Пожалуйста повторите попытку.'
            });
        }
    });

    //Log out
    socket.on('logout', (data)=>{
        let isClientInOnlineList = false;
        usersOnline.find(userInArray => {
            if(userInArray.socketID == socket.id){
                isClientInOnlineList = true;

                if(userInArray.id == -1){
                    socketIO.sockets.emit('logout', {
                        status: 'error',
                        message: 'Вы не были авторизованы ранее.'
                    });
                }
                else{
                    userInArray.id = -1;

                    socketIO.sockets.emit('logout', {
                        status: 'ok',
                    });
                }
            }

            if(!isClientInOnlineList){
                socketIO.sockets.emit('logout', {
                    status: 'error',
                    message: 'Ошибка подключения. Пожалуйста, перезагрузите страницу.'
                });
            }
        });
    });

    //User search
    socket.on('searchUser', (data)=>{

    });



    //Create chat
    socket.on('createChat', (data)=>{

    });

    //Edit chat
    socket.on('editChat', (data)=>{

    });

    //Delete chat
    socket.on('deleteChat', (data)=>{

    });

    //Show chat list
    socket.on('chatList', (data)=>{

    });

    //Show chat info
    socket.on('chatInfo', (data)=>{

    });



    //Sending message
    socket.on('sendMessage', (data)=>{

    });

    //Show message
    socket.on('getMessage', (data)=>{

    });

    socket.on('showUserList', () => {
        dbConnection.execute('SELECT * FROM user', (err, res)=>{
            if(err){
                socketIO.sockets.emit('showUserList', {
                    status: 'error',
                    error: err
                });
            }
            else{
                socketIO.sockets.emit('showUserList', {
                    status: 'ok',
                    data: usersOnline,
                    dataFromDB: res
                });
            }
        });
    });

    socket.on('disconnect', function(){
        usersOnline.find((user, i) => {
            if(user){
                if(user.socketID == socket.id){
                    usersOnline.splice(i, 1);
                    showCurrentData();
                }
            }
        });
    });

    showCurrentData();
});

function showCurrentData(){
    console.clear();

    console.log('Server has been started on ws://localhost:'+port);
    console.log('Or in local network ws://'+localNetworkIP+':'+port);

    console.log('\r\nNow online: '+usersOnline.length+'\r\n...')
}