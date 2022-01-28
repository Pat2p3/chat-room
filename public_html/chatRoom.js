$(document).ready(function(){
			var userName = prompt("What's your name?")||"User";
			var socket = io(); //connect to the server that sent this page
			//send intro event on connect
			socket.on('connect', function(){
				socket.emit("intro", userName);
			});
			
			$('#inputText').keypress(function(ev){
					//if key pressed was enter/return
					if(ev.which===13){
						//send message
						socket.emit("message",$(this).val());
						ev.preventDefault(); //if any
						$("#chatLog").append((new Date()).toLocaleTimeString()+", "+userName+": "+$(this).val()+"\n")
						$(this).val(""); //empty the input
					}
			});
			
			//send off a private message event 
			socket.on("privateMessage", function(data){
				var response = prompt("Private Message " + data.username + " -> Me: " + data.message);
				if(response != null){
					var messageData = {username:data.username,message:response};
					socket.emit("privateMessage", messageData);
				}
			});
			
			socket.on("userList",function(data){
				var inernalHtmlToAdd = "";
				for(var i = 0; i < data.length; i++){
					inernalHtmlToAdd += "<li id=li" + i + ">" + data[i] + "</li>";	
				}
				$("#userList").html(inernalHtmlToAdd);
				for(var i = 0; i < data.length; i++){
					$("#li"+i).dblclick(function(e) {
						//if shift doubleclicked then block user that was clicked on
						if(e.shiftKey) {
							//add user to blocklist event
							if(this.innerText != userName){
								$(this).toggleClass("blocked");
								socket.emit("blockUser", {username: this.innerText});
							}
						}else{
							if(this.innerText != userName){
								//someone doubled clicked a person in userList then send private message to server
								var msg = prompt("Enter Private Message");
								var messageData = {username:this.innerText,message:msg};
								var displaymsg = "Private Message Me -> " + this.innerText + ": " + msg;
								socket.emit("privateMessage", messageData);
							}
						}
					});
				}
			});
			
			socket.on("message",function(data){
				$("#chatLog").append(data+"\n");
				$('#chatLog')[0].scrollTop=$('#chatLog')[0].scrollHeight; //scroll to the bottom
			});
		});