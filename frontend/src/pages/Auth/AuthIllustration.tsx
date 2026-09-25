type AuthIllustrationProps = {
  scene: 'day' | 'memories' | 'create'
}


function SunriseScene() {
  return <>
    <circle cx="302" cy="118" r="47" className="art-sun" />
    <path d="M0 177 Q82 98 170 169 Q252 77 381 172 Q467 101 600 179 V300 H0Z" className="art-mountain-back" />
    <path d="M0 208 Q98 140 205 209 Q302 142 430 211 Q519 164 600 214 V330 H0Z" className="art-mountain" />
    <path d="M0 267 Q130 217 271 267 Q440 208 600 258 V380 H0Z" className="art-field" />
    <path d="M445 204 h48 v43 h-48z M439 204 l30-25 31 25z" className="art-house" />
    <path d="M465 226 h11 v21 h-11z" className="art-house-detail" />
    <path d="M0 335 H600 V460 H0Z" className="art-table" />
    <ellipse cx="415" cy="354" rx="45" ry="12" className="art-shadow" />
    <path d="M383 305 h66 l-7 47 q-25 16-52 0z" className="art-cup" />
    <path d="M449 314 q29-3 22 22 q-5 13-25 7" className="art-line" />
    <ellipse cx="416" cy="308" rx="31" ry="8" className="art-matcha" />
    <path d="M480 282 l17 69 M474 283 l22 1" className="art-whisk" />
    <path d="M86 307 q83-32 161 8 v112 q-79-22-161 2z" className="art-page" />
    <path d="M247 315 q78-27 158 8 v109 q-79-23-158-5z" className="art-page art-page-right" />
    <path d="M247 316 v111 M107 342 q65-18 121-1 M107 367 q65-18 121-1 M272 347 q55-15 104-2 M272 373 q55-15 104-2" className="art-paper-line" />
    <path d="M178 392 l103-75" className="art-pen" />
    <path d="M53 336 q-15-43 9-79 M58 294 q-30-13-32-35 M61 279 q30-23 26-50" className="art-stem" />
    <circle cx="25" cy="255" r="8" className="art-flower" /><circle cx="86" cy="226" r="7" className="art-flower" />
    <circle cx="539" cy="284" r="6" className="art-flower-alt" /><circle cx="563" cy="270" r="5" className="art-flower" />
    <path d="M528 337 q12-47 35-67 M543 304 q-22-4-29-23 M551 290 q20-12 24-31" className="art-stem" />
    <circle cx="88" cy="91" r="3" className="art-star" /><circle cx="130" cy="69" r="2" className="art-star" />
    <path d="M505 70 q14 12 29 0 q-4 22-15 30 q-12-8-14-30z" className="art-moon" />
  </>
}


function MemoriesScene() {
  return <>
    <rect x="37" y="47" width="265" height="235" rx="2" className="art-window" />
    <path d="M169 48 V282 M38 167 H302" className="art-window-line" />
    <circle cx="235" cy="101" r="34" className="art-sun-soft" />
    <path d="M38 209 Q99 142 170 201 Q233 143 302 205 V282 H38Z" className="art-mountain" />
    <path d="M0 325 H600 V460 H0Z" className="art-table" />
    <rect x="346" y="67" width="154" height="185" rx="3" transform="rotate(5 423 159)" className="art-polaroid" />
    <rect x="362" y="84" width="122" height="119" transform="rotate(5 423 143)" className="art-photo" />
    <path d="M369 182 q44-70 108 7" className="art-photo-hill" />
    <circle cx="440" cy="117" r="17" className="art-photo-sun" />
    <rect x="433" y="223" width="127" height="151" rx="3" transform="rotate(-8 496 298)" className="art-polaroid-small" />
    <rect x="448" y="238" width="97" height="92" transform="rotate(-8 496 284)" className="art-photo art-photo-pink" />
    <path d="M88 300 h190 v130 H88z" className="art-book" />
    <path d="M183 307 v123 M106 334 h59 M106 358 h59 M200 337 h57 M200 362 h57" className="art-paper-line" />
    <path d="M58 318 h54 l-6 40 q-20 13-42 0z" className="art-cup" />
    <ellipse cx="84" cy="319" rx="25" ry="6" className="art-matcha" />
    <path d="M309 424 h96 M321 405 h90 M337 386 h80" className="art-books" />
    <path d="M19 334 q36-75 83-100 M56 287 q-33 1-40-30 M71 267 q37-9 40-42" className="art-stem" />
    <circle cx="16" cy="254" r="9" className="art-flower" /><circle cx="111" cy="222" r="8" className="art-flower-alt" />
  </>
}


function CreateScene() {
  return <>
    <path d="M0 342 H600 V460 H0Z" className="art-table" />
    <rect x="89" y="81" width="356" height="315" rx="8" transform="rotate(-2 267 238)" className="art-scrapbook" />
    <path d="M268 83 v311" className="art-book-spine" />
    <rect x="113" y="112" width="128" height="94" rx="3" transform="rotate(4 177 159)" className="art-photo-card" />
    <circle cx="178" cy="148" r="22" className="art-photo-sun" />
    <path d="M117 189 q61-69 121 3" className="art-photo-hill" />
    <rect x="302" y="112" width="104" height="82" rx="2" transform="rotate(-5 354 153)" className="art-note-yellow" />
    <path d="M319 137 h68 M319 157 h51" className="art-paper-line" />
    <path d="M124 239 h111 M124 265 h93 M124 291 h118 M124 317 h78" className="art-paper-line" />
    <path d="M116 226 q64 15 130 0" className="art-washi" />
    <circle cx="349" cy="260" r="47" className="art-stamp" />
    <path d="M327 261 q21-31 44 0 q-22 31-44 0z" className="art-stamp-detail" />
    <rect x="296" y="325" width="110" height="26" rx="2" transform="rotate(4 351 338)" className="art-washi-pink" />
    <path d="M470 112 l25 253 M492 110 l29 250 M515 123 l29 237" className="art-pens" />
    <path d="M45 360 q7-94 53-139 M64 298 q-36-6-42-37 M78 272 q35-14 40-49" className="art-stem" />
    <circle cx="22" cy="257" r="9" className="art-flower-alt" /><circle cx="117" cy="219" r="8" className="art-flower" />
    <path d="M443 393 h66 l-7 43 q-25 15-52 0z" className="art-cup" />
    <ellipse cx="476" cy="394" rx="30" ry="7" className="art-matcha" />
    <path d="M52 78 l17 12 19-8-5 20 14 15-21 2-10 18-8-19-21-5 16-14z" className="art-sticker" />
  </>
}


function AuthIllustration({ scene }: AuthIllustrationProps) {
  return (
    <svg className="auth-illustration" viewBox="0 0 600 460" role="img" aria-label={scene === 'day' ? 'Planner, matcha e paisagem ao amanhecer' : scene === 'memories' ? 'Diário, fotografias e objetos de memória perto da janela' : 'Planner criativo com papéis, fitas e materiais de desenho'}>
      <rect width="600" height="460" rx="8" className="art-sky" />
      {scene === 'day' && <SunriseScene />}
      {scene === 'memories' && <MemoriesScene />}
      {scene === 'create' && <CreateScene />}
    </svg>
  )
}


export default AuthIllustration
