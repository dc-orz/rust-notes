import { collectChapters, type Chapter } from './chapters'

declare const data: Chapter[]
export { data }

export default {
  watch: ['../*.md'],
  load(): Chapter[] {
    return collectChapters()
  },
}
