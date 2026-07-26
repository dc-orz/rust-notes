# Rust 学习笔记

面向 Java / Golang 开发者的 Rust 学习笔记：每个概念都对照 Java 与 Go 的等价物，标出关键差异，只记录容易混淆和真正重要的内容，不复述教程。

## 章节目录

<script setup>
import { withBase } from 'vitepress'
import { data as chapters } from './.vitepress/chapters.data.ts'
</script>

<ul>
  <li v-for="c of chapters" :key="c.link">
    <a :href="withBase(c.link)">{{ c.text }}</a>
  </li>
</ul>
