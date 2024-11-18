export class Point {
  constructor(public x: number, public y: number) {}
}

class Hex {
  constructor(public q: number, public r: number, public s: number) {
    if (Math.round(q + r + s) !== 0) throw "q + r + s must be 0";
  }
  public add(b: Hex): Hex {
    return new Hex(this.q + b.q, this.r + b.r, this.s + b.s);
  }

  public subtract(b: Hex): Hex {
    return new Hex(this.q - b.q, this.r - b.r, this.s - b.s);
  }

  public scale(k: number): Hex {
    return new Hex(this.q * k, this.r * k, this.s * k);
  }

  public rotateLeft(): Hex {
    return new Hex(-this.s, -this.q, -this.r);
  }

  public rotateRight(): Hex {
    return new Hex(-this.r, -this.s, -this.q);
  }

  public static directions: Hex[] = [
    new Hex(1, 0, -1),
    new Hex(1, -1, 0),
    new Hex(0, -1, 1),
    new Hex(-1, 0, 1),
    new Hex(-1, 1, 0),
    new Hex(0, 1, -1),
  ];

  public static direction(direction: number): Hex {
    return Hex.directions[direction];
  }

  public neighbor(direction: number): Hex {
    return this.add(Hex.direction(direction));
  }

  public static diagonals: Hex[] = [
    new Hex(2, -1, -1),
    new Hex(1, -2, 1),
    new Hex(-1, -1, 2),
    new Hex(-2, 1, 1),
    new Hex(-1, 2, -1),
    new Hex(1, 1, -2),
  ];

  public diagonalNeighbor(direction: number): Hex {
    return this.add(Hex.diagonals[direction]);
  }

  public len(): number {
    return (Math.abs(this.q) + Math.abs(this.r) + Math.abs(this.s)) / 2;
  }

  public distance(b: Hex): number {
    return this.subtract(b).len();
  }

  public round(): Hex {
    var qi: number = Math.round(this.q);
    var ri: number = Math.round(this.r);
    var si: number = Math.round(this.s);
    var q_diff: number = Math.abs(qi - this.q);
    var r_diff: number = Math.abs(ri - this.r);
    var s_diff: number = Math.abs(si - this.s);
    if (q_diff > r_diff && q_diff > s_diff) {
      qi = -ri - si;
    } else if (r_diff > s_diff) {
      ri = -qi - si;
    } else {
      si = -qi - ri;
    }
    return new Hex(qi, ri, si);
  }

  public lerp(b: Hex, t: number): Hex {
    return new Hex(
      this.q * (1.0 - t) + b.q * t,
      this.r * (1.0 - t) + b.r * t,
      this.s * (1.0 - t) + b.s * t
    );
  }

  public linedraw(b: Hex): Hex[] {
    var N: number = this.distance(b);
    var a_nudge: Hex = new Hex(this.q + 1e-6, this.r + 1e-6, this.s - 2e-6);
    var b_nudge: Hex = new Hex(b.q + 1e-6, b.r + 1e-6, b.s - 2e-6);
    var results: Hex[] = [];
    var step: number = 1.0 / Math.max(N, 1);
    for (var i = 0; i <= N; i++) {
      results.push(a_nudge.lerp(b_nudge, step * i).round());
    }
    return results;
  }
}

class Orientation {
  constructor(
    public f0: number,
    public f1: number,
    public f2: number,
    public f3: number,
    public b0: number,
    public b1: number,
    public b2: number,
    public b3: number,
    public start_angle: number
  ) {}
}

class Layout {
  constructor(
    public orientation: Orientation,
    public size: Point,
    public origin: Point
  ) {}
  public static pointy: Orientation = new Orientation(
    Math.sqrt(3.0),
    Math.sqrt(3.0) / 2.0,
    0.0,
    3.0 / 2.0,
    Math.sqrt(3.0) / 3.0,
    -1.0 / 3.0,
    0.0,
    2.0 / 3.0,
    0.5
  );
  public static flat: Orientation = new Orientation(
    3.0 / 2.0,
    0.0,
    Math.sqrt(3.0) / 2.0,
    Math.sqrt(3.0),
    2.0 / 3.0,
    0.0,
    -1.0 / 3.0,
    Math.sqrt(3.0) / 3.0,
    0.0
  );

  public hexToPixel(h: Hex): Point {
    var M: Orientation = this.orientation;
    var size: Point = this.size;
    var origin: Point = this.origin;
    var x: number = (M.f0 * h.q + M.f1 * h.r) * size.x;
    var y: number = (M.f2 * h.q + M.f3 * h.r) * size.y;
    return { x: x + origin.x, y: y + origin.y };
  }

