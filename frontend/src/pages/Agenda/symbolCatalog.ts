import { SYMBOL_ADDITIONS } from './symbolAdditions.ts'

export const SYMBOL_CATEGORIES = [
  { id: 'hearts', label: 'Corações' },
  { id: 'bows', label: 'Laços' },
  { id: 'stars', label: 'Estrelas' },
  { id: 'celestial', label: 'Lua e céu' },
  { id: 'nature', label: 'Flores e natureza' },
  { id: 'aesthetic', label: 'Símbolos aesthetic' },
  { id: 'coquette', label: 'Coquette' },
  { id: 'kaomojis', label: 'Kaomojis fofinhos' },
  { id: 'funny-kaomojis', label: 'Kaomojis divertidos' },
  { id: 'separators', label: 'Separadores decorativos' },
  { id: 'study', label: 'Símbolos para estudos' },
  { id: 'lists', label: 'Símbolos para listas' },
  { id: 'witchy', label: 'Witchy e místicos' },
  { id: 'emojis', label: 'Emojis' },
  { id: 'favorites', label: 'Favoritos' },
] as const

export type SymbolCategory = Exclude<
  (typeof SYMBOL_CATEGORIES)[number]['id'],
  'favorites'
>
export type SymbolCategoryFilter = SymbolCategory | 'favorites' | 'all'

export type SymbolDefinition = {
  id: string
  value: string
  name: string
  category: SymbolCategory
  keywords: readonly string[]
}

export const SYMBOL_FONT_FAMILY =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", "Noto Sans Symbols 2", "Segoe UI Historic", "Noto Sans Egyptian Hieroglyphs", "Nirmala UI", "Yu Gothic", sans-serif'

type SymbolRow = readonly [
  id: string,
  value: string,
  name: string,
  keywords: readonly string[],
]

function entries(category: SymbolCategory, rows: readonly SymbolRow[]): SymbolDefinition[] {
  return rows.map(([id, value, name, keywords]) => ({
    id,
    value,
    name,
    category,
    keywords,
  }))
}

