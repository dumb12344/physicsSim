"use strict";
document.getElementById("material").value = "wood";
let particles = [];
let pixelScale = 200;
let timeScale = 4;
let bounceEnergyLoss = 0.8;
let placementRadius = 0.5;
let pause = false;
let placementMaterial = "wood";
window.onblur = () => pause = true;
let materials = {};
class circleParticle {
    constructor (x, y, radius = 1, material = "wood") {
        this.material = material;
        this.r = radius;
        this.a = Math.PI * (this.r ** 2);
        // kg/m^3 -> kg/m^2 for 2d
        // 1 cm depth
        this.m = this.a * (materials[this.material].density * 0.01);
        this.forces = {
            gravity: function (ref) {
                return createVector(0, -9.8 * ref.m);
            },
            mouseSpring: function (ref) {
                if (!ref.mouseGrab) {
                    return createVector(0);
                }
                let diff = ref.position.copy().sub(createVector(mouseX, mouseY));
                // spring constant 3
                return diff.mult(-3, 3);
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
        this.position = createVector(x, y);
        this.velocity = createVector(0, 0);
        this.acceleration = createVector(0, 0);
    }

    tick (dt) {
        this.acceleration.mult(0);
        Object.entries(this.forces).map((entry) => {
            let i = entry[1];
            this.acceleration.add(i(this).div(this.m).mult(dt));
        })
        this.velocity.add(this.acceleration.copy().mult(dt));
        // invert because JS canvas is weird
        // scale because pixels are small
        this.position.add(this.velocity.copy().mult(dt).mult(pixelScale, -pixelScale));
    }

    wallCollisions () {
        if (this.position.y + (this.r * pixelScale) >= height) {
            this.velocity.mult(1, -0.5);
            this.position.y = height - (this.r * pixelScale) - 1;
        }
        if (this.position.x + (this.r * pixelScale) >= width) {
            this.velocity.mult(-0.5, 1);
            this.position.x = width - (this.r * pixelScale) - 1;
        }
        if (this.position.x - (this.r * pixelScale) <= 0) {
            this.velocity.mult(-0.5, 1);
            this.position.x = (this.r * pixelScale) + 1;
        }
        if (this.position.y - (this.r * pixelScale) <= 0) {
            this.velocity.mult(1, -0.5);
            this.position.y = (this.r * pixelScale) + 1;
        }
    }
}
function setup () {
    frameRate(240);
    createCanvas(1600, 800);
    document.querySelector('canvas').addEventListener('contextmenu', e => e.preventDefault())
    colorMode(HSB, 1);
    textAlign(CENTER, CENTER);
    materials = {
        "wood" : {
            "density": 500,
            "color": color(0.0786, 0.3867, 0.5588),
            "contrastColor": color(0,0,1)
        },
        "stone" : {
            "density": 2515,
            "color": color(0.0000, 0.0000, 0.6471),
            "contrastColor": color(0,0,1)
        },
        "steel" : {
            "density": 7850,
            "color": color(0.0000, 0.0000, 0.3471),
            "contrastColor": color(0,0,1)
        }
    }
}

// gpt for later implementation
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

function collisionCheck (a, b) {
    let difference = b.position.copy().sub(a.position.copy());
    let distance = difference.mag();
    let collisionDistance = (a.r * pixelScale) + (b.r * pixelScale);
    let overlap = (collisionDistance - distance);
    if (overlap >= 0) {
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
        let collisionNormal = difference.copy().div(distance);
        let relativeVelocity = b.velocity.copy().sub(a.velocity.copy());
        let normalDot = relativeVelocity.dot(collisionNormal);
        // seperate by overlap
        a.position.sub(collisionNormal.copy().mult(overlap / 2));
        b.position.add(collisionNormal.copy().mult(overlap / 2));
        // add impulse
        if (normalDot >= 0 ) return;
        let impulseMag = -normalDot / (1 / a.m + 1 / b.m);
        let impulse = collisionNormal.copy().mult(impulseMag);
        a.velocity.sub(impulse.copy().div(a.m));
        b.velocity.add(impulse.copy().div(b.m));
    }
}

function draw () {
    background(220/255);
    for (let i = 0; i <= width / pixelScale; i++) {
        for (let j = 0; j <= height / pixelScale; j++) {
            stroke(0,0,0);
            strokeWeight(1);
            line(i * pixelScale, 0, i * pixelScale, height);
            line(0, j * pixelScale, width, j * pixelScale);
        }
    }
    let dt = timeScale * deltaTime / 1000
    if (pause) {
        noStroke();
        fill(0,0,0);
        textSize(96)
        text("Paused", width / 2, height / 2);
        dt = 0;
    }
    textSize(12);
    particles.forEach((i) => {
        noStroke();
        fill(materials[i.material].color);
        circle(i.position.x, i.position.y, i.r * pixelScale * 2);
        fill(materials[i.material].contrastColor);
        text(Math.floor(i.m).toFixed() + " kg", i.position.x, i.position.y);
        if (i.mouseGrab) {
            stroke(0,0,0);
            strokeWeight(1);
            line(i.position.x, i.position.y, mouseX, mouseY);
        }
        i.tick(dt);
        i.wallCollisions();
    });
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            collisionCheck(particles[i], particles[j]);
        }
    }
    noStroke();
    fill(0,0,0,0.5)
    circle(mouseX, mouseY, placementRadius * pixelScale * 2);
    fill(0,0,1);
    //text(Math.floor(placementRadius), mouseX, mouseY);
}

function mousePressed () {
    if (document.activeElement.id === "material") return;
    if (mouseX > width || mouseY > height || mouseX < 0 || mouseY < 0) return;
    if (mouseButton === LEFT) {
        particles.push(new circleParticle(mouseX, mouseY, placementRadius, placementMaterial));
    }
    else if (mouseButton === CENTER) {
        particles.forEach((i) => {
            if (i.position.copy().dist(createVector(mouseX, mouseY)) <= (i.r * pixelScale)) {
                particles = particles.filter((particle) => {
                    return particle.uuid !== i.uuid;
                })
            }
        })
    }
    else if (mouseButton === RIGHT) {
        particles.forEach((i) => {
            let diff = i.position.copy().sub(createVector(mouseX, mouseY));
            if (diff.mag() <= 100 + (i.r * pixelScale)) {
                i.mouseGrab = true;
            }
        })
    }
}

function mouseWheel (event) {
    placementRadius -= event.deltaY / 800;
    placementRadius = abs(placementRadius);
}

function keyPressed () {
    placementRadius += 0.22 * ((key === "ArrowUp" ? 1 : 0) + (key === "ArrowDown" ? -1 : 0));
    if (key === " ") {
        pause = !pause;
    }
}

function mouseReleased () {
    particles.forEach((i) => {
        i.mouseGrab = false;
    })
}

document.getElementById("material").addEventListener("change", () => {
    placementMaterial = document.getElementById("material").value;
})