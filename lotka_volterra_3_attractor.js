LOOP_MAX = 100000

function mult(num, vec) {
    let retv = [];
    for (let i = 0; i < vec.length; i++) {
        retv.push(num * vec[i]);
    }
    return retv;
}
function add(vec1, vec2) {
    let retv = [];
    for (let i = 0; i < vec1.length; i++) {
        retv.push(vec1[i] + vec2[i]);
    }
    return retv;
}
function sum(v1, v2, v3, v4) {
    let retv = [];
    for (let i = 0; i < v1.length; i++) {
        retv.push(v1[i] + v2[i] + v3[i] + v4[i]);
    }
    return retv;
}
function clip1(x) {
    return (x < 0) ? 0 :
        (x > 1.0) ? 1.0 : x;
}
function clip(vec) {
    let retv = [];
    for (let i = 0; i < vec.length; i++) {
        let x = vec[i];
        retv.push(clip1(x));
    }
    return retv;
}

function rhs(p, a, b, dt) {
    return [ a[0] * p[0] + p[0] * (b[0][1] * p[1] + b[0][2] * p[2]),
             a[1] * p[1] + p[1] * (b[1][0] * p[0] + b[1][2] * p[2]),
             a[2] * p[2] + p[2] * (b[2][0] * p[0] + b[2][1] * p[1]) ];
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
    let loop = 0;
    console.log("initializing sliders");
    let param_a1 = Number(document.getElementById('slider_a1').value);
    let param_a2 = Number(document.getElementById('slider_a2').value);
    let param_a3 = Number(document.getElementById('slider_a3').value);
    let param_b12 = Number(document.getElementById('slider_b12').value);
    let param_b21 = Number(document.getElementById('slider_b21').value);
    let param_b23 = Number(document.getElementById('slider_b23').value);
    let param_b32 = Number(document.getElementById('slider_b32').value);
    let dt = Number(document.getElementById('slider_dt').value);
    let rk4 = document.getElementById('toggle_rk4').checked;
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
            if (rk4) {
                k1 = rhs(p, a, b);
                k2 = rhs(add(p, mult(0.5 * dt, k1)), a, b);
                k3 = rhs(add(p, mult(0.5 * dt, k2)), a, b);
                k4 = rhs(add(p, mult(dt, k3)), a, b);
                p = clip(add(p, mult(dt / 6.0, sum(k1, mult(2.0, k2), mult(2.0, k3), k4))))
            } else {
                p = clip(add(p, mult(dt, rhs(p, a, b))));
            }
            ctx.lineTo(p[1] * canvas.width, (1.0 - p[2]) * canvas.height);
            ctx.strokeStyle = color_of(p);
            ctx.stroke();
            if (loop > LOOP_MAX) {
                return;
            }
            ++loop;
        }
        window.requestAnimationFrame(plot_loop);
    }
    function replot() {
        p = [0.5, 0.5, 0.5];
        loop = 0;
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
    document.getElementById('param_dt').textContent = dt;
    document.getElementById('param_rk4').textContent = rk4 ? "ON" : "OFF";
    document.getElementById('slider_a1').addEventListener(
        'input', function(event) {
            param_a1 = Number(this.value);
            document.getElementById('param_a1').textContent = param_a1;
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
    document.getElementById('slider_dt').addEventListener(
        'input', function(event) {
            dt = Number(this.value);
            document.getElementById('param_dt').textContent = dt;
            replot();
        });
    document.getElementById('toggle_rk4').addEventListener(
        'input', function(event) {
            rk4 = this.checked;
            document.getElementById('param_rk4').textContent = rk4 ? "ON" : "OFF";
            replot();
        });
    replot();
};
