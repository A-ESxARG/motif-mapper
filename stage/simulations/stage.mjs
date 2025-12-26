import { Verifier } from '../tools/verifier.mjs'

const CONFIG = {
  refreshRate: 250,
  baseRanges: [[0, 23], [1, 10], [1, 7], [1, 8]],
  gridSize: { x: 60, y: 25 }
}
const HLEN = CONFIG.gridSize.x + 20
const WAVE = '〰〰〰', FOUND = '✦✦✦'
const verifier = new Verifier()
const clear = () => process.stdout.write('\x1Bc')
let scanX = 0, trustHistory = []
let stats = { intersectionsA: 0, intersectionsB: 0, symmetryMatches: 0, lastMatchMotif: "None" }

function renderScope(vA, vB, result) {
  const { x: width, y: height } = CONFIG.gridSize
  const centerX = Math.floor(width / 2)
  const centerY = Math.floor(height / 2)
  let grid = Array.from({ length: height }, () => Array(width).fill(' '))
  const isHighMatch = result.trust > 0.7
  const lineAngle = isHighMatch ? (result.angle * Math.PI / 180) : (scanX * 0.15)
  const slope = Math.tan(lineAngle)
  const curveAmount = (1 - result.trust) * 7
  const angleDelta = Math.min(...[72, 90, 104, 120].map(node => Math.abs(result.angle - node)))
  const intensity = Math.max(1, 2 - (angleDelta / 5))
  const dynamicFound = FOUND.repeat(Math.round(3 * intensity)).padEnd(3, ' ')
  for (let y = 0; y < height; y++) {
    const straightX = scanX + (y - centerY) * (1 / slope)
    const warpedX = straightX + Math.sin(y * 0.5 + scanX * 0.1) * curveAmount
    const lx = Math.round(warpedX)
    if (lx >= 0 && lx < width) grid[y][lx] = isHighMatch ? dynamicFound : WAVE
  }
  for (let i = 0; i < width; i++) if (grid[centerY][i] === ' ') grid[centerY][i] = '.'
  for (let i = 0; i < height; i++) if (grid[i][centerX] === ' ') grid[i][centerX] = '.'
  grid[centerY][centerX] = '┼'
  const plot4D = (vec, label) => {
    let px = Math.round(vec[1] * centerX + centerX)
    let py = Math.round(vec[2] * centerY + centerY)
    px = (px + width) % width
    py = (py + height) % height
    const neighbors = [px - 1, px, px + 1]
    const onWave = neighbors.some(coord => coord >= 0 && grid[py][coord] === WAVE)
    const onStar = neighbors.some(coord => coord >= 0 && grid[py][coord] === dynamicFound)
    const isIntersecting = onWave || onStar
    if (isIntersecting) {
      if (label === 'A') stats.intersectionsA++
      if (label === 'B') {
        stats.intersectionsB++
        scanX = -5
      }
      if (onStar) {
        stats.symmetryMatches++
        stats.lastMatchMotif = result.motif
      }
    }
    let display = isIntersecting ? `+++ (✦◡✦) +++` : ` ${label} `
    if (onStar) display = `*** {☆▽☆} ***`
    const offset = Math.floor(display.length / 2)
    const startX = Math.max(0, px - offset)
    for (let i = 0; i < display.length; i++) { if (startX + i < width) grid[py][startX + i] = display[i] }
  }
  plot4D(vA, 'A')
  plot4D(vB, 'B')
  return grid.map(row => '      ' + row.join('')).join('\n')
}

async function startMonitor() {
  let tick = 0
  while (true) {
    clear()
    scanX = (scanX + 1.5) % CONFIG.gridSize.x
    const timeIndex = (tick % 24)
    tick++
    const pA = [timeIndex, 3 + Math.sin(scanX * 0.05), 2 + Math.cos(scanX * 0.05), 2 + Math.random() * 3]
    const pB = [timeIndex, 2 + Math.random() * 3, 2 + Math.random() * 6,  2 + Math.random() * 7]
    const result = verifier.auditSnapshot([pA, pB, [23,1,1,1], [0,10,7,8]], CONFIG.baseRanges)
    const vA = pA.map((v, i) => Verifier.normalize(v, CONFIG.baseRanges[i][0], CONFIG.baseRanges[i][1]))
    const vB = pB.map((v, i) => Verifier.normalize(v, CONFIG.baseRanges[i][0], CONFIG.baseRanges[i][1]))
    const glyphs = [' ', ' ', '▂', '▃', '▄', '▅', '▆', '▇', '█']
    const tIdx = Math.floor(result.trust * (glyphs.length - 1))
    trustHistory.push(glyphs[tIdx])
    if (trustHistory.length > CONFIG.gridSize.x * 0.8) trustHistory.shift()
    console.log("=".repeat(HLEN))
    console.log("\n\n\t\t\t    STAGE AS MANIFOLD\n\n")
    console.log(renderScope(vA, vB, result))
    console.log("\n".repeat(2))
    console.log("~".repeat(HLEN))
    console.log(` TRUST: ${(result.trust * 100).toFixed(0)}% | ANGLE: ${result.angle.toFixed(1)}° | ${result.motif}`)
    console.log("-".repeat(HLEN))
    console.log(` TRUST HISTORY: ${trustHistory.join('')}`)
    console.log("-".repeat(HLEN))
    console.log(` OBSERVED`)
    console.log(` Instigator A: ${stats.intersectionsA.toString()}\tSymmetries matched: ${stats.symmetryMatches}`)
    console.log(` Receiver B: ${stats.intersectionsB.toString()}\t\tLast matched motif: ${stats.lastMatchMotif}`)
    console.log("-".repeat(HLEN))
    const fmt = (v) => v.toFixed(2).padStart(6)
    console.log(` Vector A: [${pA.map(fmt).join(', ')} ]`)
    console.log(` Vector B: [${pB.map(fmt).join(', ')} ]`)
    console.log("=".repeat(HLEN))
    await new Promise(r => setTimeout(r, CONFIG.refreshRate))
  }
}

startMonitor()