const ORIGINAL_SYMBOLS: readonly SymbolDefinition[] = [
  ...entries('aesthetic', [
    ['coquette-orbit', '⋆˚꩜｡', 'Órbita coquette', ['aesthetic', 'coquette', 'orbit', 'estrela']],
    ['ribbon-star', '𐙚⋆.˚', 'Laço estrelado', ['aesthetic', 'coquette', 'ribbon', 'laço']],
    ['spaced-heart', 'ᢉ𐭩   ♡', 'Coração espaçado', ['aesthetic', 'heart', 'coração', 'espaço']],
    ['soft-heart-sparkle', '₊˚⊹♡', 'Coração brilhante', ['aesthetic', 'heart', 'sparkle', 'fofo']],
    ['framed-heart', '𓆩♡𓆪', 'Coração em moldura', ['aesthetic', 'heart', 'frame', 'asa']],
    ['sparkling-star', '⋆｡°✩', 'Estrela cintilante', ['aesthetic', 'star', 'sparkle', 'brilho']],
    ['soft-sparkle', '✧˖°.', 'Brilho suave', ['aesthetic', 'sparkle', 'soft', 'luz']],
    ['star-cluster', '⊹₊⟡⋆', 'Constelação delicada', ['aesthetic', 'star', 'sparkle', 'constelação']],
    ['angel-heart', '˚₊‧꒰ა ♡ ໒꒱ ‧₊˚', 'Coração angelical', ['aesthetic', 'angel', 'heart', 'anjo']],
    ['heart-frame', '˖⁺‧₊˚ ♡ ˚₊‧⁺˖', 'Moldura de coração', ['aesthetic', 'heart', 'frame', 'moldura']],
    ['floating-star', '๋࣭ ⭑', 'Estrela flutuante', ['aesthetic', 'star', 'floating', 'estrela']],
    ['little-flight', 'ᯓᡣ𐭩', 'Voo delicado', ['aesthetic', 'coquette', 'flight', 'voo']],
    ['journal-note', 'ᝰ.ᐟ', 'Nota de diário', ['aesthetic', 'journal', 'note', 'diário']],
    ['tiny-orbit', '⟡ ݁₊ .', 'Órbita pequena', ['aesthetic', 'star', 'orbit', 'brilho']],
    ['dreamy-trail', '·˚ ༘ ⋆', 'Rastro de sonho', ['aesthetic', 'dream', 'trail', 'sonho']],
    ['ribbon-trail', '౨ৎ ⋆˚｡⋆', 'Rastro de laço', ['aesthetic', 'ribbon', 'coquette', 'laço']],
    ['night-orbit', '⋆.˚ᡣ𐭩.𖥔˚', 'Órbita noturna', ['aesthetic', 'night', 'star', 'noite']],
    ['flower-glimmer', '°❀⋆.ೃ࿔*', 'Flor cintilante', ['aesthetic', 'flower', 'sparkle', 'flor']],
    ['bow-stars', '⋆˚｡⋆୨୧˚', 'Laço entre estrelas', ['aesthetic', 'bow', 'star', 'laço']],
    ['soft-journal-mark', '༊·˚', 'Marca de diário', ['aesthetic', 'journal', 'soft', 'diário']],
    ['tiny-shine', '*.✧', 'Brilho pequeno', ['aesthetic', 'sparkle', 'shine', 'brilho']],
    ['coquette-bow', '୨୧', 'Laço coquette', ['coquette', 'bow', 'ribbon', 'laço']],
    ['angel-wing', '໒꒱', 'Asa de anjo', ['angel', 'wing', 'soft', 'anjo']],
    ['floating-bow', '꒰ა', 'Laço delicado', ['bow', 'coquette', 'ribbon', 'laço']],
    ['lace-flower', '𓍯', 'Flor de renda', ['lace', 'flower', 'vintage', 'flor']],
    ['soft-dash', '𓂃', 'Traço suave', ['soft', 'line', 'journal', 'traço']],
    ['fine-dash', '𓈒', 'Traço fino', ['soft', 'line', 'minimal', 'traço']],
    ['tiny-dot', '𓏸', 'Ponto delicado', ['dot', 'minimal', 'journal', 'ponto']],
    ['little-mark', '𓂂', 'Marca delicada', ['mark', 'soft', 'journal', 'marca']],
    ['coquette-flower', '𓆸', 'Flor coquette', ['flower', 'coquette', 'nature', 'flor']],
    ['vintage-flower-mark', '𓇬', 'Marca floral vintage', ['flower', 'vintage', 'nature', 'flor']],
    ['soft-flower', '𖡼', 'Flor suave', ['flower', 'soft', 'nature', 'flor']],
    ['pressed-flower', '𖤣', 'Flor prensada', ['flower', 'pressed', 'vintage', 'flor']],
    ['tiny-leaf-mark', '𖥧', 'Marca de folhinha', ['leaf', 'nature', 'journal', 'folha']],
    ['little-spark', '𖦹', 'Brilho delicado', ['sparkle', 'soft', 'aesthetic', 'brilho']],
    ['decorative-bracket-left', '𓊆', 'Moldura decorativa esquerda', ['frame', 'bracket', 'separator', 'moldura']],
    ['decorative-bracket-right', '𓊇', 'Moldura decorativa direita', ['frame', 'bracket', 'separator', 'moldura']],
  ]),
  ...entries('hearts', [
    ['heart-exclamation', '❥', 'Coração delicado', ['heart', 'love', 'coração', 'amor']],
    ['ornamental-heart', 'ღ', 'Coração ornamental', ['heart', 'ornamental', 'vintage', 'coração']],
    ['love-heart', 'ᥫ᭡', 'Coração de amor', ['heart', 'love', 'coração', 'amor']],
    ['coquette-heart', 'ꨄ', 'Coração coquette', ['heart', 'coquette', 'coração', 'fofo']],
    ['soft-heart', 'ᰔ', 'Coração suave', ['heart', 'soft', 'coração', 'fofo']],
    ['heart-with-mark', 'ᰔᩚ', 'Coração com detalhe', ['heart', 'soft', 'coração', 'detalhe']],
    ['little-heart', '𖹭', 'Coração pequeno', ['heart', 'tiny', 'coração', 'pequeno']],
    ['heart-love', '❣', 'Coração de carinho', ['heart', 'love', 'coração', 'carinho']],
    ['outlined-heart', '♡', 'Coração contornado', ['heart', 'outline', 'coração', 'contorno']],
    ['solid-heart', '♥', 'Coração preenchido', ['heart', 'solid', 'coração', 'cheio']],
    ['heart-with-ribbon', '♡୨୧', 'Coração com laço', ['heart', 'bow', 'ribbon', 'laço']],
    ['bow-heart-bow', '୨୧♡୨୧', 'Coração entre laços', ['heart', 'bow', 'coquette', 'laço']],
    ['heart-sparkle-pair', '♡₊˚', 'Coração com brilho', ['heart', 'sparkle', 'fofo', 'brilho']],
    ['pink-heart-emoji', '🩷', 'Coração rosa', ['heart', 'pink', 'emoji', 'rosa']],
    ['white-heart-emoji', '🤍', 'Coração branco', ['heart', 'white', 'emoji', 'branco']],
    ['sparkling-heart-emoji', '💖', 'Coração brilhante emoji', ['heart', 'sparkle', 'emoji', 'brilho']],
    ['two-hearts-emoji', '💕', 'Dois corações', ['heart', 'love', 'emoji', 'amor']],
    ['growing-heart-emoji', '💗', 'Coração crescendo', ['heart', 'growing', 'emoji', 'amor']],
    ['heart-hands-emoji', '🫶', 'Mãos de coração', ['heart', 'hands', 'emoji', 'mãos']],
    ['love-letter-emoji', '💌', 'Carta de amor', ['heart', 'letter', 'emoji', 'carta']],
  ]),
  ...entries('celestial', [
    ['moonlight-trail', '☾⋆⁺₊', 'Rastro de luar', ['moon', 'star', 'celestial', 'lua']],
    ['star-outline', '☆', 'Estrela contornada', ['star', 'outline', 'celestial', 'estrela']],
    ['star-solid', '★', 'Estrela preenchida', ['star', 'solid', 'celestial', 'estrela']],
    ['sparkle-star', '✩', 'Estrela brilhante', ['star', 'sparkle', 'celestial', 'brilho']],
    ['star-medallion', '✪', 'Estrela medalhão', ['star', 'medallion', 'celestial', 'estrela']],
    ['star-four', '✫', 'Estrela decorativa', ['star', 'decorative', 'celestial', 'estrela']],
    ['star-six', '✬', 'Estrela de seis pontas', ['star', 'six', 'celestial', 'estrela']],
    ['star-seven', '✭', 'Estrela de sete pontas', ['star', 'seven', 'celestial', 'estrela']],
    ['star-eight', '✮', 'Estrela de oito pontas', ['star', 'eight', 'celestial', 'estrela']],
    ['star-shadow', '✯', 'Estrela com sombra', ['star', 'shadow', 'celestial', 'estrela']],
    ['starburst', '✰', 'Explosão de estrela', ['star', 'burst', 'celestial', 'brilho']],
    ['crescent-moon', '☽', 'Lua crescente', ['moon', 'crescent', 'celestial', 'lua']],
    ['sun-symbol', '☼', 'Sol decorativo', ['sun', 'celestial', 'symbol', 'sol']],
    ['sun-symbol-alt', '☀', 'Sol', ['sun', 'celestial', 'weather', 'sol']],
    ['cloud-symbol', '☁', 'Nuvem', ['cloud', 'celestial', 'weather', 'nuvem']],
    ['sparkles-emoji', '✨', 'Brilhos emoji', ['sparkle', 'emoji', 'celestial', 'brilho']],
    ['crescent-moon-emoji', '🌙', 'Lua crescente emoji', ['moon', 'emoji', 'night', 'lua']],
    ['shooting-star-emoji', '🌠', 'Estrela cadente', ['star', 'shooting', 'emoji', 'cadente']],
    ['new-moon-emoji', '🌑', 'Lua nova', ['moon', 'new moon', 'emoji', 'lua nova']],
    ['milky-way-emoji', '🌌', 'Via láctea', ['galaxy', 'milky way', 'emoji', 'galáxia']],
    ['planet-emoji', '🪐', 'Planeta com anéis', ['planet', 'saturn', 'emoji', 'planeta']],
  ]),
  ...entries('nature', [
    ['flower-eight-petal', '❀', 'Flor de oito pétalas', ['flower', 'nature', 'vintage', 'flor']],
    ['flower-white', '❁', 'Flor branca', ['flower', 'nature', 'white', 'flor']],
    ['flower-heavy', '❃', 'Flor decorativa', ['flower', 'nature', 'decorative', 'flor']],
    ['flower-rosette', '❋', 'Flor roseta', ['flower', 'rosette', 'nature', 'flor']],
    ['flower-black', '✿', 'Flor preenchida', ['flower', 'nature', 'black', 'flor']],
    ['flower-dingbat', '❊', 'Flor delicada', ['flower', 'nature', 'dingbat', 'flor']],
    ['flower-outline', '⚘', 'Flor contornada', ['flower', 'outline', 'nature', 'flor']],
    ['leaf-outline', '♧', 'Folha contornada', ['leaf', 'nature', 'outline', 'folha']],
    ['leaf-club', '♣', 'Trevo', ['clover', 'leaf', 'nature', 'trevo']],
    ['tulip-emoji', '🌷', 'Tulipa', ['flower', 'tulip', 'emoji', 'tulipa']],
    ['cherry-blossom-emoji', '🌸', 'Flor de cerejeira', ['flower', 'cherry blossom', 'emoji', 'cerejeira']],
    ['blossom-emoji', '🌼', 'Flor amarela', ['flower', 'blossom', 'emoji', 'flor']],
    ['sunflower-emoji', '🌻', 'Girassol', ['flower', 'sunflower', 'emoji', 'girassol']],
    ['lotus-emoji', '🪷', 'Lótus', ['flower', 'lotus', 'emoji', 'lótus']],
    ['seedling-emoji', '🌱', 'Muda', ['plant', 'seedling', 'emoji', 'muda']],
    ['four-leaf-clover-emoji', '🍀', 'Trevo de quatro folhas', ['clover', 'luck', 'emoji', 'sorte']],
    ['shamrock-emoji', '☘️', 'Trevo de três folhas', ['clover', 'shamrock', 'emoji', 'trevo']],
    ['herb-emoji', '🌿', 'Ervas', ['leaf', 'herb', 'emoji', 'ervas']],
    ['leaves-emoji', '🍃', 'Folhas ao vento', ['leaf', 'wind', 'emoji', 'folhas']],
    ['fallen-leaf-emoji', '🍂', 'Folha caída', ['leaf', 'autumn', 'emoji', 'outono']],
    ['maple-leaf-emoji', '🍁', 'Folha de bordo', ['leaf', 'maple', 'emoji', 'folha']],
    ['sheaf-emoji', '🌾', 'Trigo', ['wheat', 'nature', 'emoji', 'trigo']],
    ['potted-plant-emoji', '🪴', 'Planta em vaso', ['plant', 'potted', 'emoji', 'vaso']],
    ['cherry-emoji', '🍒', 'Cerejas', ['cherry', 'fruit', 'emoji', 'cereja']],
    ['strawberry-emoji', '🍓', 'Morango', ['strawberry', 'fruit', 'emoji', 'morango']],
    ['mushroom-emoji', '🍄', 'Cogumelo', ['mushroom', 'nature', 'emoji', 'cogumelo']],
  ]),
  ...entries('kaomojis', [
    ['happy-face', '(｡•ᴗ•｡)', 'Carinha feliz', ['happy', 'cute', 'face', 'feliz']],
    ['shy-face', '(⁄ ⁄•⁄ω⁄•⁄ ⁄)', 'Carinha tímida', ['shy', 'cute', 'face', 'tímida']],
    ['heart-eyes-face', '(｡♥‿♥｡)', 'Carinha apaixonada', ['love', 'heart', 'face', 'apaixonada']],
    ['hugging-face', '(づ｡◕‿‿◕｡)づ', 'Abraço', ['hug', 'cute', 'face', 'abraço']],
    ['sparkle-face', '(｡•̀ᴗ-)✧', 'Carinha brilhante', ['wink', 'sparkle', 'face', 'piscadela']],
    ['happy-dance', 'ヽ(>∀<☆)ノ', 'Dancinha feliz', ['happy', 'dance', 'cute', 'dança']],
    ['cheering-face', '٩(ˊᗜˋ*)و', 'Carinha comemorando', ['cheer', 'happy', 'cute', 'comemorar']],
    ['peace-face', '(๑˃ᴗ˂)ﻭ', 'Carinha animada', ['happy', 'peace', 'cute', 'animada']],
    ['sleepy-face', '(ᴗ˳ᴗ)', 'Carinha sonolenta', ['sleepy', 'sleep', 'face', 'sono']],
    ['crying-face', '(╥﹏╥)', 'Carinha chorando', ['cry', 'sad', 'face', 'triste']],
    ['cat-face', '(=^･ω･^=)', 'Gatinho', ['cat', 'cute', 'animal', 'gato']],
    ['cat-paw-face', '(=ＴェＴ=)', 'Gatinho tímido', ['cat', 'cute', 'animal', 'gato']],
    ['bear-face', 'ʕ•ᴥ•ʔ', 'Ursinho', ['bear', 'cute', 'animal', 'urso']],
    ['bunny-face', '(｡･ω･｡)', 'Coelhinho', ['bunny', 'cute', 'animal', 'coelho']],
    ['little-wave', 'ヾ(＾-＾)ノ', 'Tchauzinho', ['wave', 'hello', 'cute', 'tchau']],
    ['tiny-bow', '(୨୧ᵕ̤ᴗᵕ̤)', 'Carinha com laço', ['bow', 'coquette', 'cute', 'laço']],
    ['love-you-face', '( ˘ ³˘)♥', 'Beijinho', ['kiss', 'love', 'cute', 'beijo']],
    ['music-face', '♪(๑ᴖ◡ᴖ๑)♪', 'Carinha musical', ['music', 'happy', 'cute', 'música']],
    ['sparkle-hands', '☆*:.｡.o(≧▽≦)o.｡.:*☆', 'Alegria brilhante', ['happy', 'sparkle', 'celebration', 'alegria']],
    ['shrug-face', '╮(￣▽￣)╭', 'Carinha dando de ombros', ['shrug', 'face', 'expression', 'ombros']],
  ]),
  ...entries('emojis', [
    ['sparkling-heart', '💞', 'Corações girando', ['heart', 'love', 'emoji', 'corações']],
    ['beating-heart', '💓', 'Coração pulsante', ['heart', 'love', 'emoji', 'pulsante']],
    ['heart-with-arrow', '💘', 'Coração flechado', ['heart', 'love', 'emoji', 'flecha']],
    ['heart-with-ribbon-emoji', '💝', 'Coração com fita', ['heart', 'ribbon', 'emoji', 'presente']],
    ['smiling-face-hearts', '🥰', 'Carinha apaixonada', ['love', 'face', 'emoji', 'carinho']],
    ['sparkling-eyes-face', '🤩', 'Carinha encantada', ['star', 'face', 'emoji', 'encantada']],
    ['smiling-face', '😊', 'Carinha sorridente', ['smile', 'face', 'emoji', 'sorriso']],
    ['melting-face', '🥹', 'Carinha emocionada', ['face', 'emotion', 'emoji', 'fofo']],
    ['rabbit-face', '🐰', 'Coelhinho emoji', ['rabbit', 'bunny', 'emoji', 'coelho']],
    ['bear-face-emoji', '🧸', 'Ursinho de pelúcia', ['bear', 'teddy', 'emoji', 'ursinho']],
    ['butterfly-emoji', '🦋', 'Borboleta emoji', ['butterfly', 'nature', 'emoji', 'borboleta']],
    ['bee-emoji', '🐝', 'Abelhinha', ['bee', 'nature', 'emoji', 'abelha']],
    ['dove-emoji', '🕊️', 'Pombinha', ['dove', 'peace', 'emoji', 'paz']],
    ['ribbon-emoji', '🎀', 'Laço emoji', ['bow', 'ribbon', 'emoji', 'laço']],
    ['sparkling-heart-gift', '💟', 'Decoração de coração', ['heart', 'gift', 'emoji', 'presente']],
    ['tea-cup-emoji', '🍵', 'Chá', ['tea', 'drink', 'emoji', 'chá']],
    ['coffee-emoji', '☕', 'Café emoji', ['coffee', 'drink', 'emoji', 'café']],
    ['cake-emoji', '🍰', 'Bolo', ['cake', 'dessert', 'emoji', 'bolo']],
    ['cookie-emoji', '🍪', 'Biscoito', ['cookie', 'dessert', 'emoji', 'biscoito']],
    ['envelope-emoji', '📨', 'Envelope decorado', ['letter', 'love', 'emoji', 'carta']],
    ['camera-emoji', '📷', 'Câmera', ['camera', 'memory', 'emoji', 'foto']],
    ['books-emoji', '📚', 'Livros', ['books', 'study', 'emoji', 'livros']],
    ['memo-emoji', '📝', 'Anotação', ['memo', 'journal', 'emoji', 'anotação']],
  ]),
  ...entries('separators', [
    ['dotted-line', '· · ·', 'Linha pontilhada', ['separator', 'dots', 'line', 'pontilhado']],
    ['sparkle-line', '✧･ﾟ: *✧･ﾟ:*', 'Linha de brilhos', ['separator', 'sparkle', 'line', 'brilho']],
    ['star-line', '⋆｡ﾟ☁︎｡⋆｡ ﾟ☾ ﾟ｡⋆', 'Linha celestial', ['separator', 'star', 'moon', 'celestial']],
    ['heart-line', '♡ ── ♡ ── ♡', 'Linha de corações', ['separator', 'heart', 'line', 'coração']],
    ['floral-line', '❀ ── ❀ ── ❀', 'Linha floral', ['separator', 'flower', 'line', 'flor']],
    ['simple-wave', '〜〜〜〜〜', 'Linha ondulada', ['separator', 'wave', 'line', 'onda']],
    ['soft-dots-line', '｡･:*˚:✧｡', 'Linha de pontos suaves', ['separator', 'dots', 'sparkle', 'pontos']],
    ['ornamental-dashes', '─・─・─・─', 'Linha ornamental', ['separator', 'ornamental', 'line', 'traço']],
    ['double-line', '═ ♡ ═ ♡ ═', 'Linha dupla de corações', ['separator', 'double', 'heart', 'linha']],
    ['flower-divider', '୨୧ ┈┈┈ ❀ ┈┈┈ ୨୧', 'Separador de flores e laços', ['separator', 'flower', 'bow', 'laço']],
    ['tiny-star-divider', '⋆ ˚｡⋆୨୧˚⋆ ˚｡⋆', 'Separador de estrelas', ['separator', 'star', 'bow', 'estrela']],
    ['dashed-divider', '﹏﹏﹏﹏﹏', 'Linha tracejada suave', ['separator', 'dashed', 'line', 'linha']],
    ['vintage-divider', '༺♡༻', 'Separador vintage', ['separator', 'vintage', 'heart', 'coração']],
    ['sparkle-divider', '⟡ ───── ⟡', 'Separador de brilho', ['separator', 'sparkle', 'line', 'brilho']],
    ['wavy-divider', '≋≋≋≋≋', 'Separador ondulado', ['separator', 'wave', 'line', 'onda']],
    ['four-dot-divider', '⁺₊⋆ ☾ ⋆⁺₊', 'Separador de lua', ['separator', 'moon', 'star', 'lua']],
    ['leaf-divider', '❧ ── ❧ ── ❧', 'Separador de folhas', ['separator', 'leaf', 'nature', 'folha']],
    ['minimal-divider', '﹒﹒﹒﹒﹒', 'Separador minimalista', ['separator', 'minimal', 'dots', 'pontos']],
    ['book-divider', '⌜ ─────── ⌟', 'Separador de página', ['separator', 'book', 'journal', 'página']],
    ['bow-divider', '୨୧ ───── ୨୧', 'Separador de laços', ['separator', 'bow', 'coquette', 'laço']],
  ]),
]

