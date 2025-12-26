export class Generator {
  constructor(classifier) {
    if (!classifier || !classifier.definitions) throw new Error("Generator requires a valid Classifier instance.")
    this.classifier = classifier
    this.degToRad = Math.PI / 180
    this.radToDeg = 180 / Math.PI
  }

  generate(familyId) {
    const definition = this.classifier.definitions.find(d => d.id === familyId)
    if (!definition) throw new Error(`Unknown ID: ${familyId}`)
    if (!definition.genParams) throw new Error(`No generation parameters defined for ID ${familyId}`)
    const params = definition.genParams
    const lengths = this._resolveLengths(params.edges)
    const angles = this._resolveAngles(params.angles)
    const gramMatrix = this._buildGramMatrix(lengths, angles)
    return this._decompose(gramMatrix)
  }

  _resolveLengths(edges) { return { a: edges[0], b: edges[1], c: edges[2], d: edges[3] } }

  _resolveAngles(angleParams) {
    let A = { α: 90, β: 90, γ: 90, δ: 90, ε: 90, ζ: 90 }
    if (angleParams.all === 90) return A
    if (angleParams.α !== undefined) Object.assign(A, angleParams)
    if (angleParams.rule) {
      switch (angleParams.rule) {
        case "icosagonal":
          const icoAng = Math.acos(-0.25) * this.radToDeg
          A = { α: icoAng, β: icoAng, γ: icoAng, δ: icoAng, ε: icoAng, ζ: icoAng }
          break
        case "decagonal":
          A.α = angleParams.α
          A.γ = angleParams.α
          A.ζ = angleParams.α 
          const cosα = Math.cos(A.α * this.degToRad)
          const cosβ = -0.5 - cosα
          if (Math.abs(cosβ) > 1) throw new Error(`Decagonal geometry impossible with α=${A.α}`)
          A.β = Math.acos(cosβ) * this.radToDeg
          A.δ = A.β
          A.ε = A.β
          break
        case "ditrigonal_monoclinic":
          A.α = 120
          A.ζ = 120
          A.β = angleParams.β
          A.ε = angleParams.β
          const cosB_13 = Math.cos(A.β * this.degToRad)
          const cosG_13 = -0.5 * cosB_13
          A.γ = Math.acos(cosG_13) * this.radToDeg
          A.δ = A.γ
          break
        case "ditrigonal_diclinic":
          A.α = 120
          A.ζ = 120
          Object.assign(A, angleParams)
          A.ε = A.β
          const cB = Math.cos(A.β * this.degToRad)
          const cG = Math.cos(A.γ * this.degToRad)
          const cD = cB - cG       
          if (Math.abs(cD) > 1) throw new Error(`Ditrigonal Diclinic impossible with β=${A.β}, γ=${A.γ}`)
          A.δ = Math.acos(cD) * this.radToDeg
          break
      }
    }
    return A
  }

  _buildGramMatrix(L, A) {
    const cos = (deg) => Math.cos(deg * this.degToRad)
    const G = [
      [L.a*L.a, L.a*L.b*cos(A.γ), L.a*L.c*cos(A.β), L.a*L.d*cos(A.δ)],
      [L.b*L.a*cos(A.γ), L.b*L.b, L.b*L.c*cos(A.α), L.b*L.d*cos(A.ε)],
      [L.c*L.a*cos(A.β), L.c*L.b*cos(A.α), L.c*L.c, L.c*L.d*cos(A.ζ)],
      [L.d*L.a*cos(A.δ), L.d*L.b*cos(A.ε), L.d*L.c*cos(A.ζ), L.d*L.d]
    ];
    return G
  }

  _decompose(gramMatrix) {
    const n = gramMatrix.length
    const L = Array.from({ length: n }, () => Array(n).fill(0))
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0
        for (let k = 0; k < j; k++) { sum += L[i][k] * L[j][k] }
        if (i === j) {
          const val = gramMatrix[i][i] - sum
          if (val < -1e-9) {
            throw new Error(`Impossible Geometry: Matrix is not Positive Definite at index ${i}. The constraints create a broken shape.`)
          }
          L[i][j] = Math.sqrt(Math.max(0, val))
        } else {
          if (L[j][j] === 0) {
            L[i][j] = 0
          } else {
            L[i][j] = (gramMatrix[i][j] - sum) / L[j][j]
          }
        }
      }
    }
    return L
  }
}