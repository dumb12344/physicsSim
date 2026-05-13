"use strict";
let particles = [];
let pixelScale = 5;
let timeScale = 4;
let bounceEnergyLoss = 0.8;
let placementRadius = 15;
class CircleParticle {
    constructor (x, y, mass = 1, radius = 1) {
        this.position = createVector(x, y);
        this.m = mass;
        this.r = radius;
        this.forces = [
            // gravity
            function (ref) {
                return createVector(0, -9.8 * ref.m);
            }
        ];
        this.uuid = self.crypto.randomUUID();
        this.velocity = createVector(0, 0);
        this.acceleration = createVector(0, 0);
    }

    tick (dt) {
        this.acceleration.mult(0);
        for (let i of this.forces) {
            let dtForce = i(this);
            dtForce.mult(dt);
            this.acceleration.add(dtForce);
        }
        let dtAccel = this.acceleration.copy();
        dtAccel.mult(dt);
        this.velocity.add(dtAccel);
        let dtVel = this.velocity.copy();
        dtVel.mult(dt);
        // invert because JS canvas is weird
        // scale because pixels are small
        dtVel.mult(10, -10);
        this.position.add(dtVel);
    }

    collisions () {
        for (let i of particles) {
            if (i.uuid == this.uuid) continue;
            let diff = this.position.copy();
            diff.sub(i.position);
            if (diff.mag() <= i.r + this.r) {
                this.velocity.mult(0);
                i.velocity.mult(0);
            }
        }
    }
}
function setup () {
    frameRate(60);
    createCanvas(800, 600);
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
    background(220);
    let dt = timeScale * deltaTime / 1000
    stroke(0,0,0,100)
    strokeWeight(placementRadius * 2);
    point(mouseX, mouseY);
    for (let i of particles) {
        stroke(0,0,0);
        strokeWeight(i.r * 2);
        point(i.position.x, i.position.y);
        i.tick(dt);
        i.collisions();
    }
}

function mousePressed () {
    particles.push(new CircleParticle(mouseX, mouseY, 10, placementRadius))
}

function mouseWheel (event) {
    placementRadius -= event.deltaY / 20;
}

function keyPressed () {
    if (key === "ArrowUp") {
        placementRadius += 6.7;
    }
    else if (key === "ArrowDown") {
        placementRadius -= 6.7;
    }
}