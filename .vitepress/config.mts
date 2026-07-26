import { defineConfig } from 'vitepress'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// 章节文件命名约定：`<序号>_<标题>.md`，例如 `7_包、Crates与模块.md`
// 新增章节只要按这个命名放在仓库根目录，侧边栏会自动收录并按序号排序
const chapterRe = /^(\d+)_(.+)\.md$/
const srcRoot = fileURLToPath(new URL('..', import.meta.url))

const chapters = fs
  .readdirSync(srcRoot)
  .map((f) => chapterRe.exec(f))
  .filter((m): m is RegExpExecArray => m !== null)
  .sort((a, b) => Number(a[1]) - Number(b[1]))
  .map((m) => ({ text: `${m[1]}. ${m[2]}`, link: `/${m[0].replace(/\.md$/, '')}` }))

export default defineConfig({
  lang: 'zh-CN',
  title: 'Rust 学习笔记',
  description: 'Rust Learning Notes for Java/Golang Developers',
  base: '/rust-notes/',
  srcExclude: ['README.md'],
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '笔记', link: chapters[0]?.link ?? '/' },
    ],
    sidebar: [{ text: '章节', items: chapters }],
    socialLinks: [{ icon: 'github', link: 'https://github.com/dc-orz/rust-notes' }],
    outline: { label: '本页目录', level: [2, 3] },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdatedText: '最后更新',
    darkModeSwitchLabel: '外观',
    sidebarMenuLabel: '目录',
    returnToTopLabel: '回到顶部',
  },
})
