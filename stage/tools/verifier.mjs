import { Assembler } from '../rules/assembler.mjs'

export class Verifier {
  constructor() {
    this.assembler = new Assembler()
    this.phaseTrust = 0.5
    this.phaseThreshold = 0.7
    this.history = []
    this.angleTolerance = this.assembler.classifier.angleTolerance
    this.tolerance = this.assembler.classifier.tolerance
  }

  static normalize(val, min, max) {
    const n = ((val - min) / (max - min)) * 2 - 1
    return Math.abs(n) < 0.01 ? 0.01 : n
  }

  static getAngle(vecA, vecB) {
    const dot = vecA.reduce((sum, val, i) => sum + val * (vecB[i] || 0), 0)
    const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0))
    const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0))
    if (magA === 0 || magB === 0) return 90
    const cosTheta = dot / (magA * magB)
    return Math.acos(Math.max(-1, Math.min(1, cosTheta))) * (180 / Math.PI)
  }

  auditSnapshot(rawVectors, ranges) {
    const vectors = rawVectors.map(point => point.map((val, i) => Verifier.normalize(val, ranges[i][0], ranges[i][1])))
    this.history.push(vectors)
    const snapshot = this.assembler.verifySignatureChain([vectors], { 
      tolerance: this.tolerance, angleTolerance: this.angleTolerance
    })
    const namedMotif = snapshot.chain[0]
    const isNamedFamily = namedMotif !== "Unclassified configuration"
    const angle = Verifier.getAngle(vectors[0], vectors[1])
    const isPhaseLocked = [72, 90, 104, 120].some(node => Math.abs(angle - node) < this.angleTolerance)
    if (isNamedFamily || isPhaseLocked) {
      this.phaseTrust = Math.min(1, this.phaseTrust + 0.2)
    } else {
      this.phaseTrust = Math.max(0, this.phaseTrust - 0.18)
    }
    const chainReport = this.assembler.verifySignatureChain(this.history, { 
      tolerance: this.tolerance, angleTolerance: this.angleTolerance
    })
    let motifLabel = "Baseline Entropy"
    if (this.phaseTrust > this.phaseThreshold) {
      if (isNamedFamily) {
        motifLabel = `${namedMotif} (Verified)`
      } else if (Math.abs(angle - 90) < this.angleTolerance) {
        motifLabel = "Orthogonal Sync (90°)"
      } else if (Math.abs(angle - 120) < this.angleTolerance) {
        motifLabel = "Decagonal Sync (120°)"
      } else {
        motifLabel = "Relational Sync"
      }
    } else if (this.phaseTrust > 0.5) {
      motifLabel = "Emergent Symmetry"
    }
    if (chainReport.matchedProtocol !== "Unknown Actor") this.phaseTrust = 1.0
    return { 
      motif: motifLabel, 
      trust: this.phaseTrust, 
      angle: angle,
      protocol: chainReport.matchedProtocol 
    }
  }
}