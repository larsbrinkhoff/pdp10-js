var lineY = 0;
var lineDY = 7;

var canvas;
var ctx;
var ws;
var bucky = 0;

var keymap = [ null, null, null, null, null, null, null, null,
               null, null, null, null, null, null, null, null,
               null, null, null, null, null, null, null, null,
               null, null, null, null, null, null, null, null,
               0077, 0102, 0103, 0104, 0106, 0105, 0107, 0110, 
               0111, 0112, 0161, 0160, 0074, 0014, 0075, 0076,
               0013, 0002, 0003, 0004, 0005, 0006, 0007, 0010,
               0011, 0012, 0061, 0060, 0174, 0114, 0175, 0176,
               0015, 0147, 0171, 0167, 0151, 0126, 0152, 0153,
               0154, 0133, 0155, 0156, 0157, 0173, 0172, 0134,
               0135, 0124, 0127, 0150, 0130, 0132, 0170, 0125,
               0166, 0131, 0165, 0036, 0040, 0037, 0016, 0113,
               0115, 0047, 0071, 0067, 0051, 0026, 0052, 0053,
               0054, 0033, 0055, 0056, 0057, 0073, 0072, 0034,
               0035, 0024, 0027, 0050, 0030, 0032, 0070, 0025,
               0066, 0031, 0065, 0136, 0140, 0137, 0116, 0046 ];

function keyTV(code) {
    var buf = [3, 0, 0, 0, 0];
    code |= bucky;
    buf[3] = code & 0xFF;
    buf[4] = code >> 8;
    ws.send(buf);
    console.log("Key sent: " + buf);
}

function keydownTV(ev) {
    console.log("Key down: " + ev);
    ev.preventDefault();
    var keysym = getKeysym(ev);
    console.log("Keysym: " + keysym);
    switch(keysym) {
    case 0xFF08: keyTV(0046); break; //Backspace -> Rubout
    case 0xFF09: keyTV(0022); break; //Tab -> Tab
    case 0xFF0D: keyTV(0062); break; //Return -> Return
    case 0xFF1B: keyTV(0023); break; //Esc -> Altmode
    case 0xFFBE: keyTV(0020); break; //F1 -> CALL
    case 0xFFBF: keyTV(0001); break; //F2 -> ESC
    case 0xFFE3: bucky |= 004000; break; //Control -> Control
    case 0xFFE9: bucky |= 010000; break; //Alt -> Meta
    default: keyTV(keymap[keysym]); break;
    }
    console.log("Bucky: " + bucky.toString(8));
}

function keyupTV(ev) {
    console.log("Key up: " + ev);
    switch(getKeysym(ev)) {
    case 0xFFE3: bucky &= ~004000; break; //Control -> Control
    case 0xFFE9: bucky &= ~010000; break; //Alt -> Meta
    }
    console.log("Bucky: " + bucky.toString(8));
}

function drawTV() {
    //ctx.fillStyle = "black";
    //ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    //ctx.filter = 'blur(2px) brightness(300%)';
    ctx.strokeStyle = "#00FF00";
    ctx.beginPath();
    ctx.moveTo(30, 10);
    ctx.lineTo(400, lineY);
    ctx.stroke();

    lineY += lineDY;
    if (lineY < 0 || lineY >= 454) {
        lineDY = -lineDY;
        lineY += lineDY;
    }

    var img = ctx.createImageData(16, 1);
    var i;
    for (i = 0; i < 4*16; i += 4) {
        img.data[i+0] = 0;
        img.data[i+1] = Math.floor(Math.random() * 256);
        img.data[i+2] = 0;
        img.data[i+3] = 255;
    }
    ctx.putImageData(img, 420, lineY);
}

function openTV() {
}

var msgLength;
var receiveTYPE = [null, null, receiveFB, receiveWD, null, receiveCLOSE];

function next(fn) {
    ws.on('message', fn);
    if (ws.rQlen() > 0) {
        fn();
    }
}