  public pixelToHex(p: Point): Hex {
    var M: Orientation = this.orientation;
    var size: Point = this.size;
    var origin: Point = this.origin;
    var pt: Point = {
      x: (p.x - origin.x) / size.x,
      y: (p.y - origin.y) / size.y,
    };
    var q: number = M.b0 * pt.x + M.b1 * pt.y;
    var r: number = M.b2 * pt.x + M.b3 * pt.y;
    return new Hex(q, r, -q - r);
  }

  public hexCornerOffset(corner: number): Point {
    var M: Orientation = this.orientation;
    var size: Point = this.size;
    var angle: number = (2.0 * Math.PI * (M.start_angle - corner)) / 6.0;
    return new Point(size.x * Math.cos(angle), size.y * Math.sin(angle));
  }

  public polygonCorners(h: Hex): Point[] {
    var corners: Point[] = [];
    var center: Point = this.hexToPixel(h);
    for (var i = 0; i < 6; i++) {
      var offset: Point = this.hexCornerOffset(i);
      corners.push(new Point(center.x + offset.x, center.y + offset.y));
    }
    return corners;
  }
}

class OffsetCoord {
  constructor(public col: number, public row: number) {}
  public static EVEN: number = 1;
  public static ODD: number = -1;

  // flat top orientation
  public static qoffsetFromCube(offset: number, h: Hex): OffsetCoord {
    var col: number = h.q;
    var row: number = h.r + (h.q + offset * (h.q & 1)) / 2;
    if (offset !== OffsetCoord.EVEN && offset !== OffsetCoord.ODD) {
      throw "offset must be EVEN (+1) or ODD (-1)";
    }
    return new OffsetCoord(col, row);
  }

  public static qoffsetToCube(offset: number, h: OffsetCoord): Hex {
    var q: number = h.col;
    var r: number = h.row - (h.col + offset * (h.col & 1)) / 2;
    var s: number = -q - r;
    if (offset !== OffsetCoord.EVEN && offset !== OffsetCoord.ODD) {
      throw "offset must be EVEN (+1) or ODD (-1)";
    }
    return new Hex(q, r, s);
  }

  // pointy top orientation
  public static roffsetFromCube(offset: number, h: Hex): OffsetCoord {
    var col: number = h.q + (h.r + offset * (h.r & 1)) / 2;
    var row: number = h.r;
    if (offset !== OffsetCoord.EVEN && offset !== OffsetCoord.ODD) {
      throw "offset must be EVEN (+1) or ODD (-1)";
    }
    return new OffsetCoord(col, row);
  }

  public static roffsetToCube(offset: number, h: OffsetCoord): Hex {
    var q: number = h.col - (h.row + offset * (h.row & 1)) / 2;
    var r: number = h.row;
    var s: number = -q - r;
    if (offset !== OffsetCoord.EVEN && offset !== OffsetCoord.ODD) {
      throw "offset must be EVEN (+1) or ODD (-1)";
    }
    return new Hex(q, r, s);
  }
}

type TerrainTile = {
  x: number;
  y: number;
  z?: number;
  isWalkable: boolean;
};

type Sprite = {
  type: keyof SpriteMapTypes;
  terrain: TerrainTile;
  center: Point;
  dx: number;
  dy: number;
  sx: number;
  sy: number;
};

interface SpriteMapTypes {
  DeepWater: TerrainTile;
  ShallowWater: TerrainTile;
  FlatDesert1: TerrainTile;
  FlatDesert2: TerrainTile;
  FlatGrass: TerrainTile;
  FlatSparseTrees1: TerrainTile;
  FlatSparseTrees2: TerrainTile;
  FlatForest: TerrainTile;
  FlatForestSwampy: TerrainTile;
  HillDesert: TerrainTile;
  HillGrass: TerrainTile;
  HillForest: TerrainTile;
  HillForestNeedleleaf: TerrainTile;
  MountainDesert: TerrainTile;
  MountainShrubland1: TerrainTile;
  MountainShrubland2: TerrainTile;
  MountainAlpine1: TerrainTile;
  MountainAlpine2: TerrainTile;
  MountainImpassable1: TerrainTile;
  MountainImpassable2: TerrainTile;
  lake1: TerrainTile;
  lake2: TerrainTile;
  lake3: TerrainTile;
  lake4: TerrainTile;
  Volcano: TerrainTile;
}

type Tile = {
  hex: Hex;
  sprite: Sprite | null;
};

