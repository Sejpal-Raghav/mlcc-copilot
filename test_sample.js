const EPSILON_0 = 8.854e-12;

const BOUNDS = {
    epsilon_r: { min: 500, max: 10000 },
    layers:    { min: 10,  max: 500 },
    area:      { min: 1e-6, max: 25e-6 },
    thickness: { min: 1e-6, max: 50e-6 },
};

function randLog(min, max) {
    return Math.exp(Math.log(min) + Math.random() * (Math.log(max) - Math.log(min)));
}

let caps = [];
for (let i = 0; i < 100000; i++) {
    const epsilon_r = randLog(BOUNDS.epsilon_r.min, BOUNDS.epsilon_r.max);
    const layers = Math.floor(randLog(BOUNDS.layers.min, BOUNDS.layers.max));
    const area = randLog(BOUNDS.area.min, BOUNDS.area.max);
    const thickness = randLog(BOUNDS.thickness.min, BOUNDS.thickness.max);
    const theoreticalCap = (EPSILON_0 * epsilon_r * area * layers) / thickness;
    caps.push(theoreticalCap);
}

caps.sort((a,b) => a - b);
console.log("Min:", caps[0]);
console.log("10th %:", caps[Math.floor(caps.length * 0.1)]);
console.log("Median:", caps[Math.floor(caps.length * 0.5)]);
console.log("90th %:", caps[Math.floor(caps.length * 0.9)]);
console.log("Max:", caps[caps.length - 1]);

let dists = caps.map(c => Math.abs(c - 1e-9) / 1e-9).filter(d => d <= 0.2);
console.log("Count within 20% of 1nF:", dists.length);

let dists10 = caps.map(c => Math.abs(c - 10e-9) / 10e-9).filter(d => d <= 0.2);
console.log("Count within 20% of 10nF:", dists10.length);

