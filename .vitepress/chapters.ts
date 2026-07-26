import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// 章节文件命名约定：`<序号>_<标题>.md`，例如 `7_包、Crates与模块.md`
// 新增章节只要按这个命名放在仓库根目录，侧边栏和首页目录会自动收录并按序号排序
const chapterRe = /^(\d+)_(.+)\.md$/
const srcRoot = fileURLToPath(new URL('..', import.meta.url))

export interface Chapter {
  text: string
  link: string
}

export function collectChapters(): Chapter[] {
  return fs
    .readdirSync(srcRoot)
    .map((f) => chapterRe.exec(f))
    .filter((m): m is RegExpExecArray => m !== null)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map((m) => ({ text: `${m[1]}. ${m[2]}`, link: `/${m[0].replace(/\.md$/, '')}` }))
}
