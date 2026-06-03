"use strict";
p5.Vector.prototype.subtract = p5.Vector.prototype.sub;
p5.Vector.prototype.multiply = p5.Vector.prototype.mult;
p5.Vector.prototype.divide = p5.Vector.prototype.div;
p5.Vector.prototype.magnitude = p5.Vector.prototype.mag;
p5.Vector.prototype.difference = p5.Vector.prototype.diff;
let objects = [];
const pixelScale = 200;
const timeScale = 1;
const inputting = () => {
    return (
        document.activeElement.id === "material"
        || document.activeElement.id === "object"
        || document.activeElement.id === "mode"
        || document.activeElement.id === "accelGravity"
        || document.activeElement.id === "dampening"
        || document.activeElement.id === "placementRadius"
    );
};
let pause = false;
window.onblur = () => pause = true;
let placementRadius = 0.5;
let placementMaterial = "wood";
let placementObject = "cylinder";
let mode = "place";
let springDampening = 30;
document.getElementById("placementRadius").value = 0.5;
document.getElementById("material").value = "wood";
document.getElementById("object").value = "cylinder";
document.getElementById("mode").value = "place";
document.getElementById("dampening").value = 30;
let materials = {};
// 1 cm depth
let depth = 0.01;
let restitution = 0.8;
let gravityAccel = 9.81;
document.getElementById("restitutionCoeff").value = 80;
document.getElementById("accelGravity").value = 9.81;
// TODO: finish streaks
class baseObject {
    constructor (x, y, volume = 1, material = "wood") {
        this.position = createVector(x, y);
        this.velocity = createVector(0, 0);
        this.acceleration = createVector(0, 0);
        this.uuid = self.crypto.randomUUID();
        this.volume = volume;
        this.material = material;
        this.mass = volume * materials[material].density;
        this.forces = {
            gravity: function (ref) {
                return createVector(0, -gravityAccel * ref.mass);
            },
            mouseSpring: function (ref) {
                if (!ref.mouseGrab) {
                    return createVector(0);
                }
                let difference = ref.position.copy().subtract(createVector(mouseX, mouseY)).multiply(-3, 3);
                // spring constant 3
                return difference;
            },
            mouseSpringDampening: function (ref) {
                if (!ref.mouseGrab) {
                    return createVector(0);
                }
                return ref.velocity.copy().multiply(-springDampening);
            }
        };
        this.mouseGrab = false;
        this.selected = false;
    }

    tick (dt) {
        if (dt !== 0) {
            this.acceleration.set(0);
            Object.entries(this.forces).map((entry) => {
                let getForce = entry[1];
                this.acceleration.add(getForce(this).divide(this.mass));
            });
        }
        this.velocity.add(this.acceleration.copy().multiply(dt));
        // invert because JS canvas is weird
        // scale because pixels are small
        this.position.add(this.velocity.copy().multiply(dt).multiply(pixelScale, -pixelScale));
    }

    wallCollisions () {
        if (this.position.y >= height) {
            this.velocity.multiply(1, -restitution);
            this.position.y = height - 1;
        }
        if (this.position.x >= width) {
            this.velocity.multiply(-restitution, 1);
            this.position.x = width - 1;
        }
        if (this.position.x <= 0) {
            this.velocity.multiply(-restitution, 1);
            this.position.x = 1;
        }
        if (this.position.y <= 0) {
            this.velocity.multiply(1, -restitution);
            this.position.y = 1;
        }
    }
}

class particleObject extends baseObject {
    constructor(x, y) {
        super(x, y, 0.01);
    }
}

class cylinderObject extends baseObject {
    constructor (x, y, radius = 1, material = "wood") {
        super(x, y, Math.PI * (radius ** 2) * depth, material);
        this.radius = radius;
    }

