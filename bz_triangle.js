// Belousov–Zhabotinsky Reaction
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
    let dt = Number(document.getElementById('slider_dt').value);
    let D = Number(document.getElementById('slider_D').value);
    document.getElementById('param_a').textContent = param_a;
    document.getElementById('param_b').textContent = param_b;
    document.getElementById('param_c').textContent = param_c;
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
        const dy = (Math.floor((x+y) % 2) == 0) ? 1 : -1;
        return (get(cells, h, w, y + dy, x) +
                get(cells, h, w, y, x - 1) +
                get(cells, h, w, y, x + 1)) / 3.0;
    }
    gpu.addFunction(average);

    console.log("adding GPU function: clip");
    function clip(v) {
        if (v < 0.0) {
            return 0.0;
        }
        if (v > 1.0) {
            return 1.0;
        }
        return v;
    }
    gpu.addFunction(clip);

    console.log("adding GPU function: reaction");
    function reaction(a, b, c, dt, param_a, param_c) {
        return clip(a + a * (param_a * b - param_c * c) * dt);
    }
    gpu.addFunction(reaction);

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

    console.log("creating kernel: bz_diffusion");
    const bz_diffusion = gpu.createKernel(
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
    bz_diffusion.immutable = true;

    console.log("creating kernel: bz_reaction");
    const bz_reaction = gpu.createKernel(
        function(a, b, c, dt, param_a, param_c) {
            const w = this.constants.width;
            const h = this.constants.height;
            const x = this.thread.x;
            const y = this.thread.y;
            return reaction(
                get(a, h, w, y, x),
                get(b, h, w, y, x),
                get(c, h, w, y, x),
                dt,
                param_a,
                param_c);
        })
          .setConstants({width: WIDTH, height: HEIGHT})
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);
    bz_reaction.immutable = true;

    console.log("creating kernel: bz_render");
    const bz_render = gpu.createKernel(
        function(a, b, c) {
            const x = this.thread.x;
            const y = this.thread.y;
            this.color(a[y][x], b[y][x], c[y][x], 1.0);
        })
          .setGraphical(true)
          .setOutput([WIDTH, HEIGHT]);
    // --------------------------------------------------
    function create_random_center() {
        let spc = [];
        const r = Math.min(WIDTH, HEIGHT) / 3;
        for (let y = 0; y < HEIGHT; y++) {
            let line = [];
            for (let x = 0; x < WIDTH; x++) {
                const v =
                      ((x - WIDTH / 2)**2 + (y - HEIGHT / 2)**2 < r ** 2)
                      ? Math.random() : 0.5;
                line.push(v);
            }
            spc.push(line);
        }
        return to_texture(spc);
    }
    var a;
    var b;
    var c;
    create_random_cells = function() {
        console.log("initializing: cell space a");
        a = create_random_center();
        console.log("initializing: cell space b");
        b = create_random_center();
        console.log("initializing: cell space c");
        c = create_random_center();
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
    bz_render(a, b, c);
    const canvas = bz_render.canvas;
    document.getElementById("gpu").appendChild(canvas);
    // --------------------------------------------------
    console.log("start rendering...");
    function render_loop() {
        let a2 = bz_diffusion(a, D * dt);
        let b2 = bz_diffusion(b, D * dt);
        let c2 = bz_diffusion(c, D * dt);
        a.delete(); b.delete(); c.delete();
        a = bz_reaction(a2, b2, c2, dt, param_a, param_c);
        b = bz_reaction(b2, c2, a2, dt, param_b, param_a);
        c = bz_reaction(c2, a2, b2, dt, param_c, param_b);
        a2.delete(); b2.delete(); c2.delete();
        bz_render(a, b, c);
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
