/**
 * Created by richard on 16/12/8.
 */

var pomelo = window.pomelo;
var users;
var curName;
var token;
var role;
var roomId;
var target= '*';
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
function addMessage(text, time) {
    var name = 'all';
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
    //text = util.toStaticHTML(text);
    var content = '<tr>' +
        '  <td class="date">' + util.timeString(time) + '</td>' +
        '  <td class="nick"> 系统 ：</td>' +
        '  <td class="msg-text">' + text + '</td>' +
        '</tr>';
    messageElement.html(content);
    //the log is the stream that we view
    $("#chatHistory").append(messageElement);
    base += increase;
    scrollDown(base);
};

// show tip
function tip(msg) {
    addMessage(msg);
    $("#chatHistory").show();
    var pop=new Pop('系统消息', msg);
};

// init user list
function initGame(broadcaster) {
    curName = broadcaster.name;
    //if(users){
    //    for(var i = 0; i < users.length; i++) {
    //        var slElement = $(document.createElement("option"));
    //        slElement.attr("value", users[i]);
    //        slElement.text(users[i]);
    //        $("#usersList").append(slElement);
    //    }
    //}
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
    $("#name").text(curName);
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
        host: 122.112.227.196,
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
    pomelo.on('PlayerEnterEvent', function(data) {
        console.log(data);
        var role = data
        var msg = '玩家：'+role.name+'进入了游戏！'
        tip(msg);
    });

    //update user list
    pomelo.on('DealerEnterEvent', function(data) {
        console.log(data);
        var role = data
        var msg = '玩家：'+role.name+'离开了游戏！';
        tip(msg);
    });

    pomelo.on('GameStartEvent', function(data) {
        console.log(data);
        tip('游戏开始，玩家抽牌阶段');
    });

    pomelo.on('BetStartEvent', function(data) {
        console.log('-----BetStartEvent')
        console.log(data.dealer);
        tip('开始下注，等待玩家下注');
    });

    pomelo.on('EndPlayerEvent', function(data) {
        console.log(data);
        tip('玩家抽牌结束，主播抽牌阶段');
    });

    pomelo.on('DealerGetCardEvent', function(data) {
        console.log(data);
        tip('主播抽了1张卡牌');
    });

    pomelo.on('GameResultEvent', function(data) {
        console.log(data);
        tip('该回合结束，返回当前玩家的结果');
    });

    pomelo.on('DealerFinishEvent', function(data) {
        console.log(data);
        tip('主播抽牌结束，开始计算游戏结果');
    });

    //update user list
    pomelo.on('onLeave', function(data) {
        var user = data.result.user;
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
            queryEntry(token, function(host, port) {
                pomelo.init({
                    host: host,
                    port: port,
                    log: true
                }, function() {
                    pomelo.request("connector.entryHandler.entry", {
                        token: token,
                        room: roomId
                    }, function(data) {
                        console.log(data);
                        if(data.error) {
                            showError(data.error);
                            return;
                        }
                        console.log(data.result);

                        initGame(data.result);
                        setName();
                        setRoom();
                        showChat();
                        addMessage('玩家你好，欢迎进入游戏');
                        $("#chatHistory").show();
                    });
                });
            });
        }
    });

    $("#playerBet").click(function() {
        //roomId = $('#roomId').val();
        token = 'd858bd235c7faf19f5da18a1118788e2';
        roleType = $('#role').val();
        if(roomId.length == 0) {
            showError(LENGTH_ERROR);
            return false;
        }
        pomelo.request("connector.roleHandler.bet", {
            bet: 50
        }, function(data) {
            console.log(data);
            if(data.error) {
                showError(data.error);
                return;
            }
            bet = data.result.player_bet;
            addMessage('你下注了:'+bet);
            $("#chatHistory").show();
        })
    });

    $("#playerBet2").click(function() {
        //roomId = $('#roomId').val();
        token = 'd858bd235c7faf19f5da18a1118788e2';
        roleType = $('#role').val();
        if(roomId.length == 0) {
            showError(LENGTH_ERROR);
            return false;
        }
        pomelo.request("connector.roleHandler.bet", {
            bet: 0
        }, function(data) {
            console.log(data);
            if(data.error) {
                showError(data.error);
                return;
            }
            bet = data.result.quantity;
            addMessage('你下注了:'+bet);
            $("#chatHistory").show();
        })
    });

    $("#playerDraw").click(function() {
        //roomId = $('#roomId').val();
        token = 'd858bd235c7faf19f5da18a1118788e2';
        roleType = $('#role').val();
        if(roomId.length == 0) {
            showError(LENGTH_ERROR);
            return false;
        }
        pomelo.request("connector.roleHandler.draw", {
            roomId: roomId
        }, function(data) {
            console.log(data);
            if(data.error) {
                showError(data.error);
                return;
            }
            addMessage('你抽到一张卡牌' + JSON.stringify(data.card));
            $("#chatHistory").show();
        })
    });

});