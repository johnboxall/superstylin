#About
**Superstylin** is a plug-in that lets you edit and save stylesheets in your browser.

Superstylin finds the stylesheets in your page and allows you to edit them in a popup window. Changes are instantly reflected in your site. Optionally, edited stylesheets can be saved via  POST request to an endpoint you configure.

##Usage

    // Open the editor!
    superstylin();

##Configuration

    var ss = {
        // Optional relative path to the save endpoint.
        saveTo: "/path/to/my/save.php",
        // Optional Callable that returns true if a stylesheet should be editable.
        ignore: function(uri){ return true }
        // Optional name of popup window
        popUpName: "superstylin",
        // Optional parameters to open the popup window with
        popUpOpts: {}
    }