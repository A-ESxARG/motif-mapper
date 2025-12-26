import { Classifier } from '../rules/classifier.mjs'
import { Generator } from '../tools/generator.mjs'

const classifier = new Classifier()
const generator = new Generator(classifier)
let passed = 0
let failed = 0

for (const def of classifier.definitions) {
  process.stdout.write(`[ID ${def.id.toString().padStart(2)}] ${def.name.padEnd(30)} ... `) 
  try {
    const matrix = generator.generate(def.id)
    if (!Array.isArray(matrix) || matrix.length !== 4 || matrix.some(row => row.length !== 4)) {
      throw new Error("Invalid Matrix Structure")
    }
    const isClean = matrix.every(row => row.every(val => !isNaN(val) && isFinite(val)))
    if (!isClean) throw new Error("Matrix contains NaN or Infinite values")
    console.log("\x1b[32mPASS\x1b[0m")
    const concise = matrix.map(row => row.map(val => parseFloat(val.toFixed(3))))
    console.table(concise)
    passed++
  } catch (err) {
    console.log("\x1b[31mFAIL\x1b[0m")
    console.error(`    └─ Error: ${err.message}`)
    failed++
  }
}
console.log("-".repeat(50))
console.log(`\nTEST COMPLETE. Passed: ${passed} | Failed: ${failed}`)