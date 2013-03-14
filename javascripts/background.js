/*global $, define*/
(function (window, undefined) {
    require.config({
        baseUrl : '../javascripts/'
    });

    require(['LoginHelper', 'BackendSocket'], function (LoginHelper, BackendSocket) {
        var document = window.document;
        var chrome = window.chrome;
        var alert = window.alert;
        var WebSocket = window.WebSocket;

        var num = 0;
        var tpl = "<div class=\"snapPea-pop\"><div class=\"icon saving\"></div><p class=\"saving\">Saving photo to your phone...</p></div>";
        var clickHandler = function (data) {
            function savePhoto(){
                num++;
                chrome.tabs.executeScript(null,
                    {
                        code:"$('.snapPea-pop').remove();$('body').append($('"+tpl+"').addClass('snapPeaid"+num+"'));$('.snapPeaid"+num+"').slideDown();"
                    }
                );

                $.ajax({
                    url : LoginHelper.getServerURL() + '/api/v1/directive/photos/download',
                    xhrFields: {
                        withCredentials : true
                    },
                    data : {
                        url : data.srcUrl
                    },
                    timeout : 1000 * 5,
                    success : function () {
                        chrome.tabs.executeScript(null,
                            {
                                code:"$('.snapPeaid"+num+" p').removeClass('saving').addClass('savedone').text('Photo saved.');$('.snapPeaid"+num+" .icon').removeClass('saving').addClass('savedone');setTimeout(function(){$('.snapPea-pop').remove();},1000);"
                            }
                        );
                    },
                    error : function () {
                        chrome.tabs.executeScript(null,
                            {
                                code:"$('.snapPeaid"+num+" p').removeClass('saving').addClass('savefailed').text('Photo save failed.');$('.snapPeaid"+num+" .icon').removeClass('saving').addClass('savefailed');setTimeout(function(){$('.snapPea-pop').remove();},1000);"
                            }
                        );
                    }
                });
            };

            //如果未登录，则弹窗
            var isOurWin = false;
            if(!LoginHelper.getAuthCode()){
                var top = window.screen.availHeight/2-300;
                var left = window.screen.availWidth/2-200;
                isOurWin = true;
                chrome.windows.create({
                    url:'../pages/popup.html',
                    width: 255,
                    height: 340,
                    top:top,
                    left:left,
                    focused:true,
                    type:"panel"
                },function(){
                    chrome.windows.onRemoved.addListener(function(){
                        if(isOurWin){
                          setTimeout(savePhoto,100);
                          isOurWin = false; 
                        };
                    });
                });
            }else{
                savePhoto();
            };

        };

        // chrome.contextMenus.create({
        //     type : 'normal',
        //     id : 'temp',
        //     title : 'Save to phone',
        //     contexts : ['image'],
        //     onclick : clickHandler
        // });

        var isLogin = false;
        var photos = [];

        //当前拖拽的图片base64信息
        var base64 = {};

        //websocket通知图片改变
        // var handler = function (msg) {
        //     if (msg.type === 'photos.add') {
        //         _.each(msg.data, function (item) {
        //             $.ajax({
        //                 url : LoginHelper.getServerURL() + '/api/v1/resource/photos/' + item,
        //                 xhrFields: {
        //                     withCredentials : true
        //                 },
        //                 success : function (resp) {
        //                     photos.unshift(resp);
        //                 }
        //             });
        //         });
        //     } else if (msg.type === 'photos.remove') {
        //         _.each(msg.data, function (item) {

        //             var target = _.find(photos, function (photo) {
        //                 return photo.id === item;
        //             });

        //             if (target !== undefined) {
        //                 var index = photos.indexOf(target);
        //                 photos.splice(index, 1);
        //             }
        //         });
        //     }
        // };

        chrome.extension.onMessage.addListener(function (request, sender, callback) {
            var action = request.action;
            var data = request.data;
            var response;
            switch (action) {
                case 'getTemplate':
                    response = $('#' + data.id).html();
                    callback(response);
                break;
                case 'getServerURL':
                    response = LoginHelper.getServerURL();
                    callback(response);
                break;
                case 'login':
                    LoginHelper.loginAsync(data.authCode).done(function () {
                        isLogin = true;
                        //BackendSocket.init().on('message',handler);
                        callback(true);
                    }).fail(function () {
                        isLogin = false;
                        callback(false);
                    });
                break;
                case 'logout':
                    photos = [];
                    LoginHelper.logout();
                    isLogin = false;
                    callback();
                break;
                case 'isLogin':
                    LoginHelper.loginAsync(data.authCode).done(function () {
                        isLogin = true;
                        photos = [];
                        callback(true);
                    }).fail(function () {
                        photos = [];
                        isLogin = false;
                        callback(false);
                    });               
                break;
                case 'fetchPhotoList':
                    if (photos.length > 0) {
                        callback(photos);
                    } else {
                        $.ajax({
                            url : LoginHelper.getServerURL() + '/api/v1/resource/photos/',
                            xhrFields: {
                                withCredentials : true
                            },
                            data:{
                                offset:0,
                                length:99999
                            },
                            success : function (resp) {
                                photos = resp;
                                callback(resp);
                            },
                            error : function (resp) {
                                callback(resp);
                            }
                        });
                    }
                break;
                case 'preview':
                    chrome.tabs.create({
                        url : 'http://web.snappea.com/?ac=' + LoginHelper.getAuthCode() + '#/photos?preview=' + data.id
                    });
                break;
                case 'dragstart':
                    var x = 0 ;
                    var y = 0 ;
                    var w = data.width;
                    var h = data.height;
                    var orientation = data.orientation;
                    var id = data.id;
                    var img = new Image();
                    img.src = data.url;
                    img.onload = function(){

                        var canvas = document.createElement('canvas');
                        switch(orientation){
                            case 90:
                            case 270:
                                x = - w/2;
                                y = - h/2;

                                w = w + h ;
                                h = w - h ;
                                w = w - h ;
                            break;
                        };
                        canvas.width = w;
                        canvas.height = h;
                        var ctx = canvas.getContext('2d');
                        switch(orientation){
                            case 90:
                            case 270:
                                ctx.translate(w/2,h/2);
                                ctx.rotate(orientation*Math.PI/180);
                                w = w + h ;
                                h = w - h ;
                                w = w - h ;                        
                            break;
                        };
                        ctx.drawImage(img,x,y,w,h);
                        base64['$'+data.id] = canvas.toDataURL();
                    }; 

                break;
                case 'dragend':
                    chrome.tabs.executeScript(null,
                        {
                            code:"(function(){"+
                                    "var ele = document.getElementById('"+data.id+"');"+
                                    "if(!ele){return;};"+
                                    "ele.src = 'http://web.snappea.com/images/loading.gif';"+
                                    "ele.style.width = '24px';"+
                                    "ele.style.height = '24px';"+
                                "})();"
                            }
                    );

                    var changeImg = function(){
                        if(!base64['$'+data.id]){
                            setTimeout(changeImg,10);
                        }else{
                            chrome.tabs.executeScript(null,
                                {
                                    code:"(function(){"+
                                            "var ele = document.getElementById('"+data.id+"');"+
                                            "ele.src = '"+ base64['$'+data.id] +"';"+
                                            "ele.style.width = '"+data.width+"px';"+
                                            "ele.style.height = '"+data.height+"px';"+
                                            "ele.id = '';"+
                                        "})();"
                                    }
                            );
                        };
                    };

                    changeImg();
                    
                break;
            }

            return true;
        });

        LoginHelper.loginAsync().done(function () {
            isLogin = true;
            // BackendSocket.init().on('message', function (data) {
            //     handler(data);
            // });
        }).fail(function () {
            isLogin = false;
        });

        chrome.tabs.onUpdated.addListener(function(tabId,changeInfo,tab){
            if(String(changeInfo.url).indexOf('mail.google.com')!=-1){

                var tpl = "<div id='snappea-for-gmail'>"+      
                              "<div class='header'>"+
                                "<div class='img'></div>"+
                              "</div>"+
                              "<div class='body'>"+
                                "<h1>Email the photos on your phone</h1>"+
                                "<p>Open SnapPea Photos above and drag a photo into the body of an email. It's that easy!</p>"+
                              "</div>"+
                              "<button id='snappea-getIt'>Got it</button>"+
                            "</div>";

                chrome.tabs.executeScript(null,
                    {
                          code:"(function(){"+
                                "if(window.localStorage.getItem('snappea-for-gmail')!='true'){"+
                                    "var ele = document.getElementById('snappea-for-gmail');"+
                                    "if(ele){return;};"+
                                    "var jele = $(\""+tpl+"\").css('top',-355);"+
                                    "$('body').append(jele);"+
                                    "setTimeout(function(){"+
                                        "jele.animate({'top':10},1200);"+
                                    "},1000);"+
                                    "var getDom = function(){"+
                                        "var ele = document.getElementById('snappea-for-gmail');"+
                                        "var btn = document.getElementById('snappea-getIt');"+
                                        "btn.addEventListener('click',function(){"+
                                          "document.body.removeChild(ele);"+
                                          "window.localStorage.setItem('snappea-for-gmail','true');"+
                                        "});"+
                                        "if(!btn){"+
                                          "setTimeout(function(){"+
                                            "getDom();"+
                                          "},100);"+
                                        "};"+
                                      "};"+
                                      "getDom();"+
                                    "};"+
                            "})();"
                    }
                );
            };
        });


    });
}(this));
