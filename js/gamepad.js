var buttonsStatus = new Array(16).fill(0);
var buttonsCache = new Array(16).fill(0);

window.addEventListener("gamepadconnected", function(e) {
    var gp = navigator.getGamepads()[e.gamepad.index];
    console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
        gp.index, gp.id, gp.buttons.length, gp.axes.length);
    gameLoop();
});

function gameLoop(){
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
    if (!gamepads) {
        return;
    }

    var gp = gamepads[0];
    for (var i = 0; i < gp.buttons.length; i++) {
        var button = gp.buttons[i];
        var pressed = button == 1.0;
        var val = 0;
        if (typeof(button) == "object") {
            pressed = button.pressed;
            val = button.value;
        }
        buttonsStatus[i] = val;
        /* if (pressed) {
            console.log("button " + i + " pressed with val " + val);
        } */
    }
    for (i = 0; i < gp.axes.length; i++) {
        buttonsStatus[gp.buttons.length + i] = gp.axes[i];
        //console.log(gp.buttons.length + i + " " + buttonsStatus[gp.buttons.length + i]);
    }

    requestAnimationFrame(gameLoop);
}

function newPress(btn) {
    return buttonsCache[btn] != 1.0;
}

function cacheStatus() {
    for(var k = 0; k < buttonsStatus.length; k++) {
        buttonsCache[k] = buttonsStatus[k];
    }
}

export { buttonsStatus, newPress, cacheStatus };