import { useRef, useState, type KeyboardEvent, type TouchEvent } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

const slides = [
  {
    image: '/auth/img01.jpg',
    eyebrow: 'um começo gentil',
    title: 'Planeje seu dia',
    description:
      'Organize seus sonhos, cultive seus hábitos e transforme pequenos momentos em uma vida mais sua.',
  },
  {
    image: '/auth/img02.jpg',
    eyebrow: 'páginas com personalidade',
    title: 'Crie do seu jeito',
    description:
      'Escreva, desenhe, cole, organize e transforme cada página em algo só seu.',
  },
  {
    image: '/auth/img03.jpg',
    eyebrow: 'seu tempo, guardado',
    title: 'Guarde sua vida',
    description:
      'Registre memórias, planos e pequenos tesouros do dia a dia. Tudo o que importa, sempre com você.',
  },
  {
    image: '/auth/img04.jpg',
    eyebrow: 'no seu próprio ritmo',
    title: 'Encontre seu ritmo',
    description:
      'Planeje sem pressa e construa uma rotina que combine com você.',
  },
]

function AuthCarousel() {
  const [active, setActive] = useState(0)
  const touchStart = useRef<number | null>(null)

  const slide = slides[active]

  function move(direction: number) {
    setActive(
      current =>
        (current + direction + slides.length) % slides.length,
    )
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      move(event.key === 'ArrowLeft' ? -1 : 1)
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    touchStart.current = event.touches[0]?.clientX ?? null
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStart.current === null) return

    const distance =
      (event.changedTouches[0]?.clientX ?? touchStart.current) -
      touchStart.current

    if (Math.abs(distance) > 42) {
      move(distance > 0 ? -1 : 1)
    }

    touchStart.current = null
  }

  return (
    <section
      className="auth-carousel"
      aria-roledescription="carousel"
      aria-label="Descubra o Matcha Planner"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="auth-carousel-count" aria-hidden="true">
        0{active + 1} / 0{slides.length}
      </div>

      <div
        className="auth-slide"
        key={slide.image}
        aria-live="polite"
      >
        <div className="auth-art-frame">
          <span className="auth-art-label">
            MATCHA FIELD NOTES · {slide.eyebrow.toUpperCase()}
          </span>

          <img
            src={slide.image}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        <div className="auth-slide-copy">
          <span>{slide.eyebrow}</span>
          <h2>{slide.title}</h2>
          <p>{slide.description}</p>
        </div>
      </div>

      <div className="auth-carousel-controls">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="Slide anterior"
        >
          <ArrowLeft />
        </button>

        <div
          className="auth-carousel-dots"
          role="tablist"
          aria-label="Escolher ilustração"
        >
          {slides.map((item, index) => (
            <button
              key={item.image}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Mostrar slide ${index + 1}: ${item.title}`}
              className={index === active ? 'is-active' : ''}
              onClick={() => setActive(index)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => move(1)}
          aria-label="Próximo slide"
        >
          <ArrowRight />
        </button>
      </div>
    </section>
  )
}

export default AuthCarousel