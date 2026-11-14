// The daily tools' screens (reply 0032 D-5, D-6, D-8, D-11) at /today/adhkar, /today/tasbih, /today/names and
// /today/words (the last only while its source is on, or in the tests).
import { Adhkar } from './adhkar/Adhkar'
import { Names } from './names/Names'
import { Tasbih } from './tasbih/Tasbih'
import { WordByWord } from './words/WordByWord'
import './tools.css'

export type Tool = 'adhkar' | 'tasbih' | 'names' | 'words'

export function ToolsView({ tool }: { tool: Tool }) {
  switch (tool) {
    case 'adhkar':
      return <Adhkar />
    case 'tasbih':
      return <Tasbih />
    case 'names':
      return <Names />
    case 'words':
      return <WordByWord />
  }
}
