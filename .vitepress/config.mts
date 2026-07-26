import { defineConfig } from 'vitepress'
import { collectChapters } from './chapters'

const chapters = collectChapters()

export default defineConfig({
  lang: 'zh-CN',
  title: 'Rust 学习笔记',
  description: 'Rust Learning Notes for Java/Golang Developers',
  base: '/rust-notes/',
  srcExclude: ['README.md'],
  lastUpdated: true,
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索',
            buttonAriaLabel: '搜索',
          },
          modal: {
            displayDetails: '显示详细列表',
            resetButtonTitle: '清除查询条件',
            backButtonTitle: '关闭搜索',
            noResultsText: '未找到相关结果',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },
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
