/*globals Handlebars*/

// rumtime Handlebars template compiling requires would require `unsafeeval` CSP if not done from a sandbox.
// See https://developer.chrome.com/extensions/sandboxingEval
var templates = [];

window.addEventListener("message", function(event) {
    var command = event.data.command;
    var name = event.data.name;
    switch(command) {
        case "compile":
            templates[name] = Handlebars.compile(event.data.source);
            break;
        case "render":
            event.source.postMessage({
                name: name,
                target: event.data.target,
                html: templates[name](event.data.context)
            }, event.origin);
            break;
        default:
            break;
    }
});