    wallCollisions () {
        if (this.position.y + (this.radius * pixelScale) >= height) {
            this.velocity.multiply(1, -restitution);
            this.position.y = height - (this.radius * pixelScale) - 1;
        }
        if (this.position.x + (this.radius * pixelScale) >= width) {
            this.velocity.multiply(-restitution, 1);
            this.position.x = width - (this.radius * pixelScale) - 1;
        }
        if (this.position.x - (this.radius * pixelScale) <= 0) {
            this.velocity.multiply(-restitution, 1);
            this.position.x = (this.radius * pixelScale) + 1;
        }
        if (this.position.y - (this.radius * pixelScale) <= 0) {
            this.velocity.multiply(1, -restitution);
            this.position.y = (this.radius * pixelScale) + 1;
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

    // push objects apart
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
    let restitution = restitution;

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
    if (!(a instanceof cylinderObject) || !(b instanceof cylinderObject)) return;
    let difference = b.position.copy().subtract(a.position.copy());
    let distance = difference.magnitude();
    let collisionDistance = (a.radius * pixelScale) + (b.radius * pixelScale);
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
        let collisionNormal = difference.copy().divide(distance);
        let relativeVelocity = b.velocity.copy().subtract(a.velocity.copy());
        let normalDot = relativeVelocity.dot(collisionNormal);
        // seperate by overlap
        a.position.subtract(collisionNormal.copy().multiply(overlap / 2));
        b.position.add(collisionNormal.copy().multiply(overlap / 2));
        // add impulse
        /*if (normalDot >= 0 ) return;
        let impulseMagnitude = -normalDot / (1 / a.mass + 1 / b.mass);
        let impulse = collisionNormal.copy().multiply(impulseMagnitude);
        a.velocity.subtract(impulse.copy().divide(a.mass));
        a.velocity.multiply(restitution);
        b.velocity.add(impulse.copy().divide(b.mass));
        b.velocity.multiply(restitution);
        */
        let aVelocity = a.velocity.copy();
        let bVelocity = b.velocity.copy();
        a.velocity.set(bVelocity.multiply(b.mass).divide(a.mass).multiply(restitution));
        b.velocity.set(aVelocity.multiply(a.mass).divide(b.mass).multiply(restitution));
    }
}

function draw () {
    let streaks = false;
    background(0, 0, 220/255, streaks ? 0.1 : 1);
    // draw grid
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
        dt = 0;
    }
    textSize(12);
    objects.forEach(i => {
        strokeWeight(5);
        if (i.selected) stroke(0.3, 1, 1);
        else noStroke();
        fill(materials[i.material].color);
        if (i instanceof cylinderObject) {
            circle(i.position.x, i.position.y, i.radius * pixelScale * 2);
            fill(materials[i.material].contrastColor);
            noStroke();
            text(Math.floor(i.mass).toFixed() + " kg", i.position.x, i.position.y);
        }
        if (i instanceof particleObject) {
            fill(0, 0, 0);
            circle(i.position.x, i.position.y, 10);
            noStroke();
        }
        if (i.mouseGrab) {
            stroke(0,0,0);
            strokeWeight(1);
            line(i.position.x, i.position.y, mouseX, mouseY);
        }
        if (i.selected) {
            stroke(0,1,1);
            strokeWeight(1);
            line(i.position.x, i.position.y, i.position.x + (i.velocity.x * pixelScale), i.position.y - (i.velocity.y * pixelScale));
        }
        if (i.selected) {
            stroke(0.7,1,1);
            strokeWeight(1);
            line(i.position.x, i.position.y, i.position.x + (i.acceleration.x * pixelScale), i.position.y - (i.acceleration.y * pixelScale));
        }
        i.tick(dt);
        i.wallCollisions();
    });
    for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
            collisionCheck(objects[i], objects[j]);
        }
    }
    if (placementObject == "cylinder" && mode == "place") {
        noStroke();
        fill(0,0,0,0.5)
        circle(mouseX, mouseY, placementRadius * pixelScale * 2);
    }
    //fill(0,0,1);
    //text(Math.floor(placementRadius), mouseX, mouseY);
    if (pause) {
        noStroke();
        fill(0,0,0);
        textSize(96)
        text("Paused", width / 2, height / 2);
    }
    data.innerHTML = `
        Data:<hr/>
        Object count: ${objects.length}<br/>
        Pixels per metre: ${pixelScale}<br/>
        Object depth: ${depth} metres<br/>
        Canvas width: ${width}<br/>
        Canvas height: ${height}<br/>
    `;
    let selectedCount = 0;
    let objectDisplay = [];
    objects.forEach(i => {
        if (i.selected) {
            selectedCount++;
            objectDisplay.push(`
                <div>
                    Object ${i.uuid}<hr/>
                    Mass (cm): ${Math.floor(i.mass * 10) / 10} kilograms<br/>
                    ${i instanceof cylinderObject ? `Radius (cm): ${Math.floor(i.radius * 10) / 10} metres<br/>` : ``}
                    ${i instanceof cylinderObject ? `Material: ${i.material}<br/>` : ``}
                    Position (cm) (pixels): (${Math.floor(i.position.x)}, ${Math.floor(i.position.y)})<br/>
                    Kinetic energy (cm): ${Math.floor((i.mass * i.velocity.magnitude() ** 2) / 2 * 10) / 10} joules<br/>
                    <span style="color: red;">Velocity (cm) (metres per second): (${Math.floor(i.velocity.x * 10) / 10}, ${Math.floor(i.velocity.y * 10) / 10})</span><br/>
                    <span style="color: blue;">Acceleration (cm) (metres per second per second): (${Math.floor(i.acceleration.x * 10) / 10}, ${Math.floor(i.acceleration.y * 10) / 10})</span>
                </div>
            `)
        }
    });
    objectInfo.innerHTML = `
        <span>Selected object${selectedCount == 1 ? "" : "s"}:</span>
        <div id="objectInfoFlex">
        ${objectDisplay.join("")}
        </div>
    `;
}

