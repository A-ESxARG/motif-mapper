import { Classifier } from './classifier.mjs'

export class Assembler {
  constructor(knownSignatures) {
    this.classifier = new Classifier()
    this.knownSignatures = knownSignatures || {
      "PlayerA": ["Orthogonal", "Decagonal", "Hypercubic", "Hexagonal tetragonal"],
      "PlayerB": ["Orthogonal", "Hypercubic", "Cubic orthogonal", "Ditetragonal diclinic"]
    }
  }

  verifySignatureChain(history, options = { 
    tolerance: this.classifier.tolerance, angleTolerance: this.classifier.angleTolerance }) {
    const rawChain = history.map(vectors => {
      const res = this.classifier.analyzeVectors(...vectors, options.tolerance, options.angleTolerance)
      return res.category
    })
    const cleanChain = rawChain.map(label => label.split(' (')[0].trim())
    let matchedProtocol = "Unknown Actor"
    for (const [name, sequence] of Object.entries(this.knownSignatures)) {
      const seqStr = JSON.stringify(sequence)
      for (let i = 0; i <= cleanChain.length - sequence.length; i++) {
        const window = cleanChain.slice(i, i + sequence.length)
        if (JSON.stringify(window) === seqStr) {
          matchedProtocol = name
          break
        }
      }
      if (matchedProtocol !== "Unknown Actor") break
    }
    return {
      chain: rawChain,
      matchedProtocol,
      entropy: this._calculateChainEntropy(cleanChain),
      timestamp: new Date().toISOString()
    }
  }

  _calculateChainEntropy(chain) {
    if (chain.length === 0) return 0
    const unique = new Set(chain).size
    return unique / chain.length
  }
}