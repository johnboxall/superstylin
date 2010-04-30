/**
  * Superstylin - MIT Licensed, John Boxall
  * http://github.com/johnboxall/superstylin
  *
  * Edit stylesheets from the comfort of your browser.
  *
  **/
function superstylin(){
    var undefined;
    var ss = window.ss || {};
    var cache = {};
    var ruri = /^(\w+:)?\/\/([^\/?#]+)/;
    var $;
    
    function join(obj, sep){
        var attrs = [];
        var sep = sep || ",";
        var key;
        
        for (key in obj){
            attrs.push(key + "=" + obj[key]);
        }
        return attrs.join(sep);
    };
    
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
        
        // Only request a stylesheet once.
        if (cache[uri]){
            return false;
        }
        cache[uri] = true;
        
        // Find stylesheet node associated with this link.
        for (var i = 0; i < document.styleSheets.length; i++){
            var styleSheet = document.styleSheets[i];
            if (styleSheet.href && styleSheet.href == uri){
                break;
            }
        }
        
        // Remove the original stylesheet and insert a style element.
        getCSS(uri, function(response){
            var $style = $('<style type="text/css"></style>');
            $(styleSheet.ownerNode).replaceWith($style)
            $style.html(response);
            
            function update(){
                $style.html(this.value); 
            };
            
            $textarea
                .keyup(update)
                .keydown(update)
                .val(response);
        });
        
        return false;
    };
    
    // Build the interface in a popup window.
    function init(){
        var style = ss.style || "ul{margin:0;padding:0;list-style:none;}li{margin:1em 0.1em;padding:0.5em;border:1px solid #ddd;background:#f8f8ff;}textarea{clear:both;width:100%;height:90%;font-family: Monaco,'Courier New';}a{color:#4183C4;}div{position:relative;top:-20px;text-align:right;}a.close{color:#777;}.winning{background:black;}.winning.win{background:yellow;}.fail{background:red;}";
        var name = ss.popUpName || "superstylin";
        var opts = ss.popUpOpts || {
            width: screen.width * 0.33, 
            height: screen.height,
            location: false
        };
        opts.screenX = screen.width - opts.width;
        
        var interface = ['<script type="text/javascript">var open=1;</script><style>'+ style + '</style><ul>'];
        for (var i = 0; i < document.styleSheets.length; i++){
            var href = document.styleSheets[i].href;     
            if (href && (ss.ignore == undefined || ss.ignore(href))){
                interface.push('<li> \
    <a id="ss'+ i +'" class="open" href="#">' + href +'</a> \
    <div style="display:none;"> \
        <a class="close" href="#">Close</a> \
        <input type="submit" value="Save" /> \
        <textarea name="' + (ss.name || href) + '"></textarea> \
    </div> \
</li>');
            }
        }
        interface.push("</ul>");

        var pop = window.open("", name, join(opts));
        pop.document.write(interface.join(""));
        pop.document.close();
        pop.focus();

        // http://stackoverflow.com/questions/668286/detect-blocked-popup-in-chrome
        setTimeout(function(){
            if (!pop || pop.closed || typeof pop.closed == "undefined" || !pop.open || !pop.outerHeight){
                alert("Check your popup blocker settings.");
            }
        }, 1);
        
        var $openers = $("a.open", pop.document);
        
        // If there is only one stylesheet, automatically open it.
        if ($openers.length == 1){
            open($openers.get(0));
        }
        
        $openers.click(function(){
            open(this);
            return false;
        });
        
        $("a.close", pop.document).click(function(){
            $(this).parent().hide();
            return false;
        });
        
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
        
        // Close the window when you go somewhere else.
        window.onbeforeunload = function(){
            pop.close();
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