function receiveDPYKB() {
    if (ws.rQlen() >= 2) {
        var bytes = ws.rQshiftBytes(2);
        console.log("TV display: " + bytes[0]);
        console.log("TV keyboard: " + bytes[1]);
        ws.send([9, 0, 1, 0, 0, 0, 0, 64, 2, 198, 1]);
	var bleh = document.getElementById("dpykb");
        bleh.innerHTML = "Display: " + bytes[0] + "<br>Keyboard: " + bytes[1];
    }
    next(receiveTV);
}

function receiveTV() {
    if (ws.rQlen() >= 2) {
        var bytes = ws.rQshiftBytes(2);
        msgLength = bytes[0] | (bytes[1] << 8);
        //console.log(">> TV message lenth " + msgLength);
        next(receiveMSG);
    }
}

function receiveMSG() {
    if (ws.rQlen() >= msgLength) {
        var type = ws.rQshiftBytes(1)[0];
        msgLength--;
        //console.log(">> TV message type " + type);

        var bytes = ws.rQshiftBytes(msgLength);
        if (type < receiveTYPE.length) {
            receiveTYPE[type](bytes);
        }

        next(receiveTV);
    }
}

function drawWord(data, index, low, high) {
    var word = low | (high << 8);
    var i;
    for (i = 15; i >= 0; i--) {
        data[index++] = 0;
        if (word & (1 << i)) {
            data[index++] = 255;
        } else {
            data[index++] = 0;
        }
        data[index++] = 0;
        data[index++] = 255;
    }
}

function receiveFB(bytes)
{
    console.log(">> FB");

    var x = bytes[0] | (bytes[1] << 8);
    var y = bytes[2] | (bytes[3] << 8);
    var w = bytes[4] | (bytes[5] << 8);
    var h = bytes[6] | (bytes[7] << 8);

    var img = ctx.createImageData(16 * w, h);
    var i, j, k = 8;

    for (j = 0; j < h; j++) {
        for (i = 0; i < w; i++) {
            drawWord(img.data, 4 * 16 * (i + j * w), bytes[k++], bytes[k++]);
        }
    }
    //ctx.putImageData(img, x, y);

    createImageBitmap(img).then(function(tmp) {
        ctx.drawImage(tmp, x, y);
        tmp.close();
    });
}

function receiveWD(bytes)
{
    //console.log(">> WD");

    var img = ctx.createImageData(16, 1);
    var addr = bytes[0] | (bytes[1] << 8);
    var word = bytes[2] | (bytes[3] << 8);
    addr *= 16;
    var i;

    drawWord(img.data, 0, bytes[2], bytes[3]);
    //ctx.putImageData(img, addr % 576, );

    //ctx.filter = 'blur(0.2px) brightness(150%)';
    createImageBitmap(img).then(function(tmp) {
        ctx.drawImage(tmp, addr % 576, Math.floor(addr / 576));
        tmp.close();
    });
}

function receiveCLOSE(bytes)
{
    console.log(">> CLOSE");
    ws.close();
    ws = null;
}

function connectTV() {
    if (ws)
        ws.close();

    ws = new Websock();
    ws.on('message', receiveDPYKB);
    ws.on('open', function(e) {
        console.log(">> WebSockets.onopen");
        openTV();
    });
    ws.on('close', function(e) {
        console.log(">> WebSockets.onclose");
        ws.close();
    });
    ws.on('error', function(e) {
        console.log(">> WebSockets.onerror");
    });

    uri = 'ws://its.pdp10.se:12346';
    ws.open(uri);}

window.onload = function() {
    canvas  = document.getElementById("tv");
    if (canvas.getContext) {
        ctx = canvas.getContext('2d');
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        //setInterval(function() {
            //drawTV();
        //}, 30);
    }

    if (window.attachEvent) {
        window.attachEvent('onkeydown', keydownTV);
        window.attachEvent('onkeyup', keyupTV);
    } else if (window.addEventListener) {
        window.addEventListener('keydown', keydownTV, false);
        window.addEventListener('keyup', keyupTV, false);
    }

    connectTV();
}

function button() {
    if (ws) {
        ws.close();
	document.getElementById("button").value = "Connect";
        ws = null;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
	document.getElementById("button").value = "Disconnect";
        connectTV();
    }
}