// Reorganize metadata only: stable IDs and all original value strings remain intact.
function organizeOriginal(symbol: SymbolDefinition): SymbolDefinition {
  let category = symbol.category
  if (category === 'celestial' && symbol.keywords.includes('star')) category = 'stars'
  if (['coquette-bow', 'floating-bow', 'ribbon-star', 'ribbon-trail', 'bow-stars', 'ribbon-emoji', 'heart-with-ribbon', 'bow-heart-bow'].includes(symbol.id)) category = 'bows'
  if (['angel-heart', 'heart-frame', 'angel-wing', 'coquette-flower', 'lace-flower', 'night-orbit'].includes(symbol.id)) category = 'coquette'
  if (['happy-dance', 'music-face', 'shrug-face', 'sparkle-hands'].includes(symbol.id)) category = 'funny-kaomojis'
  return { ...symbol, category }
}

export const SYMBOL_CATALOG: readonly SymbolDefinition[] = [
  ...ORIGINAL_SYMBOLS.map(organizeOriginal),
  ...SYMBOL_ADDITIONS,
]

export type SymbolCardLayout = 'short' | 'wide' | 'full' | 'kaomoji' | 'separator'
const symbolSegmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('pt', { granularity: 'grapheme' }) : null
export function getSymbolCardLayout(symbol: SymbolDefinition): SymbolCardLayout {
  if (symbol.category === 'separators') return 'separator'
  if (symbol.category === 'kaomojis' || symbol.category === 'funny-kaomojis') return 'kaomoji'
  // Count complete graphemes for layout; the value itself is never sliced.
  const count = symbolSegmenter
    ? [...symbolSegmenter.segment(symbol.value)].length
    : Array.from(symbol.value).length
  return count > 12 ? 'full' : count > 5 ? 'wide' : 'short'
}