function mousePressed () {
    if (inputting()) return;
    if (mouseX > width || mouseY > height || mouseX < 0 || mouseY < 0) return;
    if (mouseButton === LEFT) {
        switch (mode) {
            case "place":
                let newObject;
                switch (placementObject) {
                    default:
                        newObject = new particleObject(mouseX, mouseY);
                        break;
                    case "cylinder":
                        newObject = new cylinderObject(mouseX, mouseY, placementRadius, placementMaterial);
                        break;
                }
                objects.push(newObject);
                break;
            case "select":
                let objectSelected = false;
                objects.forEach(i => {
                    if (i instanceof cylinderObject) {
                        let difference = i.position.copy().subtract(createVector(mouseX, mouseY));
                        if (difference.magnitude() <= (i.radius * pixelScale)) {
                            i.selected = !i.selected;
                            objectSelected = true;
                        }
                    }
                    if (i instanceof particleObject) {
                        let difference = i.position.copy().subtract(createVector(mouseX, mouseY));
                        if (difference.magnitude() <= 100) {
                            i.selected = !i.selected;
                            objectSelected = true;
                        }
                    }
                })
                if (objectSelected == false) {
                    objects.forEach(i => {
                        i.selected = false;
                    });
                }
                break;
            case "delete":
                objects.forEach(i => {
                    if (i instanceof cylinderObject) {
                        let difference = i.position.copy().subtract(createVector(mouseX, mouseY));
                        if (difference.magnitude() <= (i.radius * pixelScale)) {
                            objects = objects.filter((object) => {
                                return object.uuid !== i.uuid;
                            });
                        }
                    }
                    if (i instanceof particleObject) {
                        let difference = i.position.copy().subtract(createVector(mouseX, mouseY));
                        if (difference.magnitude() <= 100) {
                            objects = objects.filter((object) => {
                                return object.uuid !== i.uuid;
                            })
                        }
                    }
                })
                break;
        }
        
    }
    else if (mouseButton === RIGHT) {
        objects.forEach(i => {
            if (i instanceof cylinderObject) {
                let difference = i.position.copy().subtract(createVector(mouseX, mouseY));
                if (difference.magnitude() <= (i.radius * pixelScale)) {
                    i.mouseGrab = true;
                }
            }
            if (i instanceof particleObject) {
                let difference = i.position.copy().subtract(createVector(mouseX, mouseY));
                if (difference.magnitude() <= 100) {
                    i.mouseGrab = true;
                }
            }
        })
    }
}

function mouseWheel (event) {
    if (mode == "place") {
        placementRadius -= event.deltaY / 800;
        placementRadius = abs(placementRadius);
        document.getElementById("placementRadius").value = placementRadius;
    }
}

function keyPressed () {
    if (inputting()) return;
    if ((key === "ArrowUp" || key === "ArrowDown") && mode == "place") {
        placementRadius += 0.22 * ((key === "ArrowUp" ? 1 : 0) + (key === "ArrowDown" ? -1 : 0));
        document.getElementById("placementRadius").value = placementRadius;
    }
    if (key === " ") {
        pause = !pause;
    }
    if (key == "1") {
        mode = "place";
        document.getElementById("mode").value = mode;
    }
    if (key == "2") {
        mode = "select";
        document.getElementById("mode").value = mode;
    }
    if (key == "3") {
        mode = "delete";
        document.getElementById("mode").value = mode;
    }
}

function mouseReleased () {
    objects.forEach(i => {
        i.mouseGrab = false;
    })
}

document.getElementById("material").addEventListener("change", () => {
    placementMaterial = document.getElementById("material").value;
})

document.getElementById("object").addEventListener("change", () => {
    placementObject = document.getElementById("object").value;
})

document.getElementById("placementRadius").addEventListener("change", () => {
    placementRadius = parseFloat(document.getElementById("placementRadius").value);
})

document.getElementById("dampening").addEventListener("change", () => {
    springDampening = parseFloat(document.getElementById("dampening").value);
})

document.getElementById("accelGravity").addEventListener("change", () => {
    gravityAccel = parseFloat(document.getElementById("accelGravity").value);
})

document.getElementById("restitutionCoeff").addEventListener("change", () => {
    restitution = parseFloat(document.getElementById("restitutionCoeff").value) / 100;
})

document.getElementById("mode").addEventListener("change", () => {
    mode = document.getElementById("mode").value;
})