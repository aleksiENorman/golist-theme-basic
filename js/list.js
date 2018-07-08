(function($) {
    'use strict';

    var openEditForm = function(message, options) {
        var $form = $('#golist-edit form');
        var defaultCleanup = function() {
            $form.find('input, textarea').val("");
            $form.find('notify-area').text('');
            $form.off('click', '.cancel');
            $form.off('submit');
        }


        if (! options) {
            options = {};
        }

        $form.find('notify-area').text(message);
        $('#golist-edit').removeClass('hidden');

        if (options.open) {
            options.open($form);
        }

        $form.on('click', '.cancel', function () {
            $('#golist-edit').addClass('hidden');
            if (options.cleanup) {
                options.cleanup($form);
            }
            defaultCleanup();
        });

        $form.on('submit', function(e) {
            $('#golist-edit').addClass('hidden');
            var ajax = {
                url: '/',
                method: $form.attr("method"),
                data: $form.serialize()
            };

            e.preventDefault();

            $.ajax(ajax)
             .done(function (data) {
                if (options.submit) {
                    options.submit(data, $form);
                }
                if (options.cleanup) {
                    options.cleanup($form);
                }
                defaultCleanup();
            });
        });
    };

    window.list = {

        loading: false,
        items: {},

        updateIndex: function() {
            var ajax = {
                method: 'get',
                dataType: 'json',
                url: '/data/',
                context: this
            };

            if(! this.loading) {
                this.loading = true;

                $.ajax(ajax)
                 .done(function (data) {
                     this.updateItems(data);
                     this.renderIndex();
                 })
                 .always(function () {
                     this.loading = false;
                 })
             }
        },

        updateItems: function(data) {
            var self = this;
            var deleteItems = {};

            $.each(this.items, function() {
                deleteItems[this.Series] = this.Series;
            });

            $.each(data, function() {
                if (self.items[this.Series]) {
                    self.items[this.Series].Message = this.Message;
                    self.items[this.Series].Time = this.Time;
                    delete deleteItems[this.Series];
                } else {
                    self.items[this.Series] = this;
                }
            });

            $.each(deleteItems, function() {
                delete self.items[this];
            });
        },

        toggleExpand: function(series, ctx) {
            if(! this.loading) {
                if (! this.items[series].open) {
                    this.expand(series,ctx);
                } else {
                    ctx.find('ul').remove();
                    this.items[series].open = false;
                }
            }
        },

        expand: function(series, ctx) {
            var ajax = {
                method: 'get',
                dataType: 'json',
                url: '/data/' + series,
                context: this
            };

            if(! this.loading) {
                this.loading = true;

                $.ajax(ajax)
                 .done(function (data) {
                     if (data.length) {
                         ctx.find('ul').remove();
                         this.renderExpand(data, ctx);
                     }
                 })
                 .always(function () {
                     this.loading = false;
                 })
             }
        },

        deleteItem: function(objectId, ctx) {
            var self = this;
            var ajax = {
                method: 'delete',
                dataType: 'json',
                url: '/data/' + objectId,
                context: this
            };

            if (! this.loading) {
                this.loading = true;

                $.ajax(ajax)
                 .done(function (data) {
                    if (ctx.attr('id') == 'golist-body') {
                        self.updateItems(data);
                        self.renderIndex();
                    } else {
                        ctx.parents('li.ui-menu-item').find('ul').remove();
                        self.renderExpand(data, ctx.parents('li.ui-menu-item'));
                    }
                 })
                 .always( function() {
                     this.loading = false;
                 })
            }
        },

        openForEdit: function(dataItem, ctx) {
            openEditForm("Edit " +  dataItem.Message, {
                'open': function($form) {
                    $form.find('.submit').val("Save Changes");
                    $form.find('#objectid-input').val(dataItem.ObjectId);
                    $form.find('#series-input').val(dataItem.Series).prop('readonly', 1);
                    $form.find('#message-input').val(dataItem.Message);
                },
                'cleanup': function($form) {
                    $form.find('#series-input').prop('readonly', 0);
                },
                'submit': function(data, $form) {
                     ctx.children('.message').text(data.Message);
                }
            });
        },

        openForAppend: function(dataItem, ctx) {
            var self = this;
            openEditForm("Add New item to " +  dataItem.Series, {
                'open': function($form) {
                    $form.find('.submit').val("Add to thread");
                    $form.find('#series-input').val(dataItem.Series).prop('readonly', 1);
                },
                'cleanup': function($form) {
                    $form.find('#series-input').prop('readonly', 0);
                },
                'submit': function(data, $form) {
                    self.expand(data.Series, ctx);
                }
            });
        },

        renderIndex: function() {
            var self = this;
            var ul = $('ul#golist-body');
            var items = $.extend(true, {}, this.items);

            ul.children('li').each(function() {
                var series = $(this).data('series');
                if (items[series]) {
                    $(this).children('a.message').text(items[series].Message);
                    delete items[series];
                } else {
                    $(this).remove();
                }
            });

            $.each(items, function() {
                var dataItem = this;

                var li = $('<li/>')
                    .addClass('ui-menu-item')
                    .attr('id', 'series-' + dataItem.Series)
                    .data('series', dataItem.Series)
                    .appendTo(ul);
                var aaa = $('<a/>')
                    .attr('href', '#')
                    .addClass('ui-all')
                    .addClass('message')
                    .text(dataItem.Message)
                    .click(function() {
                        self.toggleExpand(dataItem.Series, $(this).parent());
                    })
                    .appendTo(li);
                var expandLink = $('<span>')
                    .addClass('ui-expand')
                    .text(' [append]')
                    .click(function() {
                        self.openForAppend(dataItem, $(this).parent());
                    })
                    .appendTo(li);
                var editLink = $('<span>')
                    .addClass('ui-edit')
                    .text(' [edit]')
                    .click(function() {
                        self.openForEdit(dataItem, $(this).parent());
                    })
                    .appendTo(li);
                var deleteLink = $('<span/>')
                    .addClass('ui-delete')
                    .text(' [delete]')
                    .click(function() {
                        self.deleteItem(dataItem.ObjectId, $('#golist-body'));
                    })
                    .appendTo(li);
            });
        },

        renderExpand: function(data, context) {
            var self = this;
            var ul = $('<ul/>');

            this.items[data.shift().Series].open = true;

            $.each(data, function() {
                var dataItem = this;

                var li = $('<li/>')
                    .addClass('ui-menu-subitem')
                    .appendTo(ul);
                var aaa = $('<span/>')
                    .addClass('ui-all')
                    .addClass('message')
                    .text(dataItem.Message)
                    .appendTo(li);
                var editLink = $('<span>')
                    .addClass('ui-edit')
                    .text(' [edit]')
                    .click(function() {
                        self.openForEdit(dataItem, $(this).parent());
                    }).
                    appendTo(li);
                var deleteLink = $('<span/>')
                    .addClass('ui-delete')
                    .text(' [delete]')
                    .click(function() {
                        self.deleteItem(dataItem.ObjectId, $(this).parent());
                    })
                    .appendTo(li);
            });

            ul.appendTo(context);
        },

        init: function(form) {
            var self = this;

            $('#add-link').click(function() {
                openEditForm("Create a new thread", {
                    'open': function($form) {
                        $form.find('.submit').val("Create thread");
                    },
                    'submit': function(data, $form) {
                        self.updateIndex();
                    }
                });
            })
        }

    }

}(jQuery));