export function normalizeSymbolSearchTerm(term: string): string {
  return term
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
}

export function filterSymbolsByCategory(
  symbols: readonly SymbolDefinition[],
  category: SymbolCategoryFilter,
  favoriteIds: readonly string[] = [],
): SymbolDefinition[] {
  if (category === 'all') return [...symbols]
  if (category === 'favorites') {
    const favorites = new Set(favoriteIds)
    return symbols.filter(symbol => favorites.has(symbol.id))
  }
  return symbols.filter(symbol => symbol.category === category)
}

export function searchSymbols(
  query: string,
  symbols: readonly SymbolDefinition[] = SYMBOL_CATALOG,
): SymbolDefinition[] {
  const normalizedQuery = normalizeSymbolSearchTerm(query)
  if (!normalizedQuery) return [...symbols]
  const rawQuery = query.trim()

  return symbols.filter(symbol => {
    const searchableMetadata = normalizeSymbolSearchTerm([
      symbol.name,
      symbol.category,
      SYMBOL_CATEGORIES.find(item => item.id === symbol.category)?.label ?? '',
      ...symbol.keywords,
    ].join(' '))
    return normalizedQuery.split(/\s+/).every(term => searchableMetadata.includes(term)) || symbol.value.includes(rawQuery)
  })
}
