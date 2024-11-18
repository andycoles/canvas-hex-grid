"use strict";
(() => {
  // src/index.ts
  var Point = class {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  };
  var Hex = class _Hex {
    constructor(q, r, s) {
      this.q = q;
      this.r = r;
      this.s = s;
      if (Math.round(q + r + s) !== 0) throw "q + r + s must be 0";
    }
    add(b) {
      return new _Hex(this.q + b.q, this.r + b.r, this.s + b.s);
    }
    subtract(b) {
      return new _Hex(this.q - b.q, this.r - b.r, this.s - b.s);
    }
    scale(k) {
      return new _Hex(this.q * k, this.r * k, this.s * k);
    }
    rotateLeft() {
      return new _Hex(-this.s, -this.q, -this.r);
    }
    rotateRight() {
      return new _Hex(-this.r, -this.s, -this.q);
    }
    static {
      this.directions = [
        new _Hex(1, 0, -1),
        new _Hex(1, -1, 0),
        new _Hex(0, -1, 1),
        new _Hex(-1, 0, 1),
        new _Hex(-1, 1, 0),
        new _Hex(0, 1, -1)
      ];
    }
    static direction(direction) {
      return _Hex.directions[direction];
    }
    neighbor(direction) {
      return this.add(_Hex.direction(direction));
    }
    static {
      this.diagonals = [
        new _Hex(2, -1, -1),
        new _Hex(1, -2, 1),
        new _Hex(-1, -1, 2),
        new _Hex(-2, 1, 1),
        new _Hex(-1, 2, -1),
        new _Hex(1, 1, -2)
      ];
    }
    diagonalNeighbor(direction) {
      return this.add(_Hex.diagonals[direction]);
    }
    len() {
      return (Math.abs(this.q) + Math.abs(this.r) + Math.abs(this.s)) / 2;
    }
    distance(b) {
      return this.subtract(b).len();
    }
    round() {
      var qi = Math.round(this.q);
      var ri = Math.round(this.r);
      var si = Math.round(this.s);
      var q_diff = Math.abs(qi - this.q);
      var r_diff = Math.abs(ri - this.r);
      var s_diff = Math.abs(si - this.s);
      if (q_diff > r_diff && q_diff > s_diff) {
        qi = -ri - si;
      } else if (r_diff > s_diff) {
        ri = -qi - si;
      } else {
        si = -qi - ri;
      }
      return new _Hex(qi, ri, si);
    }
    lerp(b, t) {
      return new _Hex(
        this.q * (1 - t) + b.q * t,
        this.r * (1 - t) + b.r * t,
        this.s * (1 - t) + b.s * t
      );
    }
    linedraw(b) {
      var N = this.distance(b);
      var a_nudge = new _Hex(this.q + 1e-6, this.r + 1e-6, this.s - 2e-6);
      var b_nudge = new _Hex(b.q + 1e-6, b.r + 1e-6, b.s - 2e-6);
      var results = [];
      var step = 1 / Math.max(N, 1);
      for (var i = 0; i <= N; i++) {
        results.push(a_nudge.lerp(b_nudge, step * i).round());
      }
      return results;
    }
  };
  var Orientation = class {
    constructor(f0, f1, f2, f3, b0, b1, b2, b3, start_angle) {
      this.f0 = f0;
      this.f1 = f1;
      this.f2 = f2;
      this.f3 = f3;
      this.b0 = b0;
      this.b1 = b1;
      this.b2 = b2;
      this.b3 = b3;
      this.start_angle = start_angle;
    }
  };
  var Layout = class {
    constructor(orientation, size, origin) {
      this.orientation = orientation;
      this.size = size;
      this.origin = origin;
    }
    static {
      this.pointy = new Orientation(
        Math.sqrt(3),
        Math.sqrt(3) / 2,
        0,
        3 / 2,
        Math.sqrt(3) / 3,
        -1 / 3,
        0,
        2 / 3,
        0.5
      );
    }
    static {
      this.flat = new Orientation(
        3 / 2,
        0,
        Math.sqrt(3) / 2,
        Math.sqrt(3),
        2 / 3,
        0,
        -1 / 3,
        Math.sqrt(3) / 3,
        0
      );
    }
    hexToPixel(h) {
      var M = this.orientation;
      var size = this.size;
      var origin = this.origin;
      var x = (M.f0 * h.q + M.f1 * h.r) * size.x;
      var y = (M.f2 * h.q + M.f3 * h.r) * size.y;
      return { x: x + origin.x, y: y + origin.y };
    }
    pixelToHex(p) {
      var M = this.orientation;
      var size = this.size;
      var origin = this.origin;
      var pt = {
        x: (p.x - origin.x) / size.x,
        y: (p.y - origin.y) / size.y
      };
      var q = M.b0 * pt.x + M.b1 * pt.y;
      var r = M.b2 * pt.x + M.b3 * pt.y;
      return new Hex(q, r, -q - r);
    }
    hexCornerOffset(corner) {
      var M = this.orientation;
      var size = this.size;
      var angle = 2 * Math.PI * (M.start_angle - corner) / 6;
      return new Point(size.x * Math.cos(angle), size.y * Math.sin(angle));
    }
    polygonCorners(h) {
      var corners = [];
      var center = this.hexToPixel(h);
      for (var i = 0; i < 6; i++) {
        var offset = this.hexCornerOffset(i);
        corners.push(new Point(center.x + offset.x, center.y + offset.y));
      }
      return corners;
    }
  };
  var OffsetCoord = class _OffsetCoord {
    constructor(col, row) {
      this.col = col;
      this.row = row;
    }
    static {
      this.EVEN = 1;
    }
    static {
      this.ODD = -1;
    }
    // flat top orientation
    static qoffsetFromCube(offset, h) {
      var col = h.q;
      var row = h.r + (h.q + offset * (h.q & 1)) / 2;
      if (offset !== _OffsetCoord.EVEN && offset !== _OffsetCoord.ODD) {
        throw "offset must be EVEN (+1) or ODD (-1)";
      }
      return new _OffsetCoord(col, row);
    }
    static qoffsetToCube(offset, h) {
      var q = h.col;
      var r = h.row - (h.col + offset * (h.col & 1)) / 2;
      var s = -q - r;
      if (offset !== _OffsetCoord.EVEN && offset !== _OffsetCoord.ODD) {
        throw "offset must be EVEN (+1) or ODD (-1)";
      }
      return new Hex(q, r, s);
    }
    // pointy top orientation
    static roffsetFromCube(offset, h) {
      var col = h.q + (h.r + offset * (h.r & 1)) / 2;
      var row = h.r;
      if (offset !== _OffsetCoord.EVEN && offset !== _OffsetCoord.ODD) {
        throw "offset must be EVEN (+1) or ODD (-1)";
      }
      return new _OffsetCoord(col, row);
    }
    static roffsetToCube(offset, h) {
      var q = h.col - (h.row + offset * (h.row & 1)) / 2;
      var r = h.row;
      var s = -q - r;
      if (offset !== _OffsetCoord.EVEN && offset !== _OffsetCoord.ODD) {
        throw "offset must be EVEN (+1) or ODD (-1)";
      }
      return new Hex(q, r, s);
    }
  };
  var FlatTopHexMap = class _FlatTopHexMap {
    constructor(canvasId, left, right, top, bottom) {
      this.spriteMap = /* @__PURE__ */ new Map([
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
        ["MountainImpassable2", { x: 0, y: 6, z: 5, isWalkable: false }]
        // ["lake1", { x: 12, y: 0, z: 0, isWalkable: false }],
        // ["lake2", { x: 3, y: 1, z: 0, isWalkable: false }],
        // ["lake3", { x: 2, y: 1, z: 0, isWalkable: false }],
        // ["lake4", { x: 8, y: 1, z: 0, isWalkable: false }],
        // ["Volcano", { x: 3, y: 6, z: 5, isWalkable: false }],
        // ["lair", { x: 0, y: 8 }],
        // ["lairSnow", { x: 1, y: 8 }],
        // ["lairDesert", { x: 2, y: 8 }],
      ]);
      this.activeHex = null;
      this.canvas = document.getElementById(canvasId);
      this.ctx = this.canvas.getContext("2d");
      if (this.ctx) {
        this.ctx.imageSmoothingEnabled = false;
      }
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleMouseUp = this.handleMouseUp.bind(this);
      this.map = /* @__PURE__ */ new Map();
      this.hexPositionTuple = [null, null];
      this.layout = new Layout(Layout.flat, { x: 32, y: 32 }, { x: 32, y: 32 });
      this.spriteMapImg = null;
      this.path = [];
      this.init(left, right, top, bottom);
    }
    static hash(q, r) {
      return `${q},${r}`;
    }
    async init(left, right, top, bottom) {
      await this.loadSprites();
      console.log("Loaded sprite map(s).");
      this.generateMap(left, right, top, bottom);
      this.drawMap();
      this.bindEvents();
    }
    drawMap() {
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
    }
    async loadSprites() {
      this.spriteMapImg = await this.loadImage("./img/tileset.png");
    }
    generateMap(left, right, top, bottom) {
      for (let q = left; q <= right; q++) {
        const qOffset = Math.floor(q / 2);
        for (let r = top - qOffset; r <= bottom - qOffset; r++) {
          const hex = new Hex(q, r, -q - r);
          const center = map.layout.hexToPixel(hex);
          const dx = center.x - map.layout.size.x;
          const dy = Math.round(center.y - Math.sqrt(3) * map.layout.size.y / 2) - 36;
          const randomIdx = Math.floor(Math.random() * this.spriteMap.size);
          const keysArr = Array.from(this.spriteMap.keys());
          const randomSprite = this.spriteMap.get(keysArr[randomIdx]) ?? {
            x: 3,
            y: 9,
            isWalkable: false
          };
          const sx = (randomSprite ? randomSprite.x : 0) * 32;
          const sy = (randomSprite ? randomSprite.y : 0) * 48;
          this.map.set(_FlatTopHexMap.hash(q, r), {
            hex,
            sprite: {
              type: keysArr[randomIdx],
              terrain: randomSprite,
              center,
              dx,
              dy,
              sx,
              sy
            }
          });
        }
      }
    }
    async loadImage(url) {
      return new Promise((r) => {
        let i = new Image();
        i.onload = () => r(i);
        i.src = url;
      });
    }
    drawSprites() {
      const sprites = Array.from(this.map.values()).sort((a, b) => {
        if (a.sprite?.terrain.z && b.sprite?.terrain.z) {
          return a.sprite.terrain.z - b.sprite.terrain.z;
        }
        return 1;
      });
      if (this.ctx) {
        for (let i = 0; i < sprites.length; i++) {
          this.ctx.drawImage(
            this.spriteMapImg,
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
    getCursorPosition(event) {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      return { x, y };
    }
    handleMouseMove(e) {
      const { x, y } = this.getCursorPosition(e);
      this.activeHex = this.layout.pixelToHex({ x, y }).round();
    }
    handleMouseUp(e) {
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
    bindEvents() {
      this.canvas.addEventListener("mousemove", this.handleMouseMove);
      this.canvas.addEventListener("mouseup", this.handleMouseUp);
    }
    drawSelectedHex(hex, color, text = "") {
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
    drawHex(hex, strokeWidth, color) {
      const center = this.layout.hexToPixel(hex);
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
            this.hexPositionTuple[i],
            "rgba(242, 78, 63,0.6)"
          );
        }
      }
    }
    aStar(start, goal) {
      let toSearch = [start];
      let cameFrom = {};
      const processed = [];
      let gScore = /* @__PURE__ */ new Map();
      let hScore = /* @__PURE__ */ new Map();
      const hashFn = _FlatTopHexMap.hash;
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
          if (nodeG !== void 0 && nodeH !== void 0) {
            nodeF = nodeG + nodeH;
          }
          if (currentG !== void 0 && currentH !== void 0) {
            currentF = currentG + currentH;
          }
          if (typeof nodeF === "number" && typeof currentF === "number" && typeof nodeH === "number" && typeof currentH === "number") {
            if (nodeF < currentF || nodeF === currentF && nodeH < currentH) {
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
            path.unshift(newPath);
          }
          this.path = path;
          path.forEach((step) => {
            this.drawSelectedHex(step, "rgba(242, 78, 63,0.4)");
          });
          return path;
        }
        const neighbors = new Array(6).fill(null).map((_, idx) => {
          const neighborHex = current.neighbor(idx);
          return this.map.get(hashFn(neighborHex.q, neighborHex.r));
        }).filter((tile) => {
          return tile && tile.sprite?.terrain.isWalkable && this.map.has(hashFn(tile.hex.q, tile.hex.r)) && !processed.find(
            (hex) => hex.q === tile.hex.q && hex.r === tile.hex.r
          );
        });
        for (let i = 0; i < neighbors.length; i++) {
          const neighbor = neighbors[i]?.hex;
          const inSearch = toSearch.find(
            (hex) => hex.q === neighbor.q && hex.r === neighbor.r
          );
          const costToNeighbor = (gScore.get(hashFn(current.q, current.r)) ?? 0) + current.distance(neighbor);
          const neighborGScore = gScore.get(hashFn(neighbor.q, neighbor.r)) ?? null;
          this.drawSelectedHex(
            neighbor,
            "rgba(54, 137, 58, 0.4)",
            `g: ${costToNeighbor}, h: ${neighbor.distance(goal)}`
          );
          if (!inSearch || typeof neighborGScore === "number" && costToNeighbor < neighborGScore) {
            gScore.set(hashFn(neighbor.q, neighbor.r), costToNeighbor);
            cameFrom[hashFn(neighbor.q, neighbor.r)] = current;
            if (!inSearch) {
              hScore.set(hashFn(neighbor.q, neighbor.r), neighbor.distance(goal));
              toSearch.push(neighbor);
            }
          }
        }
      }
    }
  };
  var map = new FlatTopHexMap("PlayArea", 0, 8, 0, 6);
})();
