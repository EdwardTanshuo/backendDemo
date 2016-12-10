/**
 * Created by richard on 16/12/8.
 */

var pomelo = window.pomelo;
var users;
var username;
var token;
var role;
var roomId;
var base = 1000;
var increase = 25;
var reg = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/;

util = {
    urlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g,
    //  html sanitizer
    toStaticHTML: function(inputHtml) {
        inputHtml = inputHtml.toString();
        return inputHtml.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
    //pads n with zeros on the left,
    //digits is minimum length of output
    //zeroPad(3, 5); returns "005"
    //zeroPad(2, 500); returns "500"
    zeroPad: function(digits, n) {
        n = n.toString();
        while(n.length < digits)
            n = '0' + n;
        return n;
    },
    //it is almost 8 o'clock PM here
    //timeString(new Date); returns "19:49"
    timeString: function(date) {
        var minutes = date.getMinutes().toString();
        var hours = date.getHours().toString();
        return this.zeroPad(2, hours) + ":" + this.zeroPad(2, minutes);
    },

    //does the argument only contain whitespace?
    isBlank: function(text) {
        var blank = /^\s*$/;
        return(text.match(blank) !== null);
    }
};

//always view the most recent message when it is added
function scrollDown(base) {
    window.scrollTo(0, base);
    $("#entry").focus();
};

// add message on board
function addMessage(from, target, text, time) {
    var name = (target == '*' ? 'all' : target);
    if(text === null) return;
    if(time == null) {
        // if the time is null or undefined, use the current time.
        time = new Date();
    } else if((time instanceof Date) === false) {
        // if it's a timestamp, interpret it
        time = new Date(time);
    }
    //every message you see is actually a table with 3 cols:
    //  the time,
    //  the person who caused the event,
    //  and the content
    var messageElement = $(document.createElement("table"));
    messageElement.addClass("message");
    // sanitize
    text = util.toStaticHTML(text);
    var content = '<tr>' +
        '  <td class="date">' + util.timeString(time) + '</td>' +
        '  <td class="nick">' + util.toStaticHTML(from) + ' says to ' + name + ': ' + '</td>' +
        '  <td class="msg-text">' + text + '</td>' +
        '</tr>';
    messageElement.html(content);
    //the log is the stream that we view
    $("#chatHistory").append(messageElement);
    base += increase;
    scrollDown(base);
};

// show tip
function tip(type, name) {
    var tip,title;
    switch(type){
        case 'online':
            tip = name + ' is online now.';
            title = 'Online Notify';
            break;
        case 'offline':
            tip = name + ' is offline now.';
            title = 'Offline Notify';
            break;
        case 'message':
            tip = name + ' is saying now.'
            title = 'Message Notify';
            break;
    }
    var pop=new Pop(title, tip);
};

// init user list
function initGame(data) {
    broadcaster = data.result;
    username = broadcaster.name
};

// add user in user list
function addUser(user) {
    var slElement = $(document.createElement("option"));
    slElement.attr("value", user);
    slElement.text(user);
    $("#usersList").append(slElement);
};

// remove user from user list
function removeUser(user) {
    $("#usersList option").each(
        function() {
            if($(this).val() === user) $(this).remove();
        });
};

// set your name
function setName() {
    $("#name").text(username);
};

// set your room
function setRoom() {
    $("#room").text(roomId);
};

// show error
function showError(content) {
    $("#loginError").text(content);
    $("#loginError").show();
};

// show login panel
function showLogin() {
    $("#loginView").show();
    $("#chatHistory").hide();
    $("#toolbar").hide();
    $("#loginError").hide();
    $("#loginUser").focus();
};

// show chat panel
function showChat() {
    $("#loginView").hide();
    $("#loginError").hide();
    $("#toolbar").show();
    $("entry").focus();
    scrollDown(base);
};

// query connector
function queryEntry(token, callback) {
    var route = 'gate.gateHandler.queryEntry';
    pomelo.init({
        host: window.location.hostname,
        port: 3014,
        log: true
    }, function() {
        pomelo.request(route, {
            token: token
        }, function(data) {
            pomelo.disconnect();
            if(data.code === 500) {
                showError(LOGIN_ERROR);
                return;
            }
            callback(data.host, data.port);
        });
    });
};

$(document).ready(function() {
    //when first time into chat room.
    showLogin();
    $('#token').val(Date.now().toString());

    //wait message from the server.
    pomelo.on('onChat', function(data) {
        addMessage(data.from, data.target, data.msg);
        $("#chatHistory").show();
        if(data.from !== username)
            tip('message', data.from);
    });

    //update user list
    pomelo.on('onAdd', function(data) {
        var user = data.user;
        tip('online', user);
        addUser(user);
    });

    //update user list
    pomelo.on('onLeave', function(data) {
        var user = data.user;
        tip('offline', user);
        removeUser(user);
    });


    //handle disconect message, occours when the client is disconnect with servers
    pomelo.on('disconnect', function(reason) {
        showLogin();
    });

    //deal with login button click.
    $("#login").click(function() {
        roomId = $('#roomId').val();
        token = 'd858bd235c7faf19f5da18a1118788e2';
        roleType = $('#role').val();
        if(roomId.length == 0) {
            showError(LENGTH_ERROR);
            return false;
        }
        if(roleType == 'player'){
            //player entry of connection
            queryEntry(roomId, function(host, port) {
                pomelo.init({
                    host: host,
                    port: port,
                    log: true
                }, function() {
                    pomelo.request("connector.entryHandler.entry", {
                        username: username,
                        token: token,
                        roomId: roomId
                    }, function(data) {
                        if(data.error) {
                            showError(DUPLICATE_ERROR);
                            return;
                        }
                        setName();
                        setRoom();
                        showChat();
                        initUserList(data);
                    });
                });
            });
        }else{
            // broadcaster entry
            pomelo.init({
                host: '127.0.0.1',
                port: 3020,
                log: true
            }, function() {
                pomelo.request("broadcaster.entryHandler.entry", {
                    roomId: roomId
                }, function(data) {
                    console.log(data);
                    if(data.error) {
                        showError(data.error);
                        return;
                    }
                    setName();
                    setRoom();
                    showChat();
                    console.log(data.code);
                    console.log(data.result);
                    //initGame(data);
                })
            })
        }
    });

    //deal with chat mode.
    $("#entry").keypress(function(e) {
        var route = "chat.chatHandler.send";
        var target = $("#usersList").val();
        if(e.keyCode != 13 /* Return */ ) return;
        var msg = $("#entry").attr("value").replace("\n", "");
        if(!util.isBlank(msg)) {
            pomelo.request(route, {
                rid: rid,
                content: msg,
                from: username,
                target: target
            }, function(data) {
                $("#entry").attr("value", ""); // clear the entry field.
                if(target != '*' && target != username) {
                    addMessage(username, target, msg);
                    $("#chatHistory").show();
                }
            });
        }
    });
});