import { Verifier } from '../tools/verifier.mjs'

const verifier = new Verifier()
const baseRanges = [[0, 23], [1, 10], [1, 5], [3, 8]]

function runScenario(label, alignmentType) {
  console.log(`\n=== SCENARIO: ${label.toUpperCase()} ===`)
  verifier.phaseTrust = 0.5
  verifier.history = []
  for (let day = 1; day <= 7; day++) {
    const pA = [0, 1, 1, 3]
    let pB
    if (alignmentType === 'high') {
      const target = [23, 10, 5, 3] 
      pB = target.map((val, i) => {
        const jitter = (Math.random() - 0.5) * 0.1
        return Math.max(baseRanges[i][0], Math.min(baseRanges[i][1], val + jitter))
      })
    } else {
      pB = baseRanges.map(r => r[0] + Math.random() * (r[1] - r[0]))
    }
    const rawData = [pA, pB, [23, 1, 1, 3], [0, 10, 5, 8]]
    const result = verifier.auditSnapshot(rawData, baseRanges)
    const angleDelta = Math.abs(result.angle - 120).toFixed(2)
    const vecB = pB.map((val, i) => Verifier.normalize(val, baseRanges[i][0], baseRanges[i][1]))
    const magB = Math.sqrt(vecB.reduce((s, x) => s + x * x, 0))
    const magDelta = Math.abs(magB - 2.0).toFixed(3)
    const trustStr = (result.trust * 100).toFixed(0).padStart(3)
    console.log(`Measure ${day}: [${result.motif.padEnd(28)}] | ` + `Angle: ${result.angle.toFixed(1)}° (Δ${angleDelta}°) | ` + 
      `Mag: ${magB.toFixed(2)} (Δ${magDelta}) | ` + `Trust: ${trustStr}%`)
  }
  const verdict = verifier.phaseTrust > 0.8 ? "✅ PROTOCOL VERIFIED" : "❌ UNKNOWN ACTOR"
  console.log(`\nFinal Verdict: ${verdict}\n${"=".repeat(80)}`)
}

runScenario("Intentional Alignment", 'high')
runScenario("Minimal Random Alignment", 'low')