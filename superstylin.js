/**
  * Superstylin - MIT Licensed, John Boxall
  * http://github.com/johnboxall/superstylin
  *
  * Edit stylesheets from the comfort of your browser.
  *
  **/
function superstylin(){    
    var ss = window.ss || {};
    
    // If already open, noop.
    if (ss.pop && !ss.pop.closed){
        return;
    }
    
    // Stash for content of stylesheets.
    var cache = ss.cache = ss.hasOwnProperty("cache") && ss.cache || {};    
    // RegExp used for detecting external uris.
    var ruri = /^(\w+:)?\/\/([^\/?#]+)/;
    var undefined;
    var $;

    function join(obj){
        var attrs = [];
        
        for (var key in obj){
            attrs.push(key + "=" + obj[key]);
        }
        return attrs.join(",");
    }
    
    function getJS(src, win){
        var script = document.createElement('script');
        var head = document.getElementsByTagName('head')[0];
        var done = false;
        
        script.src = src;
        script.onload = function(){
            if (!done){
                done = true;
                if (win){
                    win();
                }
            }
        };
        head.appendChild(script);
    }
    
    function getCSS(uri, win, fail){
        var m = ruri.exec(uri);
        var remote = m && (m[1] && m[1] !== location.protocol || m[2] !== location.host);
        
        // Use YQL for cross-domain requests.
        if (remote){
            var q = 'select * from html where url="' + uri + '"';
            var src = 'http://query.yahooapis.com/v1/public/yql?q=' + q + '&callback=_yql';
            
            // Massage response into expected format.
            window._yql = function(r){
                if (!r.results.length){
                    alert(r.query.diagnostics.forbidden);
                } else{
                    // Response wrapped in <body><p>(.*?)</p></body>
                    var css = r.results[0].substr(14, r.results[0].length - 28);
                    win(css);
                }                   
            };
            getJS(src);
        } else{
            $.get(uri, win);
        }
    }
    
    // Load a stylesheet and make it editable.
    function open(link){
        var self = link;
        var $self = $(link);
        var uri = link.innerHTML;
        var $textarea = $self.next().show().children("textarea");
        var styleSheet;
        
        // Cache stylesheets so we only have to request them once.
        if (cache.hasOwnProperty(uri)){
            return false;
        }
        cache[uri] = true;
        
        // TODO: Handle inline stylesheets.
        // Find find the stylesheet node we wanted to edit.
        for (var i = 0; i < document.styleSheets.length; i++){
            var styleSheet = document.styleSheets[i];
            if (styleSheet.href && styleSheet.href == uri){
                break;
            }
        }
        
        // TODO: Problem with order of operations that results in flash of "undefined"
        //       value in textarea.
        
        // Remove the original stylesheet and insert a style element.
        getCSS(uri, function(response){
            // TODO: Detect which method of changing CSS is supported.
            var _update;
            
            // IE is happy to just change the original stylesheet.   
            if ($.browser.msie) {
                _update = function(s) {
                    document.styleSheets[i].cssText = s;
                }
            // Other browsers are a bit more fussy.
            } else {
                var $style = $('<style type="text/css"></style>');
                $(styleSheet.ownerNode).replaceWith($style)
                
                _update = function(s) {
                    $style.html(response);
                }
            }
            
            _update();
                        
            function update(){
                var val = this.value || "";
                _update(val);
                cache[uri] = val;
            }
            
            $textarea
                .keyup(update)
                .keydown(update)
                .val(response);
                
            update.call($textarea[0]);
        });        
    }
    
    // Build the interface in a popup window.
    function init(){    
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
        if (ss.$docEl && ss.$docEl.length){
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
                if (href && (ss.ignore == undefined || ss.ignore(href))){
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
        setTimeout(function(){
            if (!pop || pop.closed || typeof pop.closed == "undefined" || !pop.open || !pop.outerHeight){
                alert("Check your popup blocker settings.");
            }
        }, 1);
        
        // Expose pop so we can see if it's already open.
        ss.pop = pop;
        
        // Populate open textareas for cache. Helps when we're reopening pop.
        $("textarea", pop.document).each(function(){
            this.value = cache[$(this).parent().prev("a").html()];
        })
        
        // Serialize pop state so we can resume where we left off.
        pop.onbeforeunload = function(){
            ss.$docEl = $(ss.pop.document.documentElement).clone(true);
        }
        
        // If we have been open before, don't rebind the rest of the handlers.
        if (ss.$docEl && ss.$docEl.length){
            return;
        }
        
        var $openers = $("a.open", pop.document);
        
        // If there is only one stylesheet, automatically open it.
        if ($openers.length == 1){
            open($openers.get(0));
        }
        
        // Open a stylehsheet.
        $openers.click(function(){
            open(this);
            return false;
        });
        
        // Close a stylesheet.
        $("a.close", pop.document).click(function(){
            $(this).parent().hide();
            return false;
        });
        
        // Save a stylesheet.
        $("input", pop.document).click(function(){
            var $self = $(this);
            var textarea = $self.next()[0];
            var data = {};
            data[ss.name || textarea.name] = textarea.value;
            
            $.ajax({type: "POST", url: ss.saveTo, data: data,
                success: function(){
                    $self.addClass("win");
                    setTimeout(function(){
                        $self.removeClass("winning").removeClass("win");
                    }, 1000);
                },
                error: function(x){            
                    $self.addClass("fail");
                    alert("Couldn't save your CSS. " + x.statusText);
                }
            });
            $self.addClass("winning");            
        });
        
        // Close pop when you leave the page.
        // TODO: Option to save automatically on close?
        window.onbeforeunload = function(){
            //pop.close();
            ss.pop.close();
        }
        
    } // init()
    
    if (typeof jQuery == 'undefined'){
        getJS('http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js', function(){
            $ = jQuery.noConflict();
            init();
        });
    } else {
        $ = jQuery;
        init();
    }
    
    return false;
    
} // superstylin()