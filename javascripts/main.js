/*global Backbone, $, document*/
(function (window, undefined) {
    require.config({
        baseUrl : '../javascripts/'
    });

    require([
        'LoginHelper',
        'views/LoginView',
        'views/PhotoListView'
    ], function (
        LoginHelper,
        LoginView,
        PhotoListView
    ) {
        var chrome = window.chrome;

        var renderList = function () {
            var photoListView = new PhotoListView();
            photoListView.renderAsync().done(function (photoListView) {
                $('body').append(photoListView.$el);
            });
        };

        chrome.extension.sendMessage({
            action : 'isLogin'
        }, function (resp) {
            if (resp) {
                renderList.call(this);
            } else {
                var loginView = new LoginView();

                loginView.renderAsync().done(function (loginView) {
                    $('body').append(loginView.$el);


                    //支持国际化，后期可以重构为前端模板
                    var g = chrome.i18n.getMessage;
                    $('.i18n-title').text(g("login_title"));
                    $('.i18n-passBg').focus().attr("placeholder",g("login_passBg"));
                    $('.i18n-login').text(g("login_login"));
                    $('.i18n-htg').text(g("login_howToGet"));
                    $('.i18n-des').text(g("login_des"));
                    $('.i18n-error').text(g("login_error")).hide();

                    //如何获取验证码链接
                    $('.i18n-htg').on('click',function(){
                        chrome.tabs.create({url : g("login_htg_url")});
                    });

                    //点图片，打开google play地址
                    $('.i18n-gplay').on('click',function(){
                        chrome.tabs.create({url : g("login_gplay")});
                    });
                });

                loginView.once('login', function () {
                    renderList.call(this);
                });
            }
        });
    });

    var _gaq = window._gaq || [];
    _gaq.push(['_setAccount', 'UA-XXXXXXXX-X']);
    _gaq.push(['_trackPageview']);
    (function () {
        var ga = document.createElement('script');
        ga.type = 'text/javascript';
        ga.async = true;
        ga.src = 'https://ssl.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(ga, s);
    }());
}(this));