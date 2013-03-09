/*global $, define, Backbone*/
(function (window, undefined) {
    define([
        'collections/PhotosCollection'
    ], function (
        PhotosCollection
    ) {
        var document = window.document;
        var chrome = window.chrome;
        var imgNum = 0;
        var PhotoItemView = Backbone.View.extend({
            className : 'w-photo-item',
            tagName : 'li',
            render : function () {
                var $img = $('<img id="sanppea-img-'+this.model.get('id')+'">').attr({
                    src : this.model.get('thumbnail_path')
                });
                imgNum ++ ;
                //增加loading背景图，可能会增加性能问题
                this.$el.addClass('loading');
                
                this.$el.append($img);

                $img.one('load', function () {
                    var withLtHeight = $img[0].width > $img[0].height;

                    if (withLtHeight) {
                        $img.css({
                            height : 72,
                            width : $img[0].width * (72 / $img[0].height)
                        });
                    } else {
                        $img.css({
                            height : $img[0].height * (72 / $img[0].width),
                            width : 72
                        });
                    }
                });
                return this;
            },

            clickItem : function () {
                chrome.extension.sendMessage({
                    action : 'preview',
                    data : {
                        id : this.model.id
                    }
                });
            },

            // dragstart : function (evt){
            //     evt.target.src = this.model.get('path');
            // },

            dragend : function (evt){
                chrome.extension.sendMessage({
                    action : 'dragend',
                    data : {
                        id:evt.target.id,
                        src:this.model.get('path'),
                        height:this.model.get('thumbnail_height'),
                        width:this.model.get('thumbnail_width')
                    }
                });
            },

            events : {
                'click' : 'clickItem',
                // 'dragstart' : 'dragstart',
                'dragend' : 'dragend'
            }
        });

        var PhotoListView = Backbone.View.extend({
            initialize : function () {
                this.$el = $('#photo-list');
                this.delegateEvents();
                this.collection = new PhotosCollection();

            },
            renderThread : function () {
                var fragment = document.createDocumentFragment();
                var start = this.$('#photo-ctn').children().length;
                var pageSize = 15;
                var i;
                var item;
                for (i = start; i < start + pageSize; i++) {
                    item = this.collection.at(i);
                    if (item !== undefined) {
                        fragment.appendChild(new PhotoItemView({
                            model : item
                        }).render().$el[0]);
                    } else {
                        break;
                    }
                }
                this.$('#photo-ctn').append(fragment);
            },
            renderPhotos : function () {
                $('.w-ui-loading').show();
                this.collection.trigger('update');

                this.collection.on('refresh', function (collection) {
                    this.renderThread();
                    this.$('.phone-name').html(window.localStorage.getItem('wdj-phone-name'));
                    $('.w-ui-loading').hide();
                }, this);
            },
            renderAsync : function () {
                var deferred = $.Deferred();

                chrome.extension.sendMessage({
                    action : 'getTemplate',
                    data : {
                        id : 'list-ctn'
                    }
                }, function (resp) {
                    this.$el = $(resp);
                    this.delegateEvents();

                    this.$('.phone-name').html(window.localStorage.getItem('wdj-phone-name'));

                    this.renderPhotos();

                    this.$el.on('scroll', function () {
                        var ele = this.$el[0];
                        if (ele.scrollTop + ele.offsetHeight + 30 >= ele.scrollHeight) {
                            this.renderThread();
                        }
                    }.bind(this));

                    deferred.resolve(this);
                }.bind(this));

                return deferred.promise();
            },
            clickButtonRefresh : function () {
                this.$('#photo-ctn').empty();
                this.renderPhotos();
            },
            clickButtonLogout : function () {
                chrome.extension.sendMessage({
                    action : 'logout',
                }, function () {

                    //直接刷新页面会变白，所以改为关闭。
                    //window.location.reload();
                    window.close();

                });
            },
            events: {
                'click .button-logout' : 'clickButtonLogout',
                'click .button-refresh' : 'clickButtonRefresh'
            }
        });

        return PhotoListView;
    });
}(this));