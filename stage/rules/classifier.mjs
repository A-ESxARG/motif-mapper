export class Classifier {
  constructor(tolerance = 1e-4, angleTolerance = 15.0) {
    this.tolerance = tolerance
    this.angleTolerance = angleTolerance
    this.threshold = 15.0
    this.history = []
    this.definitions = this._initializeDefinitions()
    this.categories = this.definitions
  }

  addToHistory(event) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1)
    this.history.push(`[${timestamp}] ${event}`)
  }

  magnitude(v) { return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0)) }
  dotProduct(v1, v2) { return v1.reduce((sum, x, i) => sum + x * v2[i], 0) }
  
  angleBetween(v1, v2) {
    const mag1 = this.magnitude(v1)
    const mag2 = this.magnitude(v2)
    const dot = this.dotProduct(v1, v2)
    const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)))
    return Math.acos(cosTheta) * (180 / Math.PI)
  }

  analyzeVectors(a, b, c, d, customTol = null, customAngTol = null) {
    const activeTol = customTol ?? this.tolerance
    const activeAngTol = customAngTol ?? this.angleTolerance
    const lengths = { a: this.magnitude(a), b: this.magnitude(b), c: this.magnitude(c), d: this.magnitude(d) }
    const angles = {
      α: this.angleBetween(b, c), β: this.angleBetween(a, c), γ: this.angleBetween(a, b),
      δ: this.angleBetween(a, d), ε: this.angleBetween(b, d), ζ: this.angleBetween(c, d)
    }
    const sym = this._createSymmetryMap(lengths, angles, activeTol, activeAngTol)
    let matched = this.definitions.find(def => def.check(lengths, angles, sym))
    const result = matched || { id: 0, name: "Unclassified configuration", edges: "indep.", angles: "indep." }
    this.addToHistory(`Analysis with Tol: ${activeTol}, AngTol: ${activeAngTol} -> Result: ${result.name}`)
    return {
      category: result.name,
      categoryId: result.id,
      metrics: { lengths, angles },
      activeTolerances: { tolerance: activeTol, angleTolerance: activeAngTol },
      history: this.history
    }
  }

  _createSymmetryMap(L, A, tol, angTol) {
    const eq = (v1, v2) => Math.abs(v1 - v2) < tol
    const ang = (a1, a2) => Math.abs(a1 - a2) < angTol
    const is90 = (v) => ang(v, 90)
    const is120 = (v) => ang(v, 120)
    return {
      allEdgesEq: eq(L.a, L.b) && eq(L.b, L.c) && eq(L.c, L.d),
      abcEq: eq(L.a, L.b) && eq(L.b, L.c),
      bcEq: eq(L.b, L.c),
      adEq: eq(L.a, L.d),
      allEdgesDiff: !eq(L.a, L.b) && !eq(L.a, L.c) && !eq(L.a, L.d) && !eq(L.b, L.c) && !eq(L.b, L.d) && !eq(L.c, L.d),
      all90: is90(A.α) && is90(A.β) && is90(A.γ) && is90(A.δ) && is90(A.ε) && is90(A.ζ),
      allEq: ang(A.α, A.β) && ang(A.β, A.γ) && ang(A.γ, A.δ) && ang(A.δ, A.ε) && ang(A.ε, A.ζ),
      none90: !is90(A.α) && !is90(A.β) && !is90(A.γ) && !is90(A.δ) && !is90(A.ε) && !is90(A.ζ),
      is90, is120, eq, ang
    }
  }

  _initializeDefinitions() {
    const cos = (deg) => Math.cos(deg * Math.PI / 180)
    return [
      {
        id: 23,
        name: "Hypercubic",
        edges: "a=b=c=d", angles: "all 90°",
        genParams: { edges: [1, 1, 1, 1], angles: { all: 90 } },
        check: (_,_A,S) => S.allEdgesEq && S.all90
      },
      {
        id: 22,
        name: "Icosagonal",
        edges: "a=b=c=d", angles: "all eq, cos α = -1/4",
        genParams: { edges: [1, 1, 1, 1], angles: { rule: "icosagonal" } },
        check: (_,A,S) => S.allEdgesEq && S.allEq && S.eq(cos(A.α), -0.25)
      },
      {
        id: 21,
        name: "Diisohexagonal orthogonal",
        edges: "a=b=c=d", angles: "α=ζ=120°, others 90°",
        genParams: { edges: [1, 1, 1, 1], angles: { α: 120, β: 90, γ: 90, δ: 90, ε: 90, ζ: 120 } },
        check: (_,A,S) => S.allEdgesEq && S.is120(A.α) && S.is120(A.ζ) && S.is90(A.β) && S.is90(A.γ) && S.is90(A.δ) && S.is90(A.ε)
      },
      {
        id: 20,
        name: "Dodecagonal",
        edges: "a=b=c=d", angles: "α=ζ=90°, β=ε=120°, γ=δ≠90°",
        genParams: { edges: [1, 1, 1, 1], angles: { α: 90, β: 120, γ: 80, δ: 80, ε: 120, ζ: 90 } }, 
        check: (_,A,S) => S.allEdgesEq && S.is90(A.α) && S.is90(A.ζ) && S.is120(A.β) && S.is120(A.ε) && S.ang(A.γ, A.δ) && !S.is90(A.γ)
      },
      {
        id: 19,
        name: "Decagonal",
        edges: "a=b=c=d", angles: "α=γ=ζ, β=δ=ε, cos β = -0.5 - cos α",
        genParams: { edges: [1, 1, 1, 1], angles: { rule: "decagonal", α: 144 } },
        check: (_,A,S) => S.allEdgesEq && S.ang(A.α, A.γ) && S.ang(A.γ, A.ζ) && S.ang(A.β, A.δ) && S.ang(A.δ, A.ε) && S.eq(cos(A.β), -0.5 - cos(A.α))
      },
      {
        id: 18,
        name: "Octagonal",
        edges: "a=b=c=d", angles: "α=γ=ζ≠90°, β=ε=90°, δ=180-α",
        genParams: { edges: [1, 1, 1, 1], angles: { α: 45, β: 90, γ: 45, δ: 135, ε: 90, ζ: 45 } },
        check: (_,A,S) => S.allEdgesEq && S.ang(A.α, A.γ) && S.ang(A.γ, A.ζ) && !S.is90(A.α) && S.is90(A.β) && S.is90(A.ε) && S.ang(A.δ, 180 - A.α)
      },
      {
        id: 17,
        name: "Cubic orthogonal",
        edges: "a=b=c ≠ d", angles: "all 90°",
        genParams: { edges: [1, 1, 1, 2], angles: { all: 90 } },
        check: (L,_,S) => S.abcEq && !S.eq(L.c, L.d) && S.all90
      },
      {
        id: 16,
        name: "Dihexagonal orthogonal",
        edges: "a=d ≠ b=c", angles: "α=ζ=120°, others 90°",
        genParams: { edges: [1, 2, 2, 1], angles: { α: 120, β: 90, γ: 90, δ: 90, ε: 90, ζ: 120 } },
        check: (L,A,S) => S.adEq && S.bcEq && !S.eq(L.a, L.b) && S.is120(A.α) && S.is120(A.ζ) && S.is90(A.β) && S.is90(A.γ) && S.is90(A.δ) && S.is90(A.ε)
      },
      {
        id: 15,
        name: "Hexagonal tetragonal",
        edges: "a=d ≠ b=c", angles: "all 90°, ζ=120°",
        genParams: { edges: [1, 2, 2, 1], angles: { α: 90, β: 90, γ: 90, δ: 90, ε: 90, ζ: 120 } },
        check: (L,A,S) => S.adEq && S.bcEq && !S.eq(L.a, L.b) && S.is120(A.ζ) && S.is90(A.α) && S.is90(A.β) && S.is90(A.γ) && S.is90(A.δ) && S.is90(A.ε)
      },
      {
        id: 14,
        name: "Ditetragonal orthogonal",
        edges: "a=d ≠ b=c", angles: "all 90°",
        genParams: { edges: [1, 2, 2, 1], angles: { all: 90 } },
        check: (L,_,S) => S.adEq && S.bcEq && !S.eq(L.a, L.b) && S.all90
      },
      {
        id: 13,
        name: "Ditrigonal monoclinic",
        edges: "a=d ≠ b=c", angles: "α=ζ=120°, β=ε, γ=δ, cos γ = -0.5 cosβ",
        genParams: { edges: [1, 2, 2, 1], angles: { rule: "ditrigonal_monoclinic", β: 60 } },
        check: (_,A,S) => S.adEq && S.bcEq && S.is120(A.α) && S.is120(A.ζ) && S.ang(A.β, A.ε) && S.ang(A.γ, A.δ) && S.eq(cos(A.γ), -0.5 * cos(A.β)) && !S.is90(A.β) && !S.is90(A.γ)
      },
      {
        id: 12,
        name: "Ditetragonal monoclinic",
        edges: "a=d ≠ b=c", angles: "α=γ=δ=ζ=90°, β=ε≠90°",
        genParams: { edges: [1, 2, 2, 1], angles: { α: 90, β: 45, γ: 90, δ: 90, ε: 45, ζ: 90 } },
        check: (L,A,S) => S.adEq && S.bcEq && !S.eq(L.a, L.b) && S.is90(A.α) && S.is90(A.γ) && S.is90(A.δ) && S.is90(A.ζ) && S.ang(A.β, A.ε) && !S.is90(A.β)
      },
      {
        id: 11,
        name: "Hexagonal orthogonal",
        edges: "a≠b=c≠d", angles: "ζ=120°, others 90°",
        genParams: { edges: [1, 2, 2, 2], angles: { α: 90, β: 90, γ: 90, δ: 90, ε: 90, ζ: 120 } },
        check: (L,A,S) => !S.eq(L.a, L.b) && S.bcEq && !S.eq(L.c, L.d) && S.is120(A.ζ) && S.is90(A.α) && S.is90(A.β) && S.is90(A.γ) && S.is90(A.δ) && S.is90(A.ε)
      },
      {
        id: 10,
        name: "Tetragonal orthogonal",
        edges: "a≠b=c≠d", angles: "all 90°",
        genParams: { edges: [1, 2, 2, 3], angles: { all: 90 } },
        check: (L,_,S) => !S.eq(L.a, L.b) && S.bcEq && !S.eq(L.c, L.d) && S.all90
      },
      {
        id: 9,
        name: "Ditrigonal diclinic",
        edges: "a=d ≠ b=c", angles: "α=ζ=120°, β=ε≠90°, cos δ = cos β - cos γ",
        genParams: { edges: [1, 2, 2, 1], angles: { rule: "ditrigonal_diclinic", β: 75, γ: 100 } },
        check: (L,A,S) => S.adEq && S.bcEq && S.is120(A.α) && S.is120(A.ζ) && S.ang(A.β, A.ε) && !S.ang(A.γ, A.δ) && !S.is90(A.γ) && !S.is90(A.β) && !S.is90(A.δ) && S.eq(cos(A.δ), cos(A.β) - cos(A.γ))
      },
      {
        id: 8,
        name: "Ditetragonal diclinic",
        edges: "a=d ≠ b=c", angles: "α=ζ=90°, β=ε≠90°, γ≠90°, δ=180°−γ",
        genParams: { edges: [1, 2, 2, 1], angles: { α: 90, β: 75, γ: 60, δ: 120, ε: 75, ζ: 90 } },
        check: (_,A,S) => S.adEq && S.bcEq && S.is90(A.α) && S.is90(A.ζ) && S.ang(A.β, A.ε) && !S.is90(A.β) && !S.is90(A.γ) && S.ang(A.δ, 180 - A.γ)
      },
      {
        id: 7,
        name: "Hexagonal monoclinic",
        edges: "a≠b=c≠d", angles: "α≠90°, ζ=120°, others 90°",
        genParams: { edges: [1, 2, 2, 3], angles: { α: 75, β: 90, γ: 90, δ: 90, ε: 90, ζ: 120 } },
        check: (L,A,S) => !S.eq(L.a, L.b) && S.bcEq && !S.eq(L.c, L.d) && !S.is90(A.α) && S.is120(A.ζ) && S.is90(A.β) && S.is90(A.γ) && S.is90(A.δ) && S.is90(A.ε)
      },
      {
        id: 6,
        name: "Tetragonal monoclinic",
        edges: "a≠b=c≠d", angles: "α≠90°, others 90°",
        genParams: { edges: [1, 2, 2, 3], angles: { α: 75, β: 90, γ: 90, δ: 90, ε: 90, ζ: 90 } },
        check: (L,A,S) => !S.eq(L.a, L.b) && S.bcEq && !S.eq(L.c, L.d) && !S.is90(A.α) && S.is90(A.β) && S.is90(A.γ) && S.is90(A.δ) && S.is90(A.ε) && S.is90(A.ζ)
      },
      {
        id: 5,
        name: "Orthogonal",
        edges: "a≠b≠c≠d", angles: "all 90°",
        genParams: { edges: [1, 2, 3, 4], angles: { all: 90 } },
        check: (_,_A,S) => S.allEdgesDiff && S.all90
      },
      {
        id: 4,
        name: "Monoclinic",
        edges: "a≠b≠c≠d", angles: "α≠90°, others 90°",
        genParams: { edges: [1, 2, 3, 4], angles: { α: 75, β: 90, γ: 90, δ: 90, ε: 90, ζ: 90 } },
        check: (_,A,S) => S.allEdgesDiff && !S.is90(A.α) && S.is90(A.β) && S.is90(A.γ) && S.is90(A.δ) && S.is90(A.ε) && S.is90(A.ζ)
      },
      {
        id: 3,
        name: "Diclinic",
        edges: "a≠b≠c≠d", angles: "α≠90°, ζ≠90°, others 90°",
        genParams: { edges: [1, 2, 3, 4], angles: { α: 75, β: 90, γ: 90, δ: 90, ε: 90, ζ: 75 } },
        check: (_,A,S) => S.allEdgesDiff && !S.is90(A.α) && !S.is90(A.ζ) && S.is90(A.β) && S.is90(A.γ) && S.is90(A.δ) && S.is90(A.ε)
      },
      {
        id: 2,
        name: "Triclinic",
        edges: "a≠b≠c≠d", angles: "α≠β≠γ≠90°, δ=ε=ζ=90°",
        genParams: { edges: [1, 2, 3, 4], angles: { α: 60, β: 70, γ: 80, δ: 90, ε: 90, ζ: 90 } },
        check: (_,A,S) => S.allEdgesDiff && !S.is90(A.α) && !S.is90(A.β) && !S.is90(A.γ) && S.is90(A.δ) && S.is90(A.ε) && S.is90(A.ζ)
      },
      {
        id: 1,
        name: "Hexaclinic",
        edges: "a≠b≠c≠d", angles: "all ≠ 90°, none eq",
        genParams: { edges: [1, 2, 3, 4], angles: { α: 15, β: 45, γ: 60, δ: 75, ε: 25, ζ: 50 } },
        check: (_,_A,S) => S.allEdgesDiff && S.none90 && !S.allEq
      }
    ]
  }
}