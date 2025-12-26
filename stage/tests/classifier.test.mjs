import { Classifier } from '../rules/classifier.mjs'

const LOOSE = 0.01

function generateRandomVectors() {
  return [
    [ (Math.random() - 0.5) * 2 + 1, (Math.random() - 0.5) * 2 + 1, (Math.random() - 0.5) * 2 + 1, (Math.random() - 0.5) * 2 + 1 ],
    [ (Math.random() - 0.5) * 2 + 1, (Math.random() - 0.5) * 2 + 1, (Math.random() - 0.5) * 2 + 1, (Math.random() - 0.5) * 2 + 1 ],
    [ (Math.random() - 0.5) * 2 + 1, (Math.random() - 0.5) * 2 + 1, (Math.random() - 0.5) * 2 + 1, (Math.random() - 0.5) * 2 + 1 ],
    [ (Math.random() - 0.5) * 2 + 1, (Math.random() - 0.5) * 2 + 1, (Math.random() - 0.5) * 2 + 1, (Math.random() - 0.5) * 2 + 1 ]
  ]
}

function generateStructuredVectors(level = 0) {
  switch (level) {
    case 0:
      return [[2, 0, 0, 0], [0, 1.5, 0, 0], [0, 0, 2.2, 0], [0, 0, 0, 1.8]]
    case 1:
      return [[2, 0, 0, 0], [0, 2, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
    case 2:
      return [[1, 0, 0, 0], [-0.5, 0.866, 0, 0], [0, 0, 2, 0], [0, 0, 0, 1]]
    default:
      return generateRandomVectors()
  }
}

function generateTargetedVectors(targetFamily) {
  const family = targetFamily.toLowerCase()
  switch(family) {
    case 'hypercubic':
      return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
    case 'decagonal':
      return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [-0.5, -0.5, -0.5, 0.5]]
    case 'cubic orthogonal':
      return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 2]]
    case 'orthogonal':
      return [[2, 0, 0, 0], [0, 1.5, 0, 0], [0, 0, 2.2, 0], [0, 0, 0, 1.1]]
    case 'monoclinic':
      return [[1, 0, 0, 0], [0, 1, 0, 0], [0.5, 0.866, 0, 0], [0, 0, 0, 3]]
    case 'triclinic':
      return [[1, 0.2, 0.3, 0], [0.1, 1, 0.2, 0], [0.3, 0.1, 1, 0], [0, 0, 0, 1]]
    default:
      return generateRandomVectors()
  }
}

function displayDistribution(counts, total) {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  console.log("Rank | Motif Type                   | Count  | Percentage")
  console.log("-".repeat(60))
  sorted.forEach(([name, count], index) => {
    const percentage = ((count / total) * 100).toFixed(1)
    console.log(`${(index + 1).toString().padStart(4)} | ${name.padEnd(30)} | ${count.toString().padStart(6)} | ${percentage.padStart(6)}%`)
  })
}

function mergeResults(results) {
  const merged = {}
  let total = 0
  for (const phase in results) {
    if (phase === 'phase3') {
      for (const [motif, count] of Object.entries(results.phase3.loose.counts)) {
        merged[motif] = (merged[motif] || 0) + count
        total += count
      }
    } else {
      for (const [motif, count] of Object.entries(results[phase].counts)) {
        merged[motif] = (merged[motif] || 0) + count
        total += count
      }
    }
  }
  return { counts: merged, total }
}

function runProgressiveTests() {
  console.log("Testing from random to highly structured vectors\n") 
  const classifier = new Classifier() 
  const results = {
    phase1: { counts: {}, total: 0 },
    phase2: { counts: {}, total: 0 },
    phase3: { strict: { counts: {}, total: 0 }, loose: { counts: {}, total: 0 } }
  }
  const targetNames = classifier.categories.map(l => l.name)

  console.log("=".repeat(60))
  console.log("1: RANDOM VECTORS (50 tests)")
  console.log("=".repeat(60))
  for (let i = 0; i < 50; i++) {
    const vectors = generateRandomVectors()
    const result = classifier.analyzeVectors(...vectors)
    results.phase1.counts[result.category] = (results.phase1.counts[result.category] || 0) + 1
    results.phase1.total++
    if (i % 10 === 0) process.stdout.write(`Completed ${i} tests...\r`)
  }
  console.log("\nPhase 1 Results:")
  displayDistribution(results.phase1.counts, results.phase1.total)

  console.log("\n" + "=".repeat(60))
  console.log("2: STRUCTURED VECTORS (100 tests)")
  console.log("=".repeat(60))
  for (let i = 0; i < 100; i++) {
    const vectors = generateStructuredVectors(Math.floor(Math.random() * 3))
    const result = classifier.analyzeVectors(...vectors)
    results.phase2.counts[result.category] = (results.phase2.counts[result.category] || 0) + 1
    results.phase2.total++
  }
  console.log("Phase 2 Results:")
  displayDistribution(results.phase2.counts, results.phase2.total)

  console.log("\n" + "=".repeat(60))
  console.log("3: TARGETED VECTORS (100 tests)")
  console.log("=".repeat(60))
  for (let i = 0; i < 100; i++) {
    const target = targetNames[Math.floor(Math.random() * targetNames.length)]
    const vectors = generateTargetedVectors(target)
    const jittered = vectors.map(v => v.map(c => c + (Math.random() - 0.5) * 0.001))
    const resStrict = classifier.analyzeVectors(jittered[0], jittered[1], jittered[2], jittered[3], 1e-7, 0.1)
    results.phase3.strict.counts[resStrict.category] = (results.phase3.strict.counts[resStrict.category] || 0) + 1
    results.phase3.strict.total++
    const resLoose = classifier.analyzeVectors(jittered[0], jittered[1], jittered[2], jittered[3], LOOSE, 5.0)
    results.phase3.loose.counts[resLoose.category] = (results.phase3.loose.counts[resLoose.category] || 0) + 1
    results.phase3.loose.total++
  }

  console.log("STRICT ANALYSIS (1e-7 Tolerance):")
  displayDistribution(results.phase3.strict.counts, results.phase3.strict.total)
  console.log("\nLOOSE ANALYSIS (0.1 Tolerance):")
  displayDistribution(results.phase3.loose.counts, results.phase3.loose.total)
  console.log("\n" + "=".repeat(60))
  console.log("OVERALL SUMMARY")
  console.log("=".repeat(60))
  const allResults = mergeResults(results)
  console.log(`Total tests: ${allResults.total}`)
  console.log(`Unique motifs found: ${Object.keys(allResults.counts).length}`)
  const missing = targetNames.filter(name => !allResults.counts[name])
  console.log("\nMotif types NOT observed (Hidden):")
  missing.forEach(name => console.log(`  ${name}`))
  return results
}

runProgressiveTests()