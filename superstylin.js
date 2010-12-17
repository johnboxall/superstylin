this.superstylin = (function (window, document, undefined) {    
    var popupLoaded = false,
        // True if there are unsaved changes to Styles.
        dirty = false,
        // Used to check whether URLs are remote.
        rurl = /^(\w+:)?\/\/([^\/?#]+)(.*)/,
        popup,
        $;
        
    function stylin() {
        if (typeof jQuery === 'undefined') {
            var script = document.createElement('script'),
                scriptLoaded = false;
            
            script.src = 'http://ajax.googleapis.com/ajax/libs/jquery/1.4.4/jquery.min.js';
            script.onload = function() {
                if (!scriptLoaded) {
                    scriptLoaded = true;
                    $ = jQuery.noConflict();
                    init();
                }
            };
            document.head.appendChild(script);
        } else {
            $ = jQuery;
            init();
        }
    };
    
    function join(o) {
        var l = [], p;
        for (p in o) l.push(p + '=' + o[p]);
        return l.join(',');
    };
    
    function Style(styleSheet) {
        var href = styleSheet.href;
        if (href) {
            var match = rurl.exec(styleSheet.href || '');
            
            this.hostname = match[2];
            this.url = match[3];
            this.styleSheet = styleSheet;
        }
    };
    
    stylin.Style = Style;
    Style.styles = [];
    
    Style.prototype.shouldLoad = function() {
        return this.hostname == location.hostname;
    };
    
    Style.prototype.fetch = function(onComplete) {
        $.ajax({
            url: this.url,
            complete: onComplete,
            cache: false
        });
    };
    
    Style.prototype.load = function(onLoaded) {
        var self = this;
        self.fetch(function(xhr, statusText) {
            if (statusText == 'success') {
                self.el = document.createElement('style');
                self.el.type = 'text/css';
                self.el.appendChild(document.createTextNode(''));
                self.styleSheet.ownerNode.parentNode.replaceChild(self.el, self.styleSheet.ownerNode);
                self._data = xhr.responseText;
                self.update(null, 0);
                
                Style.styles.push(self);
                
                onLoaded();
            } else {
                alert('Failed loading: ' + self.href);
            }
        });
    };
    
    Style.prototype.update = function(data, timeout) {
        var self = this,
            dataIsNull = data === null;
        
        if (dataIsNull) {
            data = self._data;
        }
        
        // Update when we have new data.
        if (data != self.data) {
            if (dataIsNull) {
                dirty = true
            }
            
            self.data = data;
            
            // Stagger renders to stay responsive.
            clearTimeout(self.updateTimeout);
            
            self.updateTimeout = setTimeout(function() {
                self.beforeRender(data, function() {
                    self.render.apply(self, Array.prototype.slice.call(arguments));
                });
            }, timeout);
        }
    };
    
    // Hook to alter how data is rendered to CSS.
    Style.prototype.beforeRender = function(data, onComplete) {
        onComplete(data);
    };
    
    Style.prototype.render = function(css) {
        this.el.replaceChild(document.createTextNode(css), this.el.firstChild);
    };
    
    Style.prototype.save = function(onComplete) {
        // You get to implement this.
        alert('Not Implemented!');
    };

    function init() {
        function load() {
            buildPopup();
            bindEvents();
        }
        
        if (!popupLoaded) {
            popupLoaded = true;
                    
            // Fetch the stylesheets and replace them with editable style elements.
            // Then build the interface and bind the events!
            var toLoad = 0;
            
            $.each(document.styleSheets, function() {
                var style = new Style(this);
                if (style.shouldLoad()) {
                    toLoad++;
    
                    // TODO: What if style fails to load?
                    style.load(function() {
                        toLoad--;
                        
                        if (toLoad == 0) {
                            load();
                        }
                    });
                }
            });
        } else {
            load();
        }
    }
    
    function buildPopup() {
        var opts = {
                width: parseInt(screen.width * 0.33),
                height: screen.height,
                screenY: 0,
            };
        
        opts.screenX = screen.width - opts.width;        
        popup = window.open('', 'a', join(opts));
        
        var html = [
                '<script type="text/javascript">var open = 1;</script>',
                '<style type="text/css">',
                    '.styleSheet {}',
                    '.styleSheet div { float: right; }',
                    '.styleSheet.closed textarea { display: none; }',
                    'textarea { width: 100%; height: 90%; font-family: Monaco, "Courier New"; font-size: 10px; padding: 10px; }',
                    '.saving { background: red; }',
                '</style>'
            ];
        
        $.each(Style.styles, function(id, style) {
            html.push(
                '<div class="styleSheet closed" data-id="' + id + '">',
                    style.url,
                    '<div>',
                        '<button>Toggle</button>',
                        '<input type="submit" value="Save" />',
                    '</div>',
                '<textarea>' + style._data + '</textarea>',
                '</div>'
            );
        });
        
        popup.document.write(html.join(''));
        popup.document.close();
        popup.focus();
        
        // http://stackoverflow.com/questions/668286/detect-blocked-popup-in-chrome
        setTimeout(function() {
            if (!popup || popup.closed || typeof popup.closed === 'undefined' || !popup.open || !popup.outerHeight) {
                alert('Check your popup blocker settings.');
            }
        }, 1);
    }
    
    function bindEvents() {      
        $(popup.document).delegate('textarea', 'keyup keydown', function() {
            var id = $(this).parents('.styleSheet').data('id');
            Style.styles[id].update(this.value || '', 250);
        });
        
        $(popup.document).delegate('button', 'click', function() {
            $(this).parents('.styleSheet').toggleClass('closed');
        });
        
        // Save Style.
        $(popup.document).delegate('input[type="submit"]', 'click', function() {
            var saveEl = this,
                id = $(this).parents('.styleSheet').data('id');

            Style.styles[id].save(function(xhr, textStatus) {
                if (textStatus == 'success') {
                    dirty = false;
                } else {
                    alert('Error saving CSS: ' + xhr.statusText);
                }
                saveEl.className = '';
            });
            
            saveEl.className = 'saving';            
        });
        
        // Save Styles with CTRL+S.
        $(popup.document).keydown(function(e) {        
            var char = String.fromCharCode(e.which).toLowerCase();
            if (char == 's' && e.ctrlKey) {
                $('input[type="submit"]', popup.document).click();
                e.preventDefault();
                return false;
            }
        });
        
        // If there is one Style, open it.
        if (Style.styles.length == 1) {
            $('button', popup.document).click();
        }
        
        window.onbeforeunload = function() {
            if (dirty) {
                return 'You have unsaved CSS changes.';
            }
        };
            
        window.onunload = function() {
            popup.close();
        };
        
    }
    
    return stylin;

})(window, document);