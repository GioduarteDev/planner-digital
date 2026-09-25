type RoomSceneProps = {
  imageUrl: string | null
}

/** Decorative window vignette, drawn as vectors so it stays crisp at every size. */
export default function RoomScene({ imageUrl }: RoomSceneProps) {
  if (imageUrl) {
    return <div className="room-scene-image">
      <img src={imageUrl} alt="Imagem escolhida para seu cantinho" />
    </div>
  }

  return <svg viewBox="0 0 240 220" fill="none" aria-hidden="true">
    <rect width="240" height="220" fill="#e9e5f4" />
    <path d="M40 164V40Q120-10 200 40V164Z" fill="#c5d9ef" stroke="#a7a5c2" strokeWidth="5" />
    <circle cx="160" cy="58" r="21" fill="#fff1ce" />
    <path d="M43 123Q70 94 108 126T198 113V163H43Z" fill="#b1c7ba" />
    <path d="M43 148Q99 109 153 146T198 135V164H43Z" fill="#96b1a6" />
    <path d="M120 17V164M41 88H199" stroke="#fff7ed" strokeWidth="5" />
    <path d="M30 20Q63 26 53 111L30 145ZM211 20Q177 26 190 111L213 145Z" fill="#e4bbd0" />
    <path d="M36 27L42 107M205 27L201 107" stroke="#cf9eb9" strokeWidth="2" />
    <rect x="24" y="164" width="192" height="9" rx="3" fill="#fff7ed" />
    <path d="M0 194H240V220H0Z" fill="#cbb6c3" />
    <path d="M38 175H69L65 199H42Z" fill="#f1d3bb" />
    <path d="M54 177V132M54 161Q26 163 31 143Q52 144 54 161ZM55 150Q79 146 76 128Q54 132 55 150Z" fill="#9aaa91" stroke="#87997e" strokeWidth="2" />
    <rect x="91" y="183" width="53" height="10" rx="2" fill="#a7b8d9" />
    <rect x="96" y="173" width="49" height="10" rx="2" fill="#e9bdca" />
    <path d="M169 178H196V190Q183 204 169 190Z" fill="#f9f0dc" />
    <path d="M196 181Q211 180 201 190H196M177 169Q170 160 179 155" stroke="#f9f0dc" strokeWidth="3" />
  </svg>
}
