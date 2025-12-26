import { Assembler } from '../rules/assembler.mjs'

const Keys = {
  orthogonal: () => [[5, 0, 0, 0], [0, 1, 0, 0], [0, 0, 2, 0], [0, 0, 0, 3]],
  decagonal: () => [[1, 0, 0, 0], [-0.809, 0.588, 0, 0], [0.309, -0.951, 0, 0], [0.309, 0.951, 0, 0]],
  hexagonalTetragonal: () => [[1, 0, 0, 0], [0, 2, 0, 0], [0, 0, 2, 0], [0, 0, -0.5, 0.866]],
  ditetragonalDiclinic: () => [[1, 0, 0, 0], [1, 1.732, 0, 0], [0.518, -0.299, 1.909, 0], [-0.5, 0.588, 0.228, 0.594]],
  cubicOrthogonal: () => [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 2]],
  hypercubic: () => [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]],
  random: () => Array.from({length: 4}, () => Array.from({length: 4}, () => (Math.random() - 0.5) * 5))
}

const applyJitter = (history, amount = 0.005) => history.map(vectors => vectors.map(v => v.map(c => c + (Math.random() - 0.5) * amount)))

function runAudit() {
  const assembler = new Assembler({ 
    "PlayerA": ["Decagonal", "Cubic orthogonal", "Hexagonal tetragonal"],
    "PlayerB": ["Hypercubic", "Decagonal", "Ditetragonal diclinic"]
  })
  console.log(`\n\nChanged Signatures: ${JSON.stringify(assembler.knownSignatures, null, 2)}`)
  console.log(`Timestamp: ${new Date().toISOString()}\n`)

  console.log("1: High-Discernment Motif")
  const playerAHistory = [Keys.decagonal(), Keys.cubicOrthogonal(), Keys.hexagonalTetragonal()]
  const softSignal = applyJitter(playerAHistory, 0.001)
  const passReport = assembler.verifySignatureChain(softSignal, { tolerance: 0.001 })
  console.log(`Detected Chain: ${passReport.chain.join(" -> ")}`)
  console.log(`Protocol Result: ${passReport.matchedProtocol}`)
  console.log(`Status: ${passReport.matchedProtocol === "PlayerA" ? "✅ SUCCESS" : "❌ FAILED"}\n`)

  console.log("2: Intentional Bypass Threshold")
  const strictReport = assembler.verifySignatureChain(softSignal, { tolerance: 1e-7 })
  const player1 = assembler.verifySignatureChain(softSignal, { tolerance: 0.1 })
  console.log(`Machine View: ${strictReport.chain[1]}`)
  console.log(`Player View: ${player1.chain[1]}`)
  const isBypassed1 = strictReport.chain[1] !== player1.chain[1]
  console.log(`Protocol Result: ${strictReport.matchedProtocol}`)
  console.log(`Status: ${isBypassed1 ? "👻 CLOAKED (Bypass Successful)" : "⚠️ VISIBLE"}\n`)

  console.log("3: Visible")
  const visReport = assembler.verifySignatureChain(softSignal, { tolerance: 0.2 })
  const player2 = assembler.verifySignatureChain(softSignal, { tolerance: 0.1 })
  console.log(`Machine View: ${visReport.chain[1]}`)
  console.log(`Player View: ${player2.chain[1]}`)
  const isBypassed2 = visReport.chain[1] !== player2.chain[1]
  console.log(`Protocol Result: ${visReport.matchedProtocol}`)
  console.log(`Status: ${isBypassed2 ? "👻 CLOAKED (Bypass Successful)" : "⚠️ VISIBLE"}\n`)

  console.log("4: Informational Noise")
  const noiseHistory = [Keys.random(), Keys.random(), Keys.random()]
  const failReport = assembler.verifySignatureChain(noiseHistory, { tolerance: 0.1 })
  console.log(`Detected Chain: ${failReport.chain.join(" -> ")}`)
  console.log(`Protocol Result: ${failReport.matchedProtocol}`)
  console.log(`Status: ${failReport.matchedProtocol === "Unknown Actor" ? "🛡️ SECURE (Rejected)" : "❌ FALSE POSITIVE"}\n`)
}

runAudit()