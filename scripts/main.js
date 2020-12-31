let WIDTH = 800;
let HEIGHT = WIDTH / 4 * 3;
let SCALE = 4;

const spriteSheetSize = 512;
let spritesheet;

const resourceReady = 1;
let loadedResources = 0;

let previousTime = 0;
let passedTime = 0;
let msPerFrame = 1000.0 / 60.0;
let timer = 0;
let frameCounter = 0;

let cvs;
let gfx;

let frameCounterElement;

let globalAlpha = 255;

let pause = false
let time = 0;

let view;

let keys = { up: false, down: false, left: false, right: false, q: false, e: false };
let mouse = { down: false, lastX: 0.0, lastY: 0.0, currX: 0.0, currY: 0.0, dx: 0.0, dy: 0.0 };

let player;

const FOV = HEIGHT / SCALE
const zClipNear = 0.01;
let backFaceCulling = false;

/**
 * Creates a pseudo-random value generator. The seed must be an integer.
 *
 * Uses an optimized version of the Park-Miller PRNG.
 * http://www.firstpr.com.au/dsp/rand31/
 */
function Random(seed)
{
    this._seed = seed % 2147483647;
    if (this._seed <= 0) this._seed += 2147483646;
}

/**
 * Returns a pseudo-random value between 1 and 2^32 - 2.
 */
Random.prototype.next = function ()
{
    return this._seed = this._seed * 16807 % 2147483647;
};


/**
 * Returns a pseudo-random floating point number in range [0, 1).
 */
Random.prototype.nextFloat = function (opt_minOrMax, opt_max)
{
    // We know that result of next() will be 1 to 2147483646 (inclusive).
    return (this.next() - 1) / 2147483646;
};

class Vector2
{
    constructor(x, y)
    {
        this.x = x;
        this.y = y;
    }

    normalize()
    {
        let len = this.getLength();

        this.x /= len;
        this.y /= len;
    }

    getLength()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    dot(v)
    {
        return this.x * v.x + this.y * v.y;
    }

    cross(v)
    {
        return this.y * v.x - this.x * v.y;
    }

    add(v)
    {
        return new Vector2(this.x + v.x, this.y + v.y);
    }

    sub(v)
    {
        return new Vector2(this.x - v.x, this.y - v.y);
    }

    div(v)
    {
        return new Vector2(this.x / v, this.y / v);
    }

    mul(v)
    {
        return new Vector2(this.x * v, this.y * v);
    }

    equals(v)
    {
        return this.x == v.x && this.y == v.y;
    }
}

