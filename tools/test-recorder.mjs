// Test autonome du mécanisme recorder : segments + arrêt propre via 'q' + concat + mp4.
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const dir = join(os.tmpdir(), 'qarec-test')
fs.rmSync(dir, { recursive: true, force: true })
fs.mkdirSync(dir, { recursive: true })

function captureSegment(file, seconds) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'gdigrab', '-framerate', '15', '-i', 'desktop', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', file], { stdio: ['pipe', 'ignore', 'inherit'], windowsHide: true })
    p.on('error', reject)
    p.on('close', (code) => resolve(code))
    setTimeout(() => { try { p.stdin.write('q') } catch {} ; setTimeout(() => { try { p.kill('SIGKILL') } catch {} }, 2500) }, seconds * 1000)
  })
}

const seg0 = join(dir, 'seg_000.mkv')
const seg1 = join(dir, 'seg_001.mkv')
console.log('seg0 (2s, stop via q)…'); await captureSegment(seg0, 2)
console.log('  ->', fs.existsSync(seg0) ? fs.statSync(seg0).size + ' bytes' : 'MISSING')
console.log('seg1 (resume, 2s)…'); await captureSegment(seg1, 2)
console.log('  ->', fs.existsSync(seg1) ? fs.statSync(seg1).size + ' bytes' : 'MISSING')

const list = join(dir, 'concat.txt')
fs.writeFileSync(list, [seg0, seg1].map((s) => `file '${s.replace(/\\/g, '/')}'`).join('\n'))
const mkv = join(dir, 'session.mkv')
const mp4 = join(dir, 'session.mp4')

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'], windowsHide: true })
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error('ffmpeg ' + c))))
  })
}

console.log('concat -c copy…')
await run(['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', mkv])
console.log('  session.mkv ->', fs.statSync(mkv).size, 'bytes')
console.log('convert -> mp4…')
await run(['-hide_banner', '-loglevel', 'error', '-y', '-i', mkv, '-c', 'copy', '-movflags', '+faststart', mp4])
console.log('  session.mp4 ->', fs.statSync(mp4).size, 'bytes')
console.log('OK — recorder mechanism validated')
fs.rmSync(dir, { recursive: true, force: true })
