this.superstylin = (function (window, document, undefined) {    
    var 
        // True if CSS has already been downloaded.
        styleSheetsLoaded = false,
        // True if there are unsaved changes to Styles.
        dirty = false,
        // Used to check whether URLs are remote.
        rurl = /^(\w+:)?\/\/([^\/?#]+)(.*)/,
        // Used to find embedded URLs in CSS.
        rcssurl = /url\((.*)?\)/gi,
        // Used to spot data URLs.
        rdataurl = /^data:/i,
        // Popup window.
        pop,
        // jQuery.
        $;
    
    function stylin() {
        // Always load our version of jQuery.
        var 
            script = document.createElement('script'),
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
    
    // If data changed, render and set dirty state.
    Style.prototype.update = function(data, timeout) {
        var
            self = this,
            isLoading = data === null;
        
        if (isLoading) {
            data = self._data;
        }
        
        if (data != self.data) {
            if (!isLoading) {
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
    
    // Make embedded URLs relative to the style sheet URL since <style> elements
    // are relative to the document.
    Style.prototype.render = function(css) {
        var self = this;
        css = css.replace(rcssurl, function($0, $1) {
            return 'url(' + (rdataurl.test($1) ? $1 : urlResolve(self.url, $1)) + ')';
        });
        this.el.replaceChild(document.createTextNode(css), this.el.firstChild);
    };
    
    // You get to implement this!
    Style.prototype.save = function(onComplete) {
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

// Possible solutions to enable tabs:
// http://ajaxian.com/archives/handling-tabs-in-textareas
// http://teddevito.com/demos/textarea.html

// URL.js from NodeJS. Exports and requires removed.
// https://github.com/ry/node/blob/master/lib/url.js

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9]+:)/,
    portPattern = /:[0-9]+$/,
    nonHostChars = ['/', '?', ';', '#'],
    hostlessProtocol = {
      'file': true,
      'file:': true
    },
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    };
    //querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && typeof(url) === 'object' && url.href) return url;

  var out = { href: url },
      rest = url;

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    out.protocol = proto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      out.slashes = true;
    }
  }
  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {
    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    // don't enforce full RFC correctness, just be unstupid about it.
    var firstNonHost = -1;
    for (var i = 0, l = nonHostChars.length; i < l; i++) {
      var index = rest.indexOf(nonHostChars[i]);
      if (index !== -1 &&
          (firstNonHost < 0 || index < firstNonHost)) firstNonHost = index;
    }
    if (firstNonHost !== -1) {
      out.host = rest.substr(0, firstNonHost);
      rest = rest.substr(firstNonHost);
    } else {
      out.host = rest;
      rest = '';
    }

    // pull out the auth and port.
    var p = parseHost(out.host);
    var keys = Object.keys(p);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      out[key] = p[key];
    }
    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    out.hostname = out.hostname || '';
  }

  // now rest is set to the post-host stuff.
  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    out.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    out.search = rest.substr(qm);
    out.query = rest.substr(qm + 1);
    if (parseQueryString) {
      out.query = querystring.parse(out.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    out.query = {};
  }
  if (rest) out.pathname = rest;

  return out;
}

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (typeof(obj) === 'string') obj = urlParse(obj);

  var protocol = obj.protocol || '',
      host = (obj.host !== undefined) ? obj.host :
          obj.hostname !== undefined ? (
              (obj.auth ? obj.auth + '@' : '') +
              obj.hostname +
              (obj.port ? ':' + obj.port : '')
          ) :
          false,
      pathname = obj.pathname || '',
      search = obj.search || (
          obj.query && ('?' + (
              typeof(obj.query) === 'object' ?
              querystring.stringify(obj.query) :
              String(obj.query)
          ))
      ) || '',
      hash = obj.hash || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (obj.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  return protocol + host + pathname + search + hash;
}

function urlResolve(source, relative) {
  return urlFormat(urlResolveObject(source, relative));
}

function urlResolveObject(source, relative) {
  if (!source) return relative;

  source = urlParse(urlFormat(source), false, true);
  relative = urlParse(urlFormat(relative), false, true);

  // hash is always overridden, no matter what.
  source.hash = relative.hash;

  if (relative.href === '') return source;

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    relative.protocol = source.protocol;
    return relative;
  }

  if (relative.protocol && relative.protocol !== source.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.

    if (!slashedProtocol[relative.protocol]) return relative;

    source.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      relative.pathname = relPath.join('/');
    }
    source.pathname = relative.pathname;
    source.search = relative.search;
    source.query = relative.query;
    source.host = relative.host || '';
    delete source.auth;
    delete source.hostname;
    source.port = relative.port;
    return source;
  }

  var isSourceAbs = (source.pathname && source.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host !== undefined ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (source.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = source.pathname && source.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = source.protocol &&
          !slashedProtocol[source.protocol] &&
          source.host !== undefined;

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // source.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {

    delete source.hostname;
    delete source.auth;
    delete source.port;
    if (source.host) {
      if (srcPath[0] === '') srcPath[0] = source.host;
      else srcPath.unshift(source.host);
    }
    delete source.host;

    if (relative.protocol) {
      delete relative.hostname;
      delete relative.auth;
      delete relative.port;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      delete relative.host;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    source.host = (relative.host || relative.host === '') ?
                      relative.host : source.host;
    source.search = relative.search;
    source.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    source.search = relative.search;
    source.query = relative.query;
  } else if ('search' in relative) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      source.host = srcPath.shift();
    }
    source.search = relative.search;
    source.query = relative.query;
    return source;
  }
  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    delete source.pathname;
    return source;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (source.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    source.host = isAbsolute ? '' : srcPath.shift();
  }

  mustEndAbs = mustEndAbs || (source.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  source.pathname = srcPath.join('/');


  return source;
}

function parseHost(host) {
  var out = {};
  var at = host.indexOf('@');
  if (at !== -1) {
    out.auth = host.substr(0, at);
    host = host.substr(at + 1); // drop the @
  }
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    out.port = port.substr(1);
    host = host.substr(0, host.length - port.length);
  }
  if (host) out.hostname = host;
  return out;
}

// END URL.js

return stylin;

})(window, document);