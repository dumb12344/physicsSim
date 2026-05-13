"use strict";
let particles = [];
let pixelScale = 5;
let timeScale = 4;
let bounceEnergyLoss = 0.8;
let placementRadius = 15;
let placementMass = 10;
let constantDensity = true;
let pause = false;
window.onblur = () => pause = true;
// window.onfocus = () => blur = false;
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
                if (!ref.mouseGrab) {
                    return createVector(0);
                }
                let diff = ref.position.copy().sub(createVector(mouseX, mouseY));
                return diff.mult(-10, 10);
            },
            mouseSpringDampening: function (ref) {
                if (!ref.mouseGrab) {
                    return createVector(0);
                }
                return ref.velocity.copy().mult(-30);
            }
        };
        this.mouseGrab = false;
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
        this.position.add(this.velocity.copy().mult(dt).mult(30, -30));
        let collided = false;
        if (this.position.y + this.r >= height) {
            this.velocity.mult(1, -0.5);
            this.position.y = height - this.r - 1;
        }
        if (this.position.x + this.r >= width) {
            this.velocity.mult(-0.5, 1);
            this.position.x = width - this.r - 1;
        }
        if (this.position.x - this.r <= 0) {
            this.velocity.mult(-0.5, 1);
            this.position.x = this.r + 1;
        }
        if (this.position.y - this.r <= 0) {
            this.velocity.mult(1, -0.5);
            this.position.y = this.r + 1;
        }
        for (let iterator of particles) {
            if (iterator.uuid == this.uuid) continue;
            if (this.position.dist(iterator.position) <= iterator.r + this.r) {
                // we need to conserve momentum and energy
                // sum of all momentum (mass * velocity) constant
                // sum of all kinetic energy (1/2 mass * velocity ^ 2) constant
                // 1/2 can be cancelled because it will occur on both sides
                // also mass is constant, change in mass = 0
                // 1 is this, 2 is i
                // i is initial, f is final
                // conservation of momentum: m_1i * v_1i + m_2i * v_2i = m_1f * v_1f + m_2f * v_2f
                // conservation of energy: m_1i * v_1i^2 + m_2i * v_2i^2 = m_1f * v_1f^2 + m_2f * v_2f^2
                //
                let impulse = this.velocity.copy().mult(this.m);
                this.velocity.mult(0);
                iterator.velocity.add(impulse.div(iterator.m));
                collided = true;
            }
        }
        if (collided) {
            // invert because JS canvas is weird
            // scale because pixels are small
            this.position.sub(this.velocity.copy().mult(dt).mult(30, -30));
        }
    }
}
function setup () {
    frameRate(240);
    createCanvas(1600, 700);
    document.querySelector('canvas').addEventListener('contextmenu', e => e.preventDefault())
    colorMode(HSB, 1);
    textAlign(CENTER, CENTER);
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
    if (pause) {
        noStroke();
        fill(0,0,0);
        textSize(96)
        text("Paused", width / 2, height / 2);
        return;
    }
    textSize(12)
    if (constantDensity) {
        placementMass = placementRadius;
        particles.forEach((i) => {i.m = i.r});
    }
    noStroke();
    background(220/255);
    let dt = timeScale * deltaTime / 1000
    fill(0,0,0,0.5)
    circle(mouseX, mouseY, placementRadius * 2);
    fill(0,0,1);
    text(Math.floor(placementMass), mouseX, mouseY);
    particles.forEach((i) => {
        noStroke();
        fill(i.color);
        circle(i.position.x, i.position.y, i.r * 2);
        fill(0.5 + hue(i.color), 1, 0);
        text(Math.floor(i.m), i.position.x, i.position.y);
        if (i.mouseGrab) {
            stroke(0,0,0);
            strokeWeight(1);
            line(i.position.x, i.position.y, mouseX, mouseY);
        }
        i.tick(dt);
        i.collisions(dt);
    })
}

function mousePressed () {
    if (mouseX > width || mouseY > height) return;
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
            let diff = i.position.copy().sub(createVector(mouseX, mouseY));
            if (diff.mag() <= 100 + i.r) {
                i.mouseGrab = true;
            }
        })
    }
}

function mouseWheel (event) {
    if (key === "Shift" && keyIsPressed) {
        placementMass -= event.deltaY / 20;
    }
    else {
        placementRadius -= event.deltaY / 20;
    }
}

function keyPressed () {
    if (key === "Shift") {
        placementMass += 6.7 * ((key === "ArrowUp" ? 1 : 0) + (key === "ArrowDown" ? -1 : 0));
    }
    else {
        placementRadius += 6.7 * ((key === "ArrowUp" ? 1 : 0) + (key === "ArrowDown" ? -1 : 0));
    }
    if (key === " ") {
        pause = !pause;
    }
}

function mouseReleased () {
    particles.forEach((i) => {
        i.mouseGrab = false;
    })
}

document.getElementById("constantDensity").addEventListener("click", () => {
    constantDensity = !constantDensity
    document.getElementById("constantDensity").innerText = `Constant density: ${constantDensity ? "on" : "off"}`
})
