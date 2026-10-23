// Fast 2D/3D Simplex-like Perlin Noise implementation with custom seed support

export class PerlinNoise {
  private p: number[] = new Array(512);

  constructor(seed = 1337) {
    this.init(seed);
  }

  public init(seed: number) {
    const permutation = new Array(256);
    for (let i = 0; i < 256; i++) {
      permutation[i] = i;
    }

    // Seeded shuffle (LCG)
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;

    const nextRandom = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    for (let i = 255; i > 0; i--) {
      const j = Math.floor(nextRandom() * (i + 1));
      const temp = permutation[i];
      permutation[i] = permutation[j];
      permutation[j] = temp;
    }

    for (let i = 0; i < 512; i++) {
      this.p[i] = permutation[i & 255];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad2(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private grad3(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const A = this.p[X] + Y;
    const B = this.p[X + 1] + Y;

    return this.lerp(
      v,
      this.lerp(u, this.grad2(this.p[A], xf, yf), this.grad2(this.p[B], xf - 1, yf)),
      this.lerp(u, this.grad2(this.p[A + 1], xf, yf - 1), this.grad2(this.p[B + 1], xf - 1, yf - 1))
    );
  }

  public noise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);

    const u = this.fade(xf);
    const v = this.fade(yf);
    const w = this.fade(zf);

    const A = this.p[X] + Y;
    const AA = this.p[A] + Z;
    const AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y;
    const BA = this.p[B] + Z;
    const BB = this.p[B + 1] + Z;

    return this.lerp(
      w,
      this.lerp(
        v,
        this.lerp(u, this.grad3(this.p[AA], xf, yf, zf), this.grad3(this.p[BA], xf - 1, yf, zf)),
        this.lerp(u, this.grad3(this.p[AB], xf, yf - 1, zf), this.grad3(this.p[BB], xf - 1, yf - 1, zf))
      ),
      this.lerp(
        v,
        this.lerp(u, this.grad3(this.p[AA + 1], xf, yf, zf - 1), this.grad3(this.p[BA + 1], xf - 1, yf, zf - 1)),
        this.lerp(u, this.grad3(this.p[AB + 1], xf, yf - 1, zf - 1), this.grad3(this.p[BB + 1], xf - 1, yf - 1, zf - 1))
      )
    );
  }

  public fractal2D(x: number, y: number, octaves = 4, persistence = 0.5, lacunarity = 2.0): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}
