// Lotka-Volterra equations
const WIDTH = 800;
const HEIGHT = 800;

let prev_count = 0;
let count = 0;

var create_random_cells;

window.onload = function() {
    console.log("initializing sliders");
    let param_a = Number(document.getElementById('slider_a').value);
    let param_b = Number(document.getElementById('slider_b').value);
    let param_c = Number(document.getElementById('slider_c').value);
    let param_d = Number(document.getElementById('slider_d').value);
    let dt = Number(document.getElementById('slider_dt').value);
    let D = Number(document.getElementById('slider_D').value);
    document.getElementById('param_a').textContent = param_a;
    document.getElementById('param_b').textContent = param_b;
    document.getElementById('param_c').textContent = param_c;
    document.getElementById('param_d').textContent = param_d;
    document.getElementById('param_dt').textContent = dt;
    document.getElementById('param_D').textContent = D;
    document.getElementById('slider_a').addEventListener(
        'input', function(event) {
            param_a = Number(this.value);
            document.getElementById('param_a').textContent = param_a;
        });
    document.getElementById('slider_b').addEventListener(
        'input', function(event) {
            param_b = Number(this.value);
            document.getElementById('param_b').textContent = param_b;
        });
    document.getElementById('slider_c').addEventListener(
        'input', function(event) {
            param_c = Number(this.value);
            document.getElementById('param_c').textContent = param_c;
        });
    document.getElementById('slider_d').addEventListener(
        'input', function(event) {
            param_d = Number(this.value);
            document.getElementById('param_d').textContent = param_d;
        });
    document.getElementById('slider_dt').addEventListener(
        'input', function(event) {
            dt = Number(this.value);
            document.getElementById('param_dt').textContent = dt;
        });
    document.getElementById('slider_D').addEventListener(
        'input', function(event) {
            D = Number(this.value);
            document.getElementById('param_D').textContent = D;
        });

    console.log("new GPU");
    let gpu;
    try {
        gpu = new GPU();
    } catch (error) {
        console.error(error);
        console.log("retrying new GPU...");
        gpu = new GPU.GPU();
    }
    // --------------------------------------------------
    console.log("adding GPU function: get");
    function get(cells, h, w, y, x) {
        return cells
        [(y < 0) ? (y + h) : (y >= h) ? (y - h) : y]
        [(x < 0) ? (x + w) : (x >= w) ? (x - w) : x];
    }
    gpu.addFunction(get);

    console.log("adding GPU function: average");
    function average(cells, h, w, y, x) {
        return (get(cells, h, w, y-1, x) +
                get(cells, h, w, y+1, x) +
                get(cells, h, w, y, x+1) +
                get(cells, h, w, y, x-1)) / 4.0;
    }
    gpu.addFunction(average);

    console.log("adding GPU function: limit");
    function limit(v) {
        if (v < 0.0) {
            return 0.0;
        }
        if (v > 1.0) {
            return 1.0;
        }
        return v;
    }
    gpu.addFunction(limit);

    console.log("creating kernel: to_texture");
    let to_texture = gpu.createKernel(
        function(data) {
            const x = this.thread.x;
            const y = this.thread.y;
            return data[y][x];
        })
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);
    to_texture.immutable = true;

    console.log("creating kernel: lv_diffusion");
    const lv_diffusion = gpu.createKernel(
        function(src, rate) {
            const w = this.constants.width;
            const h = this.constants.height;
            const x = this.thread.x;
            const y = this.thread.y;
            return (1.0 - rate) * get(src, h, w, y, x) +
                rate * average(src, h, w, y, x);
        })
          .setConstants({width: WIDTH, height: HEIGHT})
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);
    lv_diffusion.immutable = true;

    console.log("creating kernel: lv_reaction");
    const lv_reaction_prey = gpu.createKernel(
        function(prey, predator, dt, param_a, param_b) {
            const w = this.constants.width;
            const h = this.constants.height;
            const x = this.thread.x;
            const y = this.thread.y;
            const a = get(prey, h, w, y, x);
            const b = get(predator, h, w, y, x);
            return limit(a
                         + param_a * a * dt
                         - param_b * a * b * dt);
        })
          .setConstants({width: WIDTH, height: HEIGHT})
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);
    lv_reaction_prey.immutable = true;
    const lv_reaction_predator = gpu.createKernel(
        function(prey, predator, dt, param_c, param_d) {
            const w = this.constants.width;
            const h = this.constants.height;
            const x = this.thread.x;
            const y = this.thread.y;
            const a = get(prey, h, w, y, x);
            const b = get(predator, h, w, y, x);
            return limit(b
                         - param_c * b * dt
                         + param_d * a * b * dt);
        })
          .setConstants({width: WIDTH, height: HEIGHT})
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);
    lv_reaction_predator.immutable = true;

    console.log("creating kernel: lv_render");
    const lv_render = gpu.createKernel(
        function(prey, predator) {
            const x = this.thread.x;
            const y = this.thread.y;
            this.color(predator[y][x], prey[y][x], 0, 1.0);
        })
          .setGraphical(true)
          .setOutput([WIDTH, HEIGHT]);
    // --------------------------------------------------
    function create_random_center(ratio) {
        let spc = [];
        const r = Math.min(WIDTH, HEIGHT) / 3;
        for (let y = 0; y < HEIGHT; y++) {
            let line = [];
            for (let x = 0; x < WIDTH; x++) {
                const v =
                      (((x - WIDTH / 2)**2 + (y - HEIGHT / 2)**2 < r ** 2) &&
                       Math.random() < ratio) ? 1 : 0;
                line.push(v);
            }
            spc.push(line);
        }
        return to_texture(spc);
    }
    var prey;
    var predator;
    create_random_cells = function() {
        console.log("initializing: cell space prey");
        prey = create_random_center(0.5);
        console.log("initializing: cell space predator");
        predator = create_random_center(0.01);
    }
    create_random_cells();
    function create_random(mid, dist) {
        let spc = [];
        for (let y = 0; y < HEIGHT; y++) {
            let line = [];
            for (let x = 0; x < WIDTH; x++) {
                // line.push(1.2);
                line.push(mid + dist * Math.random());
            }
            spc.push(line);
        }
        return to_texture(spc);
    }
    console.log("initializing: canvas setup & initial rendering");
    lv_render(prey, predator);
    const canvas = lv_render.canvas;
    document.getElementById("gpu").appendChild(canvas);
    // --------------------------------------------------
    console.log("start rendering...");
    function render_loop() {
        let prey2 = lv_diffusion(prey, D * dt);
        let predator2 = lv_diffusion(predator, D * dt);
        prey.delete(); predator.delete();
        prey = lv_reaction_prey(prey2, predator2, dt, param_a, param_b);
        predator = lv_reaction_predator(prey2, predator2, dt, param_c, param_d);
        prey2.delete(); predator2.delete();
        lv_render(prey, predator);
        window.requestAnimationFrame(render_loop);
        count += 1;
    }
    window.requestAnimationFrame(render_loop);
    // --------------------------------------------------
    console.log("start displaying fps...");
    setInterval(function() {
        document.getElementById("stat").textContent =
            'generation[' + count + ']: ' + (count - prev_count) + ' fps';
        prev_count = count;
    }, 1000);
};
function restart() {
    create_random_cells();
    prev_count = 0;
    count = 0;
}