class Vector3
{
    constructor(x, y, z)
    {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    normalize()
    {
        let len = this.getLength();

        this.x /= len;
        this.y /= len;
        this.z /= len;
    }

    getLength()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    dot(v)
    {
        return this.x * v.x + this.y * v.y * this.z * v.z;
    }

    cross(v)
    {
        return Vector3(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.z * v.x);
    }

    add(v)
    {
        return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    sub(v)
    {
        return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    div(v)
    {
        return new Vector3(this.x / v, this.y / v, this.z / v);
    }

    mul(v)
    {
        return new Vector3(this.x * v, this.y * v, this.z * v);
    }

    equals(v)
    {
        return this.x == v.x && this.y == v.y && this.z == v.z;
    }
}

class Vertex
{
    constructor(pos, color, texCoord)
    {
        this.pos = pos;

        if (typeof color == "number") this.color = new Vector3((color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
        else if (color == undefined) this.color = new Vector3(255, 0, 255);
        else this.color = color;

        if (texCoord == undefined) this.texCoord = new Vector2(0, 0);
        else this.texCoord = texCoord;
    }
}

class Player
{
    constructor()
    {
        this.speed = 3.0;
        this.rotSpeed = 60.0;

        this.pos = new Vector3(0.0, 0.0, 0.0);
        this.rot = new Vector3(0.0, 0.0, 0.0);

        this.sin = new Vector3(0.0, 0.0, 0.0);
        this.cos = new Vector3(0.0, 0.0, 0.0);
    }

    update(delta)
    {
        this.sin.x = Math.sin(-this.rot.x * Math.PI / 180.0); this.cos.x = Math.cos(-this.rot.x * Math.PI / 180.0);
        this.sin.y = Math.sin(-this.rot.y * Math.PI / 180.0); this.cos.y = Math.cos(-this.rot.y * Math.PI / 180.0);
        this.sin.z = Math.sin(-this.rot.z * Math.PI / 180.0); this.cos.z = Math.cos(-this.rot.z * Math.PI / 180.0);

        // Right hand coordinate system

        let ax = 0.0;
        let az = 0.0;

        if (keys.left) ax--;
        if (keys.right) ax++;
        if (keys.up) az--;
        if (keys.down) az++;

        this.pos.x += (this.cos.y * ax + this.sin.y * az) * this.speed * delta;
        this.pos.z += (-this.sin.y * ax + this.cos.y * az) * this.speed * delta;

        if (keys.space) this.pos.y += this.speed * delta;
        if (keys.ctrl) this.pos.y -= this.speed * delta;
        if (keys.q) this.rot.y -= this.rotSpeed * delta;
        if (keys.e) this.rot.y += this.rotSpeed * delta;

        if (mouse.down)
        {
            this.rot.y += mouse.dx * 0.1 * this.rotSpeed * delta;
            this.rot.x += mouse.dy * 0.1 * this.rotSpeed * delta;
        }
    }
}

class Bitmap
{
    constructor(width, height)
    {
        this.width = width;
        this.height = height;
        this.pixels = new Uint32Array(width * height);
    }

    render(bitmap, ox, oy)
    {
        for (let y = 0; y < bitmap.height; y++)
        {
            let yy = oy + y;
            if (yy < 0 || yy >= this.height)
                continue;
            for (let x = 0; x < bitmap.width; x++)
            {
                let xx = ox + x;
                if (xx < 0 || xx >= this.width)
                    continue;

                let color = bitmap.pixels[x + y * bitmap.width];

                this.pixels[xx + yy * this.width] = color;
            }
        }
    }

    clear(color)
    {
        for (let i = 0; i < this.pixels.length; i++)
            this.pixels[i] = color;
    }
}

class View extends Bitmap
{
    constructor(width, height)
    {
        super(width, height);

        this.zBuffer = new Float32Array(width * height);
    }

    update(delta)
    {
    }

    renderView()
    {
        for (let i = 0; i < this.zBuffer.length; i++)
            this.zBuffer[i] = 10000;

        let r = new Random(123);

        // this.drawPoint(new Vertex(new Vector3(1, 1, -1), 0xff00ff));

        // for (let i = 0; i < 1000; i++)
        //     this.drawPoint(new Vertex(new Vector3(r.nextFloat() * 1 - 0.5, r.nextFloat() * 1 - 0.5, -1), 0xff00ff));

        for (let i = 0; i < 1000; i++)
            this.drawPoint(new Vertex(new Vector3(r.nextFloat() * 1 - 0.5, r.nextFloat() * 1 - 0.5, -4), 0xffffff));


        this.drawTriangle(
            new Vertex(new Vector3(-1, -1, -3), 0x808080, new Vector2(0, 1)),
            new Vertex(new Vector3(-1, 1, -3), 0x000000, new Vector2(0, 0)),
            new Vertex(new Vector3(1, 1, -3), 0x808080, new Vector2(1, 0)), spritesheet);
        this.drawTriangle(
            new Vertex(new Vector3(-1, -1, -3), 0x808080, new Vector2(0, 1)),
            new Vertex(new Vector3(1, 1, -3), 0x808080, new Vector2(1, 0)),
            new Vertex(new Vector3(1, -1, -3), 0xffffff, new Vector2(1, 1)), spritesheet);

        this.drawTriangle(
            new Vertex(new Vector3(-1, -1, -2), 0x808080, new Vector2(0, 1)),
            new Vertex(new Vector3(-1, 1, -5), 0x000000, new Vector2(0, 0)),
            new Vertex(new Vector3(1, 1, -5), 0x808080, new Vector2(1, 0)));
        this.drawTriangle(
            new Vertex(new Vector3(-1, -1, -2), 0x808080, new Vector2(0, 1)),
            new Vertex(new Vector3(1, 1, -5), 0x808080, new Vector2(1, 0)),
            new Vertex(new Vector3(1, -1, -2), 0xffffff, new Vector2(1, 1)));

        this.drawLine(new Vertex(new Vector3(-7, 0, 2), 0xff0000), new Vertex(new Vector3(8, 0.0, -8), 0x00ff00));
        this.drawLine(new Vertex(new Vector3(-3, 0, 1), 0x000000), new Vertex(new Vector3(2, 0.5, 2), 0xffffff));
    }

    drawPoint(v)
    {
        v.pos = this.playerTransform(v.pos);

        if (v.pos.z < zClipNear) return;

        let sx = int((v.pos.x / v.pos.z * FOV + WIDTH / 2.0));
        let sy = int((v.pos.y / v.pos.z * FOV + HEIGHT / 2.0));

        this.renderPixel(new Vector3(sx, sy, v.pos.z), v.color);
    }

    drawLine(v0, v1)
    {
        let vp0 = this.playerTransform(v0.pos);
        let vp1 = this.playerTransform(v1.pos);

        vp0.color = v0.color;
        vp1.color = v1.color;

        // z-Clipping
        if (vp0.z < zClipNear && vp1.z < zClipNear) return undefined;

        if (vp0.z < zClipNear)
        {
            let per = (zClipNear - vp0.z) / (vp1.z - vp0.z);
            vp0 = vp0.add(vp1.sub(vp0).mul(per));
            vp0.color = lerpVector2(v0.color, v1.color, per);
        }

        if (vp1.z < zClipNear)
        {
            let per = (zClipNear - vp1.z) / (vp0.z - vp1.z);
            vp1 = vp1.add(vp0.sub(vp1).mul(per));
            vp1.color = lerpVector2(v1.color, v0.color, per);
        }

        let p0 = new Vector2(vp0.x / vp0.z * FOV + WIDTH / 2.0 - 0.5, vp0.y / vp0.z * FOV + HEIGHT / 2.0 - 0.5);
        let p1 = new Vector2(vp1.x / vp1.z * FOV + WIDTH / 2.0 - 0.5, vp1.y / vp1.z * FOV + HEIGHT / 2.0 - 0.5);

        // Render Left to Right
        if (p1.x < p0.x)
        {
            let tmp = p0;
            p0 = p1;
            p1 = tmp;

            tmp = vp0;
            vp0 = vp1;
            vp1 = tmp;
        }

        let x0 = Math.ceil(p0.x);
        let y0 = Math.ceil(p0.y);
        let x1 = Math.ceil(p1.x);
        let y1 = Math.ceil(p1.y);

        if (x0 < 0) x0 = 0;
        if (x1 > WIDTH) x1 = WIDTH;
        if (y0 < 0) y0 = 0;
        if (y1 > HEIGHT) y1 = HEIGHT;

        let dx = p1.x - p0.x;
        let dy = p1.y - p0.y;

        let m = Math.abs(dy / dx);

        if (m <= 1)
        {
            for (let x = x0; x < x1; x++)
            {
                let per = (x - p0.x) / (p1.x - p0.x);

                let y = p0.y + (p1.y - p0.y) * per;
                let z = 1 / ((1 - per) / vp0.z + per / vp1.z);

                let c = lerp2AttributeVec3(vp0.color, vp1.color, (1 - per), per, vp0.z, vp1.z, z);

                this.renderPixel(new Vector3(int(x), int(y), z), c);
            }
        }
        else
        {
            if (p1.y < p0.y)
            {
                let tmp = p0;
                p0 = p1;
                p1 = tmp;

                tmp = vp0;
                vp0 = vp1;
                vp1 = tmp;
            }

            x0 = Math.ceil(p0.x);
            y0 = Math.ceil(p0.y);
            x1 = Math.ceil(p1.x);
            y1 = Math.ceil(p1.y);

            if (x0 < 0) x0 = 0;
            if (x1 > WIDTH) x1 = WIDTH;
            if (y0 < 0) y0 = 0;
            if (y1 > HEIGHT) y1 = HEIGHT;

            for (let y = y0; y < y1; y++)
            {
                let per = (y - p0.y) / (p1.y - p0.y);

                let x = p0.x + (p1.x - p0.x) * per;
                let z = 1 / ((1 - per) / vp0.z + per / vp1.z);

                let c = lerp2AttributeVec3(vp0.color, vp1.color, (1 - per), per, vp0.z, vp1.z, z);
                this.renderPixel(new Vector3(int(x), int(y), z), c);
            }
        }

        return { x0: x0, y0: y0, x1: x1, y1: y1 };
    }

    drawTriangle(v0, v1, v2, tex)
    {
        if (tex == undefined)
        {
            tex = new Bitmap(64, 64);
            tex.clear(0xff00ff);
        }

        let vp0 = this.playerTransform(v0.pos);
        let vp1 = this.playerTransform(v1.pos);
        let vp2 = this.playerTransform(v2.pos);

        let z0 = vp0.z;
        let z1 = vp1.z;
        let z2 = vp2.z;

        if (vp0.z < zClipNear && vp1.z < zClipNear && vp2.z < zClipNear) return;

        let p0 = new Vector2(vp0.x / vp0.z * FOV + WIDTH / 2.0 - 0.5, vp0.y / vp0.z * FOV + HEIGHT / 2.0 - 0.5);
        let p1 = new Vector2(vp1.x / vp1.z * FOV + WIDTH / 2.0 - 0.5, vp1.y / vp1.z * FOV + HEIGHT / 2.0 - 0.5);
        let p2 = new Vector2(vp2.x / vp2.z * FOV + WIDTH / 2.0 - 0.5, vp2.y / vp2.z * FOV + HEIGHT / 2.0 - 0.5);

        let minX = Math.ceil(Math.min(p0.x, p1.x, p2.x));
        let maxX = Math.ceil(Math.max(p0.x, p1.x, p2.x));
        let minY = Math.ceil(Math.min(p0.y, p1.y, p2.y));
        let maxY = Math.ceil(Math.max(p0.y, p1.y, p2.y));

        if (minX < 0) minX = 0;
        if (minY < 0) minY = 0;
        if (maxX > WIDTH) maxX = WIDTH;
        if (maxY > HEIGHT) maxY = HEIGHT;

        let v10 = new Vector2(p1.x - p0.x, p1.y - p0.y);
        let v21 = new Vector2(p2.x - p1.x, p2.y - p1.y);
        let v02 = new Vector2(p0.x - p2.x, p0.y - p2.y);
        let v20 = new Vector2(p2.x - p0.x, p2.y - p0.y);

        let area = v10.cross(v20);

        // Culling back faces
        if (area < 0) return;

        for (let y = minY; y < maxY; y++)
        {
            for (let x = minX; x < maxX; x++)
            {
                let p = new Vector3(x, y);

                let w0 = v21.cross(p.sub(p1));
                let w1 = v02.cross(p.sub(p2));
                let w2 = v10.cross(p.sub(p0));

                // Render Clock wise
                if (w0 >= 0 && w1 >= 0 && w2 >= 0)
                {
                    w0 /= area;
                    w1 /= area;
                    w2 /= area;

                    let z = 1.0 / (w0 / z0 + w1 / z1 + w2 / z2);

                    let t = lerp3AttributeVec2(v0.texCoord, v1.texCoord, v2.texCoord, w0, w1, w2, z0, z1, z2, z);
                    // let c = lerpAttribute(v0.color, v1.color, v2.color, w0, w1, w2, z0, z1, z2, z);

                    let tx = Math.floor(tex.width * t.x);
                    let ty = Math.floor(tex.height * t.y);

                    if (tx < 0) tx = 0;
                    if (tx >= tex.width) tx = tex.width - 1;
                    if (ty < 0) ty = 0;
                    if (ty >= tex.height) ty = tex.height - 1;

                    let c = tex.pixels[tx + ty * tex.width];

                    this.renderPixel(new Vector3(x, y, z), c);
                }
            }
        }
    }

    playerTransform(pos)
    {
        // Right-hand coordinate system
        let ox = pos.x - player.pos.x;
        let oy = pos.y - player.pos.y;
        let oz = -pos.z + player.pos.z;

        // Combined XYZ Rotation
        let xx = ox * (+player.cos.y * player.cos.z) + oy * (-player.cos.y * player.sin.z) + oz * (+player.sin.y);
        let yy = ox * (+player.sin.x * player.sin.y * player.cos.z + player.cos.x * player.sin.z) + oy * (-player.sin.x * player.sin.y * player.sin.z + player.cos.x * player.cos.z) + oz * (-player.sin.x * player.cos.y);
        let zz = ox * (-player.cos.x * player.sin.y * player.cos.z + player.sin.x * player.sin.z) + oy * (+player.cos.x * player.sin.y * player.sin.z + player.sin.x * player.cos.z) + oz * (+player.cos.x * player.cos.y);

        return new Vector3(xx, yy, zz);
    }

    renderPixel(p, c)
    {
        if (!this.checkOutOfScreen(p) && p.z < this.zBuffer[p.x + (HEIGHT - 1 - p.y) * WIDTH])
        {
            if (typeof c != "number")
                c = convertColor(c);

            this.pixels[p.x + (HEIGHT - 1 - p.y) * this.width] = c;
            this.zBuffer[p.x + (HEIGHT - 1 - p.y) * this.width] = p.z;
        }
    }

    checkOutOfScreen(p)
    {
        return p.x < 0 || p.x >= this.width || p.y < 0 || p.y >= this.height;
    }

}

function start()
{
    init();
    run();
}

function init()
{
    cvs = document.getElementById("canvas");

    const image = new Image();
    image.src = "https://raw.githubusercontent.com/Sopiro/js_bitmap_renderer/master/imgs/pepe.png";
    image.crossOrigin = "Anonymous";
    image.onload = () =>
    {
        // Loading sprite sheet.
        gfx.drawImage(image, 0, 0);
        spritesheet = gfx.getImageData(0, 0, spriteSheetSize, spriteSheetSize);
        spritesheet = convertImageDataToBitmap(spritesheet, spriteSheetSize, spriteSheetSize);

        loadedResources++;
    }

    cvs.setAttribute("width", WIDTH + "px");
    cvs.setAttribute("height", HEIGHT + "px");
    gfx = cvs.getContext("2d");
    gfx.font = "48px verdana";

    window.addEventListener("mousedown", (e) =>
    {
        if (e.button != 0) return;

        mouse.down = true;
    }, false);
    window.addEventListener("mouseup", (e) =>
    {
        if (e.button != 0) return;

        mouse.down = false;
    }, false);

    window.addEventListener("keydown", (e) =>
    {
        if (e.key == "Escape")
            pause = !pause;

        if (e.key == "w" || e.key == "ArrowUp") keys.up = true;
        if (e.key == "a" || e.key == "ArrowLeft") keys.left = true;
        if (e.key == "s" || e.key == "ArrowDown") keys.down = true;
        if (e.key == "d" || e.key == "ArrowRight") keys.right = true;
        if (e.key == " ") keys.space = true;
        if (e.key == "Control") keys.ctrl = true;
        if (e.key == "q") keys.q = true;
        if (e.key == "e") keys.e = true;
    });

    window.addEventListener("keyup", (e) =>
    {
        if (e.key == "w" || e.key == "ArrowUp") keys.up = false;
        if (e.key == "a" || e.key == "ArrowLeft") keys.left = false;
        if (e.key == "s" || e.key == "ArrowDown") keys.down = false;
        if (e.key == "d" || e.key == "ArrowRight") keys.right = false;
        if (e.key == " ") keys.space = false;
        if (e.key == "Control") keys.ctrl = false;
        if (e.key == "q") keys.q = false;
        if (e.key == "e") keys.e = false;
    });

    window.addEventListener("mousemove", (e) =>
    {
        mouse.currX = e.screenX;
        mouse.currY = e.screenY;
    });

    frameCounterElement = document.getElementById("frame_counter");

    WIDTH = WIDTH / SCALE;
    HEIGHT = HEIGHT / SCALE;

    previousTime = new Date().getTime();

    view = new View(WIDTH, HEIGHT);

    for (let i = 0; i < WIDTH * HEIGHT; i++)
        view.pixels[i] = Math.random() * 0xffffff;

    player = new Player();
}

function run()
{
    let currentTime = new Date().getTime();
    passedTime += currentTime - previousTime;
    previousTime = currentTime;

    while (passedTime >= msPerFrame)
    {
        if (loadedResources == resourceReady && !pause)
        {
            update(passedTime / 1000.0);
            render();
            time += passedTime / 1000.0;

            timer += passedTime;
            frameCounter++;

            if (timer >= 1000)
            {
                frameCounterElement.innerHTML = frameCounter + "fps";
                timer = 0;
                frameCounter = 0;
            }
        }
        else if (pause)
        {
            gfx.fillText("PAUSE", 4, 40);
        }

        passedTime -= msPerFrame;
    }

    requestAnimationFrame(run);
}

function update(delta)
{
    mouse.dx = mouse.currX - mouse.lastX;
    mouse.dy = mouse.currY - mouse.lastY;
    mouse.lastX = mouse.currX;
    mouse.lastY = mouse.currY;

    player.update(delta);
    view.update(delta);
}

function render()
{
    view.clear(0x808080);

    view.renderView();

    gfx.putImageData(convertBitmapToImageData(view, SCALE), 0, 0);
}

function convertImageDataToBitmap(imageData, width, height)
{
    let res = new Bitmap(width, height);

    for (let y = 0; y < height; y++)
    {
        for (let x = 0; x < width; x++)
        {
            let r = imageData.data[(x + y * width) * 4];
            let g = imageData.data[(x + y * width) * 4 + 1];
            let b = imageData.data[(x + y * width) * 4 + 2];

            res.pixels[x + y * width] = (r << 16) | (g << 8) | b;
        }
    }

    return res;
}

function convertBitmapToImageData(bitmap, scale)
{
    let res = new ImageData(bitmap.width * scale, bitmap.height * scale);

    for (let y = 0; y < bitmap.height; y++)
    {
        for (let x = 0; x < bitmap.width; x++)
        {
            let bitmapPixel = bitmap.pixels[x + y * bitmap.width]

            let r = (bitmapPixel >> 16) & 0xff;
            let g = (bitmapPixel >> 8) & 0xff;
            let b = bitmapPixel & 0xff;

            for (let ys = 0; ys < SCALE; ys++)
            {
                for (let xs = 0; xs < SCALE; xs++)
                {
                    let ptr = ((x * SCALE) + xs + ((y * SCALE) + ys) * res.width) * 4;

                    res.data[ptr] = r;
                    res.data[ptr + 1] = g;
                    res.data[ptr + 2] = b;
                    res.data[ptr + 3] = globalAlpha;
                }
            }
        }
    }

    return res;
}

function int(a)
{
    return Math.ceil(a);
}

function lerp(a, b, per)
{
    return a * (1.0 - per) + b * per;
}

function lerpVector2(a, b, per)
{
    return a.mul(1 - per).add(b.mul(per));
}

function lerpVector3(a, b, c, w0, w1, w2)
{
    let wa = a.mul(w0);
    let wb = b.mul(w1);
    let wc = c.mul(w2);

    return new Vector3(wa.x + wb.x + wc.x, wa.y + wb.y + wc.y, wa.z + wb.z + wc.z);
}

function lerp2AttributeVec3(a, b, w0, w1, z0, z1, z)
{
    let wa = a.mul(w0 / z0 * z);
    let wb = b.mul(w1 / z1 * z);

    let res = new Vector3(wa.x + wb.x, wa.y + wb.y, wa.z + wb.z);

    return res;
}

function lerp3AttributeVec2(a, b, c, w0, w1, w2, z0, z1, z2, z)
{
    let wa = a.mul(w0 / z0 * z);
    let wb = b.mul(w1 / z1 * z);
    let wc = c.mul(w2 / z2 * z);

    let res = new Vector2(wa.x + wb.x + wc.x, wa.y + wb.y + wc.y);

    return res;
}

function lerp3AttributeVec3(a, b, c, w0, w1, w2, z0, z1, z2, z)
{
    let wa = a.mul(w0 / z0 * z);
    let wb = b.mul(w1 / z1 * z);
    let wc = c.mul(w2 / z2 * z);

    let res = new Vector3(wa.x + wb.x + wc.x, wa.y + wb.y + wc.y, wa.z + wb.z + wc.z);

    return res;
}

function convertColor(v)
{
    return (v.x << 16) | (v.y << 8) | v.z;
}

window.onload = start;
