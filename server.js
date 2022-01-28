/*SocketIO based chat room. Extended to not echo messages
to the client that sent them.*/

var http = require('http').createServer(handler);
var io = require('socket.io')(http);
var fs = require('fs');
var url = require('url');
var mime = require('mime-types');
const ROOT = "./public_html";

http.listen(2406);

var clients = [];

console.log("Chat server listening on port 2406");

function handler(req,res){
	
	var urlObj = url.parse(req.url,true);
	//file name is path that is requested with file 
	var filename = ROOT+urlObj.pathname;

	//static route
	if(fs.existsSync(filename)){		
		var stats = fs.statSync(filename);
		// return index.html on requested directory
		if(stats.isDirectory()){
			filename += "index.html";
		}
		console.log("Getting file: "+filename);
		data = fs.readFileSync(filename);
		code = 200;
		respond(code, data);
	}else{
		//404 file not found
		console.log("File not found: "+filename);
		code = 404;
		data = fs.readFileSync(ROOT+"/404.html");
		res.writeHead(code, {'content-type': 'text/html'});
		res.end(data);
	}
	//sends off the response message
	function respond(code, data){
		res.writeHead(code, {'content-type': mime.lookup(filename)|| 'text/html'});
		res.end(data);
	}
};

//user connects and is appended to user list
io.on("connection", function(socket){
	console.log("Got a connection");
	socket.on("intro",function(data){
		socket.username = data;
		clients.push(socket);
		socket.broadcast.emit("message", timestamp()+": "+socket.username+" has entered the chatroom.");
		io.emit("userList", getUserList() );
		socket.emit("message","Welcome, "+socket.username+".");
		socket.blockedUsers = [];
	});
		
	//toggles blocked user in current socket. adds or removes from socket.blockedUsers which is an array
	socket.on("blockUser", function(data){
		var unameToBlock = data.username;
		
		var inList = false;
		for(var i = 0; i < socket.blockedUsers.length && inList == false; i++){
			//if in block list remove
			if(inBlockList(socket, unameToBlock) == true){
				inList = true;
				//remove
				var index = socket.blockedUsers.indexOf(unameToBlock);
				if (index > -1) {
					socket.blockedUsers.splice(index, 1);
					socket.emit("message","User " + unameToBlock + " was unblocked.");
				}
			}
		}
		// if user is not already in blocklist add user.
		if(inList == false){
			socket.blockedUsers.push(unameToBlock);
			socket.emit("message","User " + unameToBlock + " was blocked.");
		}
		
	});
		
	//send off private message to proper user
	socket.on("privateMessage", function(data){
		var user = data.username;
		if(socket.username != user){
			//get the socket for the user receiving the message
			var sock = getSockFromUser(user);
			if(sock != null){
				//if the sender is not in a blocklist for the receiver send msg
				if(inBlockList(sock, socket.username) == false){
					data.username = socket.username;
					sock.emit("privateMessage", data);
				}
			}
		}
		
	});
		
	socket.on("message", function(data){
		console.log("got message: "+data);
		var sender = socket.username;
		//walk through whole clients array and send message to those who did not block the sender
		for(var i = 0; i < clients.length; i++){
			if(sender != clients[i].username && inBlockList(clients[i], sender) == false){
				clients[i].emit("message",timestamp()+", "+socket.username+": "+data);
			}
		}
	});
	
	//remove the discconected user from clients array on disconnect
	socket.on("disconnect", function(){
		console.log(socket.username+" disconnected");
		
		clients = clients.filter(function(ele){  
			   return ele!==socket;
		});
		//update userlist for all clients and notify all users of disconnected user
		io.emit("userList", getUserList() );
		io.emit("message", timestamp()+": "+socket.username+" disconnected.");
	});
	
});

//return true if sender is inside the clients blockList. Return false otherwise
function inBlockList(client, sender){
	for(var i = 0; i < client.blockedUsers.length; i++){
		if(client.blockedUsers[i] == sender){
			return true;
		}
	}
	return false;
}

//get the associated socket from a user's name. Return null if can not find
function getSockFromUser(user){
	for(var i = 0; i < clients.length; i++){
		if(clients[i].username === user){
			return clients[i];
		}
	}
	return null;
}

//return a array of all connected users
function getUserList(){
    var ret = [];
    for(var i=0;i<clients.length; i++){
        ret.push(clients[i].username);
    }
    return ret;
}

function timestamp(){
	return new Date().toLocaleTimeString();
}