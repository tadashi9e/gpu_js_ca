let dt = 0.5;

function clip(x) {
    return (x < 0) ? 0 :
        (x > 1.0) ? 1.0 : x;
}

function reaction(p, a, b, dt) {
    return [ clip(p[0] + (a[0] * p[0] + p[0] * b[0][1] * p[1]) * dt),
             clip(p[1] + (a[1] * p[1] + p[1] * b[1][0] * p[0]) * dt) ];
}
function hex02(x) {
    let s = Math.ceil(x).toString(16);
    if (s.length < 2) {
        s = "0" + s;
    }
    return s;
}
function color_of(p) {
    return "#" + hex02(p[1] * 255) + hex02(p[0] * 255) + "00";
}

window.onload = function() {
    let p = [0.5, 0.5];
    let count = 0;
    console.log("initializing sliders");
    let param_a = Number(document.getElementById('slider_a').value);
    let param_b = Number(document.getElementById('slider_b').value);
    let param_c = Number(document.getElementById('slider_c').value);
    let param_d = Number(document.getElementById('slider_d').value);
    function plot_loop() {
        var canvas = document.getElementById("plot");
        var ctx = canvas.getContext("2d");
        let a = [param_a, -param_c];
        let b = [[0,      -param_b],
                 [param_d, 0]]
        for (let n = 0; n < 100; ++n) {
            ctx.beginPath();
            ctx.moveTo(p[0] * canvas.width, (1.0 - p[1]) * canvas.height);
            p = reaction(p, a, b, dt);
            ctx.lineTo(p[0] * canvas.width, (1.0 - p[1]) * canvas.height);
            ctx.strokeStyle = color_of(p);
            ctx.stroke();
            if (count > 10000) {
                return;
            }
            ++count;
        }
        window.requestAnimationFrame(plot_loop);
    }
    function replot() {
        p = [0.5, 0.5];
        count = 0;
        var canvas = document.getElementById("plot");
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        window.requestAnimationFrame(plot_loop);
    }
    document.getElementById('param_a').textContent = param_a;
    document.getElementById('param_b').textContent = param_b;
    document.getElementById('param_c').textContent = param_c;
    document.getElementById('param_d').textContent = param_d;
    document.getElementById('slider_a').addEventListener(
        'input', function(event) {
            param_a = Number(this.value);
            document.getElementById('param_a').textContent = param_a;
            replot();
        });
    document.getElementById('slider_b').addEventListener(
        'input', function(event) {
            param_b = Number(this.value);
            document.getElementById('param_b').textContent = param_b;
            replot();
        });
    document.getElementById('slider_c').addEventListener(
        'input', function(event) {
            param_c = Number(this.value);
            document.getElementById('param_c').textContent = param_c;
            replot();
        });
    document.getElementById('slider_d').addEventListener(
        'input', function(event) {
            param_d = Number(this.value);
            document.getElementById('param_d').textContent = param_d;
            replot();
        });
    replot();
};
