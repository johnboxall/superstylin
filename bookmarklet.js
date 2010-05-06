javascript:(function () {
    if (window.superstylin){
        superstylin();
    } else{
        var a = document.createElement("script");
        a.src = "http://github.com/johnboxall/superstylin/raw/master/superstylin.js";
        a.onload = function () {
            superstylin()
        };
        document.body.appendChild(a)
    }
})();