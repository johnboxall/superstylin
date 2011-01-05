this.superstylin = (function (window, document, undefined) {    
    var 
        // True if CSS has already been downloaded.
        styleSheetsLoaded = false,
        // True if there are unsaved changes to Styles.
        dirty = false,
        // Used to check whether URLs are remote.
        rurl = /^(\w+:)?\/\/([^\/?#]+)(.*)/,
        pop,
        $;
        
    function stylin() {
        // Always load our version of jQuery - 1.4.1 has weird delegation???
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
        var opts = {
                width: parseInt(screen.width * 0.33),
                height: screen.height,
                screenY: 0
            };
        opts.screenX = screen.width - opts.width;
        
        // Safari won't open popup after XHR calls, so we do it now.
        pop = window.open('', 'stylin', join(opts));
        
        setTimeout(function() { 
            if (!pop || pop.closed || typeof pop.closed === 'undefined' || !pop.open || !pop.outerHeight) {
                alert('Check your pop-blocker settings.');
            }
        }, 0);
        
        if (!styleSheetsLoaded) {
            styleSheetsLoaded = true;
            
            var toLoad = 0;            
            $.each(document.styleSheets, function() {            
                var style = new Style(this);
                if (style.shouldLoad()) {
                    toLoad++;
                    
                    // TODO: What if style fails to load?
                    style.load(function() {
                        toLoad--;
                        
                        if (toLoad == 0) {
                            build();
                        }
                    });
                }
            });
            
            // TODO: What if we can't load any stylesheets? Just drop one of our own.
            /*if (toLoad == 0) {
                // build();
                var style = document.createElement('style');
                style.appendChild(document.createTextNode());
                style.text = 'text/css';
                document.head.appendChild(style);
                
                var s = new Style({})
                s.el = style;
                s._data = '';
                
                Style.styles.push(s);
                build();
            }*/
            
        } else {
           build();
        }        
    }
    
    function build() {
        var html = [
                '<style type="text/css">',
                    '.styleSheet {}',
                    '.styleSheet div { float: right; }',
                    '.styleSheet.closed textarea { display: none; }',
                    'textarea { width: 100%; height: 90%; font-family: Monaco; font-size: 10px; padding: 10px; }',
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
                
        pop.document.write(html.join(''));
        pop.document.close();
        pop.focus();
        
        $(pop.document).delegate('textarea', 'keyup keydown', function(e) {
            // TODO: Get ID fails here:
            // http://ssl.www.threadless.com.proxy.com/cart/step/shipping-info
            var id = $(this).parents('.styleSheet').data('id') || 0;
            Style.styles[id].update(this.value || '', 250);
        });
        
        $(pop.document).delegate('button', 'click', function() {
            $(this).parents('.styleSheet').toggleClass('closed');
        });
        
        // Save Style.
        $(pop.document).delegate('input[type="submit"]', 'click', function() {
            var saveEl = this,
                id = $(this).parents('.styleSheet').data('id') || 0;
            
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
        $(pop.document).keydown(function(e) {        
            var char = String.fromCharCode(e.which).toLowerCase();
            if (char == 's' && e.ctrlKey) {
                $('input[type="submit"]', pop.document).click();
                e.preventDefault();
                return false;
            }
        });
        
        // If there is one Style, open it.
        if (Style.styles.length == 1) {
            $('button', pop.document).click();
        }
        
        window.onbeforeunload = function() {
            if (dirty) {
                return 'You have unsaved CSS changes.';
            }
        };
            
        window.onunload = function() {
            pop.close();
        };   
    }
    
    return stylin;

})(window, document);