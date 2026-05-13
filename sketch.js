"use strict";
let particles = [];
let pixelScale = 5;
let timeScale = 4;
let bounceEnergyLoss = 0.8;
let placementRadius = 15;
let placementMass = 10;
class CircleParticle {
    constructor (x, y, mass = 1, radius = 1) {
        this.position = createVector(x, y);
        this.m = mass;
        this.r = radius;
        this.forces = {
            gravity: function (ref) {
                return createVector(0, -9.8 * ref.m);
            },
            mouseSpring: function (ref) {
                return ref.position.copy().sub(createVector(mouseX, mouseY)).mult(0);
            }
        };
        this.uuid = self.crypto.randomUUID();
        this.velocity = createVector(0, 0);
        this.acceleration = createVector(0, 0);
        this.color = color(Math.random(), 1, 1);
    }

    tick (dt) {
        this.acceleration.mult(0);
        Object.entries(this.forces).map((entry) => {
            let i = entry[1];
            this.acceleration.add(i(this).div(this.m).mult(dt));
        })
        this.velocity.add(this.acceleration.copy().mult(dt));
    }

    collisions (dt) {
        let collided = false;
        if (this.position.y + this.r >= height) {
            this.position.sub(this.velocity.copy().mult(dt).mult(10, -10));
            this.velocity.mult(1, -0.5);
            collided = true;
        }
        for (let i of particles) {
            if (i.uuid == this.uuid) continue;
            if (this.position.dist(i.position) <= i.r + this.r) {
                this.position.sub(this.velocity.copy().mult(dt).mult(10, -10));
                let impulse = this.velocity.copy().mult(this.m);
                this.velocity.mult(0);
                i.velocity.add(impulse.div(i.m));
                this.collided = true;
            }
        }
        if (!collided) {
            // invert because JS canvas is weird
            // scale because pixels are small
            this.position.add(this.velocity.copy().mult(dt).mult(30, -30));
        }
    }
}
function setup () {
    frameRate(60);
    createCanvas(800, 600);
    document.querySelector('canvas').addEventListener('contextmenu', e => e.preventDefault())
    colorMode(HSB, 1);
}

//gpt for later implementation
function resolveCollision (a, b) {
    let dx = b.x - a.x;
    let dy = b.y - a.y;

    let dist = sqrt(dx * dx + dy * dy);
    let minDist = a.radius + b.radius;

    // not colliding
    if (dist >= minDist) return;

    // collision normal
    let nx = dx / dist;
    let ny = dy / dist;

    // push particles apart
    let overlap = minDist - dist;

    a.x -= nx * overlap / 2;
    a.y -= ny * overlap / 2;

    b.x += nx * overlap / 2;
    b.y += ny * overlap / 2;

    // relative velocity
    let rvx = b.vx - a.vx;
    let rvy = b.vy - a.vy;

    // velocity along normal
    let velAlongNormal = rvx * nx + rvy * ny;

    // already separating
    if (velAlongNormal > 0) return;

    // bounce
    let restitution = bounceEnergyLoss;

    let impulse =
        -(1 + restitution) * velAlongNormal /
        (1 / a.mass + 1 / b.mass);

    let ix = impulse * nx;
    let iy = impulse * ny;

    a.vx -= ix / a.mass;
    a.vy -= iy / a.mass;

    b.vx += ix / b.mass;
    b.vy += iy / b.mass;
}

function draw () {
    noStroke();
    background(220/255);
    let dt = timeScale * deltaTime / 1000
    fill(0,0,0,0.5)
    circle(mouseX, mouseY, placementRadius * 2);
    particles.forEach((i) => {
        fill(i.color);
        circle(i.position.x, i.position.y, i.r * 2);
        fill(0.5 + hue(i.color), 1, 0);
        textAlign(CENTER, CENTER);
        text(i.m, i.position.x, i.position.y);
        i.tick(dt);
        i.collisions(dt);
    })
}

function mousePressed () {
    if (mouseButton === LEFT) {
        particles.push(new CircleParticle(mouseX, mouseY, placementMass, placementRadius));
    }
    else if (mouseButton === CENTER) {
        particles.forEach((i) => {
            if (i.position.copy().dist(createVector(mouseX, mouseY)) <= i.r) {
                particles = particles.filter((particle) => {
                    return particle.uuid !== i.uuid;
                })
            }
        })
    }
    else if (mouseButton === RIGHT) {
        particles.forEach((i) => {
            if (i.position.copy().dist(createVector(mouseX, mouseY)) <= i.r) {
                
            }
        })
    }
}

function mouseWheel (event) {
    if (key === "Shift") {
        placementMass -= Math.round(event.deltaY / 20);
    }
    else {
        placementRadius -= event.deltaY / 20;
    }
}

function keyPressed () {
    if (key === "ArrowUp") {
        placementRadius += 6.7;
    }
    else if (key === "ArrowDown") {
        placementRadius -= 6.7;
    }
}