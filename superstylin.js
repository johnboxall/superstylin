/**
  * Superstylin - MIT Licensed, John Boxall
  * http://github.com/johnboxall/superstylin
  *
  * Edit stylesheets from the comfort of your browser.
  *
  **/
function superstylin() {    
    var ss = window.ss || {};
    
    // If already open, noop.
    if (ss.pop && !ss.pop.closed){
        return;
    }
    
    // Stash for content of stylesheets.
    var cache = ss.cache = ss.hasOwnProperty("cache") && ss.cache || {};    
    // RegExp used for detecting external urls.
    var rurl = /^(\w+:)?\/\/([^\/?#]+)/;
    var undefined;
    var $;

    function join(obj) {
        var attrs = [];
        
        for (var key in obj) {
            attrs.push(key + "=" + obj[key]);
        }
        return attrs.join(",");
    }
    
    function getJS(src, win) {
        var script = document.createElement('script');
        var head = document.getElementsByTagName('head')[0];
        var done = false;
        
        script.src = src;
        script.onload = function() {
            if (!done){
                done = true;
                if (win){
                    win();
                }
            }
        };
        head.appendChild(script);
    }
    
    function getCSS(url, win, fail){
        var m = rurl.exec(url);
        // Try changing to current protocol when host is the same.
        var remote = false;
        if (m[1] && m[1] !== location.protocol) {
            if (m[2] !== location.host) {
                remote = true;
            } else {
                url = location.protocol + url.slice(url.indexOf(":") + 1)
            }
        }
                
        // TODO: YQL Sucks. Just need a straight proxy.
        // Use YQL for cross-domain requests.
        if (remote) {
            var q = 'select * from html where url="' + url + '"';
            var src = 'http://query.yahooapis.com/v1/public/yql?q=' + q + '&callback=_yql';
            
            // Massage response into expected format.
            window._yql = function(r) {
                if (!r.results.length) {
                    alert(r.query.diagnostics.forbidden);
                } else {
                    // Response wrapped in <body><p>(.*?)</p></body>
                    var css = r.results[0].substr(14, r.results[0].length - 28);
                    win(css);
                }                   
            };
            getJS(src);
        } else {
            $.get(url, win);
        }
    }
    
    // Load a stylesheet and make it editable.
    function open(link) {
        var self = link;
        var url = link.innerHTML;
        var $self = $(link);
        var $textarea = $self.next().show().children("textarea");
        var styleSheet;
        
        // Cache stylesheets so we only request them once.
        if (cache.hasOwnProperty(url)) {
            return false;
        }
        cache[url] = true;
        
        // TODO: Handle inline stylesheets.
        // Find find the stylesheet node we wanted to edit.
        for (var i = 0; i < document.styleSheets.length; i++) {
            var styleSheet = document.styleSheets[i];
            if (styleSheet.href && styleSheet.href == url) {
                break;
            }
        }
        
        // TODO: Problem with order of operations that results in flash of "undefined"
        //       value in textarea.
        
        // Get the CSS then bind keyup/keydown to update it.
        getCSS(url, function(response) {
            var _update;
                        
            // IE is happy to change the styleSheet element.
            if (document.styleSheets[i].cssText) {
                _update = function(s) {
                    document.styleSheets[i].cssText = s;
                }
            // For others, remove the styleSheet and edit a style element.
            } else {
                var css = document.createElement("style");
                css.type = "text/css";
                styleSheet.ownerNode.parentNode.replaceChild(css, styleSheet.ownerNode);
                
                _update = function(s) {
                    var node = document.createTextNode(s)
                    if (css.childNodes.length > 0) {
                        if (css.firstChild.nodeValue !== node.nodeValue) {
                            css.replaceChild(node, css.firstChild);
                        }
                    } else {
                        css.appendChild(node);
                    }
                }
            }
                        
            function update() {
                var val = this.value || "";
                _update(val);
                cache[url] = val;
            }
            
            $textarea
                .keyup(update)
                .keydown(update)
                .val(response);
                
            update.call($textarea[0]);
        });        
    }
    
    // Build the interface in a popup window.
    function init() {    
        var name = ss.popUpName || "superstylin";
        var opts = ss.popUpOpts || {
                width: screen.width * 0.33, 
                height: screen.height,
                location: false
            };
        opts.screenX = screen.width - opts.width;
        
        var pop = window.open("", name, join(opts));
        // TODO: IE, if pop didn't open, pop.document might not be there?
        
        // If we were open before, then load from cache.
        if (ss.$docEl && ss.$docEl.length) {
            // TODO: How to do this jQuery?
            //window.result = $(pop.document.documentElement).replaceWith(ss.$documentElement[0]);
            var docEl = pop.document.documentElement;
            docEl.parentNode.replaceChild(ss.$docEl[0], docEl);
        } else {
            // TODO: Make this pretty.
            var style = ss.style || "ul{margin:0;padding:0;list-style:none;}li{margin:1em 0.1em;padding:0.5em;border:1px solid #ddd;background:#f8f8ff;}textarea{clear:both;width:100%;height:90%;font-family: Monaco,'Courier New';font-size:10px;}a{color:#4183C4;}div{position:relative;top:-20px;text-align:right;}a.close{color:#777;}.winning{background:black;}.winning.win{background:yellow;}.fail{background:red;}";
            var html = ['<script type="text/javascript">var open=1;</script><style>'+ style + '</style><ul>'];
            for (var i = 0; i < document.styleSheets.length; i++){
                var href = document.styleSheets[i].href;     
                if (href && (ss.ignore == undefined || ss.ignore(href))) {
                    html.push('<li> \
    <a id="ss'+ i +'" class="open" href="#">' + href +'</a> \
    <div style="display:none;"> \
        <a class="close" href="#">Close</a> \
        <input type="submit" value="Save" /> \
        <textarea name="' + (ss.name || href) + '"></textarea> \
    </div> \
</li>');
                }
            }
            html.push("</ul>");            
            pop.document.write(html.join(""));
        }
        
        pop.document.close();
        pop.focus();
        
        // TODO: This throws in IE even if things worked.
        // http://stackoverflow.com/questions/668286/detect-blocked-popup-in-chrome
        setTimeout(function() {
            if (!pop || pop.closed || typeof pop.closed == "undefined" || !pop.open || !pop.outerHeight){
                alert("Check your popup blocker settings.");
            }
        }, 1);
        
        // Expose pop so we can test if it's open.
        ss.pop = pop;
        
        // Populate open textareas for cache. Helps when we're reopening pop.
        $("textarea", pop.document).each(function() {
            var url = $(this).parent().prev("a").html();
            this.value = cache[url];
        })
        
        // Serialize pop state so we can resume where we left off.
        pop.onbeforeunload = function() {
            ss.$docEl = $(ss.pop.document.documentElement).clone(true);
        }
        
        // If we have been open before, don't rebind the rest of the handlers.
        if (ss.$docEl && ss.$docEl.length) {
            return;
        }
        
        var $openers = $("a.open", pop.document);
        
        // If there is only one stylesheet, automatically open it.
        if ($openers.length == 1) {
            open($openers.get(0));
        }
        
        $openers.click(function() {
            open(this);
            return false;
        });
        
        $("a.close", pop.document).click(function() {
            $(this).parent().hide();
            return false;
        });
        
        // Savinge stylesheets.
        $("input", pop.document).click(function() {
            var $self = $(this);
            var textarea = $self.next()[0];
            var data = {};
            data[ss.name || textarea.name] = textarea.value;
            
            $.ajax({type: "POST", url: ss.saveTo, data: data,
                success: function() {
                    $self.addClass("win");
                    setTimeout(function(){
                        $self.removeClass("winning").removeClass("win");
                    }, 1000);
                },
                error: function(x) {            
                    $self.addClass("fail");
                    alert("Couldn't save your CSS. " + x.statusText);
                }
            });
            $self.addClass("winning");            
        });
        
        // Close pop when you leave the page.
        // TODO: Option to save automatically on close?
        window.onbeforeunload = function() {
            ss.pop.close();
        }
        
    } // init()
    
    if (typeof jQuery == 'undefined') {
        getJS('http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js', function() {
            $ = jQuery.noConflict();
            init();
        });
    } else {
        $ = jQuery;
        init();
    }
    
    return false;
    
} // superstylin()