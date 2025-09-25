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

function rhs(p, a, dt) {
    return [ a[0] * p[0] * p[1] - a[2] * p[0] * p[2],
             a[1] * p[1] * p[2] - a[0] * p[1] * p[0],
             a[2] * p[2] * p[0] - a[1] * p[2] * p[1] ];
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
    let param_a = Number(document.getElementById('slider_a').value);
    let param_b = Number(document.getElementById('slider_b').value);
    let param_c = Number(document.getElementById('slider_c').value);
    let dt = Number(document.getElementById('slider_dt').value);
    let rk4 = document.getElementById('toggle_rk4').checked;
    function plot_loop() {
        var canvas = document.getElementById("plot");
        var ctx = canvas.getContext("2d");
        let a = [param_a, param_b, param_c];
        for (let n = 0; n < 100; ++n) {
            ctx.beginPath();
            ctx.moveTo(p[1] * canvas.width, (1.0 - p[2]) * canvas.height);
            if (rk4) {
                k1 = rhs(p, a);
                k2 = rhs(add(p, mult(0.5 * dt, k1)), a);
                k3 = rhs(add(p, mult(0.5 * dt, k2)), a);
                k4 = rhs(add(p, mult(dt, k3)), a);
                p = clip(add(p, mult(dt / 6.0, sum(k1, mult(2.0, k2), mult(2.0, k3), k4))))
            } else {
                p = clip(add(p, mult(dt, rhs(p, a))));
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
    document.getElementById('param_a').textContent = param_a;
    document.getElementById('param_b').textContent = param_b;
    document.getElementById('param_c').textContent = param_c;
    document.getElementById('param_dt').textContent = dt;
    document.getElementById('param_rk4').textContent = rk4 ? "ON" : "OFF";
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