class FlatTopHexMap {
  // Elements
  public canvas;
  public ctx;
  public map;
  public layout;
  public spriteMap = new Map<keyof SpriteMapTypes, TerrainTile>([
    ["DeepWater", { x: 4, y: 5, z: 0, isWalkable: false }],
    ["ShallowWater", { x: 0, y: 5, z: 1, isWalkable: false }],
    ["FlatDesert1", { x: 1, y: 2, z: 2, isWalkable: true }],
    ["FlatDesert2", { x: 1, y: 1, z: 2, isWalkable: true }],
    ["FlatGrass", { x: 2, y: 0, z: 2, isWalkable: true }],
    ["FlatSparseTrees1", { x: 3, y: 0, z: 2, isWalkable: true }],
    ["FlatSparseTrees2", { x: 4, y: 0, z: 2, isWalkable: true }],
    ["FlatForest", { x: 5, y: 0, z: 2, isWalkable: true }],
    ["FlatForestSwampy", { x: 7, y: 1, z: 2, isWalkable: true }],
    ["HillDesert", { x: 9, y: 2, z: 3, isWalkable: true }],
    ["HillGrass", { x: 7, y: 0, z: 3, isWalkable: true }],
    ["HillForest", { x: 6, y: 0, z: 3, isWalkable: true }],
    ["HillForestNeedleleaf", { x: 10, y: 0, z: 3, isWalkable: true }],
    ["MountainDesert", { x: 8, y: 2, z: 4, isWalkable: true }],
    ["MountainShrubland1", { x: 8, y: 0, z: 4, isWalkable: true }],
    ["MountainShrubland2", { x: 9, y: 0, z: 4, isWalkable: true }],
    ["MountainAlpine1", { x: 10, y: 0, z: 4, isWalkable: true }],
    ["MountainAlpine2", { x: 11, y: 0, z: 4, isWalkable: true }],
    ["MountainImpassable1", { x: 10, y: 6, z: 5, isWalkable: false }],
    ["MountainImpassable2", { x: 0, y: 6, z: 5, isWalkable: false }],
    // ["lake1", { x: 12, y: 0, z: 0, isWalkable: false }],
    // ["lake2", { x: 3, y: 1, z: 0, isWalkable: false }],
    // ["lake3", { x: 2, y: 1, z: 0, isWalkable: false }],
    // ["lake4", { x: 8, y: 1, z: 0, isWalkable: false }],
    // ["Volcano", { x: 3, y: 6, z: 5, isWalkable: false }],
    // ["lair", { x: 0, y: 8 }],
    // ["lairSnow", { x: 1, y: 8 }],
    // ["lairDesert", { x: 2, y: 8 }],
  ]);
  private spriteMapImg: HTMLImageElement | null;
  private static hash(q: number, r: number) {
    return `${q},${r}`;
  }
  public activeHex: Hex | null = null;
  public hexPositionTuple: [Hex | null, Hex | null];
  public path: Hex[];
  constructor(
    canvasId: string,
    left: number,
    right: number,
    top: number,
    bottom: number
  ) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d");
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }
    // bind event handlers
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    // generate map assets
    this.map = new Map<string, Tile>();
    this.hexPositionTuple = [null, null];
    // size and origin arbitrarily set for now
    this.layout = new Layout(Layout.flat, { x: 32, y: 32 }, { x: 32, y: 32 });
    this.spriteMapImg = null;
    this.path = [];
    this.init(left, right, top, bottom);
  }
  private async init(left: number, right: number, top: number, bottom: number) {
    await this.loadSprites();
    console.log("Loaded sprite map(s).");
    this.generateMap(left, right, top, bottom);
    this.drawMap();
    this.bindEvents();
  }
  private drawMap() {
    this.ctx?.resetTransform();
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawSprites();
    this.drawGrid();
    if (this.hexPositionTuple[0] && this.hexPositionTuple[1]) {
      const resultsOfAStar = this.aStar(
        this.hexPositionTuple[0],
        this.hexPositionTuple[1]
      );
      console.log(resultsOfAStar);
    }
    // for (let i = 0; i < this.path.length; i++) {
    //   this.drawSelectedHex(this.path[i]);
    // }
  }
  private async loadSprites() {
    this.spriteMapImg = await this.loadImage("./img/tileset.png");
  }
  private generateMap(
    left: number,
    right: number,
    top: number,
    bottom: number
  ) {
    for (let q = left; q <= right; q++) {
      const qOffset = Math.floor(q / 2.0);
      for (let r = top - qOffset; r <= bottom - qOffset; r++) {
        const hex = new Hex(q, r, -q - r);
        const center = map.layout.hexToPixel(hex);
        const dx = center.x - map.layout.size.x;
        const dy =
          Math.round(center.y - (Math.sqrt(3.0) * map.layout.size.y) / 2.0) -
          36;
        const randomIdx = Math.floor(Math.random() * this.spriteMap.size);
        const keysArr = Array.from(this.spriteMap.keys());
        const randomSprite = this.spriteMap.get(keysArr[randomIdx]) ?? {
          x: 3,
          y: 9,
          isWalkable: false,
        };
        const sx = (randomSprite ? randomSprite.x : 0) * 32;
        const sy = (randomSprite ? randomSprite.y : 0) * 48;
        this.map.set(FlatTopHexMap.hash(q, r), {
          hex,
          sprite: {
            type: keysArr[randomIdx],
            terrain: randomSprite,
            center,
            dx,
            dy,
            sx,
            sy,
          },
        });
      }
    }
  }
  async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((r) => {
      let i = new Image();
      i.onload = () => r(i);
      i.src = url;
    });
  }
  private drawSprites() {
    const sprites = Array.from(this.map.values()).sort((a, b) => {
      if (a.sprite?.terrain.z && b.sprite?.terrain.z) {
        return a.sprite.terrain.z - b.sprite.terrain.z;
      }
      return 1;
    });
    if (this.ctx) {
      for (let i = 0; i < sprites.length; i++) {
        this.ctx.drawImage(
          this.spriteMapImg as CanvasImageSource,
          sprites[i]?.sprite?.sx,
          sprites[i]?.sprite?.sy,
          32,
          48,
          sprites[i].sprite?.dx,
          sprites[i].sprite?.dy,
          64,
          96
        );
      }
    }
  }
  public getCursorPosition(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x, y };
  }
  private handleMouseMove(e: MouseEvent) {
    const { x, y } = this.getCursorPosition(e);
    this.activeHex = this.layout.pixelToHex({ x, y }).round();
    // this.drawMap();
  }
  private handleMouseUp(e: MouseEvent) {
    const { x, y } = this.getCursorPosition(e);
    const selectedHex = this.layout.pixelToHex({ x, y }).round();
    if (!this.hexPositionTuple[0]) {
      this.hexPositionTuple[0] = selectedHex;
      this.drawMap();
      return;
    }
    if (this.hexPositionTuple[0] && !this.hexPositionTuple[1]) {
      this.hexPositionTuple[1] = selectedHex;
      this.drawMap();
      return;
    }
    if (this.hexPositionTuple[0] && this.hexPositionTuple[1]) {
      this.hexPositionTuple = [selectedHex, null];
      this.drawMap();
      return;
    }
  }
  private bindEvents() {
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
  }

  private drawSelectedHex(hex: Hex, color: string, text: string = "") {
    if (this.ctx) {
      this.ctx.beginPath();
      const corners = this.layout.polygonCorners(hex);
      for (let i = 0; i < corners.length; i++) {
        const { x, y } = corners[i];
        this.ctx.lineTo(x, y);
      }
      this.ctx.closePath();
      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = "black";
      this.ctx.stroke();
      const center = this.layout.hexToPixel(hex);
      this.ctx.font = "12px serif";
      this.ctx.fillStyle = "white";
      this.ctx.fillText(text, center.x - 24, center.y + 10);
    }
  }

  /**
   * Draws a hexagon to the canvas.
   * @param {number} center - The location of the center of the hexagon.
   */
  public drawHex(hex: Hex, strokeWidth: number, color: string) {
    const center = this.layout.hexToPixel(hex);
    // human coords
    const coords = OffsetCoord.qoffsetFromCube(OffsetCoord.ODD, hex);

    if (this.ctx) {
      this.ctx.beginPath();
      const corners = this.layout.polygonCorners(hex);
      for (let i = 0; i < corners.length; i++) {
        const { x, y } = corners[i];
        this.ctx.lineTo(x, y);
      }
      this.ctx.closePath();
      if (this.activeHex?.q === hex.q && this.activeHex?.r === hex.r) {
        this.ctx.fillStyle = "rgba(255,255,255,0.6)";
        this.ctx.fill();
      }
      this.ctx.lineWidth = strokeWidth;
      this.ctx.strokeStyle = "white";
      this.ctx.stroke();
      this.ctx.font = "12px serif";
      this.ctx.fillStyle = color;
      // human readable coords
      // this.ctx.fillText(
      //   `${coords.col}, ${coords.row}`,
      //   center.x - 12,
      //   center.y
      // );
      this.ctx.fillText(`${hex.q}, ${hex.r}`, center.x - 12, center.y);
    }
  }
  drawGrid() {
    for (const value of this.map.values()) {
      this.drawHex(value.hex, 1, "rgba(255,255,255, 0.7)");
    }
    for (let i = 0; i < this.hexPositionTuple.length; i++) {
      if (this.hexPositionTuple[i]) {
        this.drawSelectedHex(
          this.hexPositionTuple[i]!,
          "rgba(242, 78, 63,0.6)"
        );
      }
    }
  }
  aStar(start: Hex, goal: Hex) {
    let toSearch: Hex[] = [start];
    let cameFrom: Record<string, Hex> = {};
    const processed: Hex[] = [];
    let gScore = new Map<string, number>();
    let hScore = new Map<string, number>();
    const hashFn = FlatTopHexMap.hash;

    while (toSearch.length > 0) {
      let current = toSearch[0];

      for (const i in toSearch) {
        const node = toSearch[i];
        const nodeG = gScore.get(hashFn(node.q, node.r));
        const nodeH = hScore.get(hashFn(node.q, node.r));
        const currentG = gScore.get(hashFn(current.q, current.r));
        const currentH = hScore.get(hashFn(current.q, current.r));
        let nodeF = null;
        let currentF = null;
        if (nodeG !== undefined && nodeH !== undefined) {
          nodeF = nodeG + nodeH;
        }
        if (currentG !== undefined && currentH !== undefined) {
          currentF = currentG + currentH;
        }
        if (
          typeof nodeF === "number" &&
          typeof currentF === "number" &&
          typeof nodeH === "number" &&
          typeof currentH === "number"
        ) {
          if (nodeF < currentF || (nodeF === currentF && nodeH < currentH)) {
            current = node;
          }
        }
      }

      this.drawSelectedHex(current, "rgba(52, 50, 166, 0.4)");
      processed.push(current);
      toSearch = toSearch.filter(
        (hex) => hex.q !== current.q && hex.r !== current.r
      );

      if (current.q === goal.q && current.r === goal.r) {
        let path = [current];
        let property = hashFn(current.q, current.r);
        while (property in cameFrom && this.map.get(property)?.hex) {
          property = hashFn(cameFrom[property].q, cameFrom[property].r);
          const newPath = this.map.get(property)?.hex;
          path.unshift(newPath!);
        }
        this.path = path;
        path.forEach((step) => {
          this.drawSelectedHex(step, "rgba(242, 78, 63,0.4)");
        });
        return path;
      }

      const neighbors = new Array(6)
        .fill(null)
        .map((_, idx) => {
          const neighborHex = current.neighbor(idx);
          return this.map.get(hashFn(neighborHex.q, neighborHex.r));
        })
        .filter((tile) => {
          return (
            tile &&
            tile.sprite?.terrain.isWalkable &&
            this.map.has(hashFn(tile.hex.q, tile.hex.r)) &&
            !processed.find(
              (hex) => hex.q === tile.hex.q && hex.r === tile.hex.r
            )
          );
        });
      for (let i = 0; i < neighbors.length; i++) {
        const neighbor = neighbors[i]?.hex!;
        const inSearch = toSearch.find(
          (hex) => hex.q === neighbor.q && hex.r === neighbor.r
        );

        const costToNeighbor =
          (gScore.get(hashFn(current.q, current.r)) ?? 0) +
          current.distance(neighbor);
        const neighborGScore =
          gScore.get(hashFn(neighbor.q, neighbor.r)) ?? null;
        this.drawSelectedHex(
          neighbor,
          "rgba(54, 137, 58, 0.4)",
          `g: ${costToNeighbor}, h: ${neighbor.distance(goal)}`
        );
        if (
          !inSearch ||
          (typeof neighborGScore === "number" &&
            costToNeighbor < neighborGScore)
        ) {
          gScore.set(hashFn(neighbor.q, neighbor.r), costToNeighbor);
          cameFrom[hashFn(neighbor.q, neighbor.r)] = current;
          if (!inSearch) {
            hScore.set(hashFn(neighbor.q, neighbor.r), neighbor.distance(goal));
            // hScore.set(hashFn(neighbor.q, neighbor.r), neighbor.distance(goal));
            toSearch.push(neighbor);
          }
        }
      }
    }
  }
}

// create a 10 x 10 grid
const map = new FlatTopHexMap("PlayArea", 0, 8, 0, 6);
