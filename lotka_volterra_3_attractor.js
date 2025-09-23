let dt = 0.5;

function clip(x) {
    return (x < 0) ? 0 :
        (x > 1.0) ? 1.0 : x;
}

function reaction(p, a, b, dt) {
    return [ clip(p[0] + (a[0] * p[0] + p[0] * (b[0][1] * p[1] + b[0][2] * p[2])) * dt),
             clip(p[1] + (a[1] * p[1] + p[1] * (b[1][0] * p[0] + b[1][2] * p[2])) * dt),
             clip(p[2] + (a[2] * p[2] + p[2] * (b[2][0] * p[0] + b[2][1] * p[1])) * dt) ];
}
function hex02(x) {
    let s = Math.ceil(x).toString(16);
    if (s.length < 2) {
        s = "0" + s;
    }
    return s;
}
function color_of(p) {
    return "#" + hex02(p[2] * 255) + hex02(p[0] * 255) + hex02(p[1] * 255);
}

window.onload = function() {
    let p = [0.5, 0.5, 0.5];
    let count = 0;
    console.log("initializing sliders");
    let param_a1 = Number(document.getElementById('slider_a1').value);
    let param_a2 = Number(document.getElementById('slider_a2').value);
    let param_a3 = Number(document.getElementById('slider_a3').value);
    let param_b12 = Number(document.getElementById('slider_b12').value);
    let param_b21 = Number(document.getElementById('slider_b21').value);
    let param_b23 = Number(document.getElementById('slider_b23').value);
    let param_b32 = Number(document.getElementById('slider_b32').value);
    function plot_loop() {
        var canvas = document.getElementById("plot");
        var ctx = canvas.getContext("2d");
        let a = [param_a1, -param_a2, -param_a3];
        let b = [[0,         -param_b12, 0         ],
                 [param_b21, 0,          -param_b23],
                 [0,         param_b32,  0         ]]
        for (let n = 0; n < 100; ++n) {
            ctx.beginPath();
            ctx.moveTo(p[1] * canvas.width, (1.0 - p[2]) * canvas.height);
            p = reaction(p, a, b, dt);
            ctx.lineTo(p[1] * canvas.width, (1.0 - p[2]) * canvas.height);
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
        p = [0.5, 0.5, 0.5];
        count = 0;
        var canvas = document.getElementById("plot");
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        window.requestAnimationFrame(plot_loop);
    }
    document.getElementById('param_a1').textContent = param_a1;
    document.getElementById('param_a2').textContent = param_a2;
    document.getElementById('param_a3').textContent = param_a3;
    document.getElementById('param_b12').textContent = param_b12;
    document.getElementById('param_b21').textContent = param_b21;
    document.getElementById('param_b23').textContent = param_b23;
    document.getElementById('param_b32').textContent = param_b32;
    document.getElementById('slider_a1').addEventListener(
        'input', function(event) {
            param_a = Number(this.value);
            document.getElementById('param_a1').textContent = param_a;
            replot();
        });
    document.getElementById('slider_a2').addEventListener(
        'input', function(event) {
            param_a2 = Number(this.value);
            document.getElementById('param_a2').textContent = param_a2;
            replot();
        });
    document.getElementById('slider_a3').addEventListener(
        'input', function(event) {
            param_a3 = Number(this.value);
            document.getElementById('param_a3').textContent = param_a3;
            replot();
        });
    document.getElementById('slider_b12').addEventListener(
        'input', function(event) {
            param_b12 = Number(this.value);
            document.getElementById('param_b12').textContent = param_b12;
            replot();
        });
    document.getElementById('slider_b21').addEventListener(
        'input', function(event) {
            param_b21 = Number(this.value);
            document.getElementById('param_b21').textContent = param_b21;
            replot();
        });
    document.getElementById('slider_b23').addEventListener(
        'input', function(event) {
            param_b23 = Number(this.value);
            document.getElementById('param_b23').textContent = param_b23;
            replot();
        });
    document.getElementById('slider_b32').addEventListener(
        'input', function(event) {
            param_b32 = Number(this.value);
            document.getElementById('param_b32').textContent = param_b32;
            replot();
        });
    replot();
};
