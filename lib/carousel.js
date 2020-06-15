// @author https://github.com/xuu
// accesibility reference https://www.w3.org/TR/wai-aria-practices/examples/carousel/carousel-1.html

/**
 * style util
 * @param {*} elms
 * @param {*} style
 */
function updateStyle(elms, style) {
  ;(Array.isArray(elms) ? elms : [elms]).forEach((elm) => {
    Object.entries(style).forEach(([key, val]) => {
      if (key.startsWith('--')) {
        elm.style.setProperty(key, val)
      } else {
        elm.style[key] = val
      }
    })
  })
}

/**
 * Touch event
 */
class Touch {
  constructor(target) {
    this.x0 = 0
    this.y0 = 0
    this.x = 0
    this.y = 0
    this.dx = 0
    this.dy = 0

    target.addEventListener('touchstart', (e) => {
      const {
        targetTouches: [touch],
      } = e
      this.x0 = touch.clientX
      this.x = touch.clientX
      this.y0 = touch.clientY
      this.y = touch.clientY
      this.dx = 0
      this.dy = 0
      this.touchstart && this.touchstart(e)
    })
    target.addEventListener('touchmove', (e) => {
      const {
        targetTouches: [touch],
      } = e
      this.x = touch.clientX
      this.y = touch.clientY
      this.dx = touch.clientX - this.x0
      this.dy = touch.clientY - this.y0
      this.touchmove && this.touchmove(e)
    })
    target.addEventListener('touchend', (e) => {
      this.touchend && this.touchend(e)
    })
  }
  on(name, fn) {
    this[name] = fn
    return this
  }
}

const carouselEdge = Symbol('carouselEdge')

/**
 * Carousel base
 */
class CarouselBase extends HTMLElement {
  constructor() {
    super()
    const shadow = this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    const container = document.createElement('div')
    const slot = document.createElement('slot')

    style.textContent = `
      :host {
        box-sizing: border-box;
        display: block;
        width: 100%;
        overflow: hidden;
        position: relative;
      }`
    shadow.appendChild(style)
    container.classList.add('container')
    container.appendChild(slot)
    shadow.appendChild(container)
    this._shadow = shadow
    this._container = container
    this._slot = slot
    this._touch = new Touch(container)
  }

  get _items() {
    return this._slot.assignedElements()
  }
  get _length() {
    return this._items.length
  }
  get _delay() {
    return this.hasAttribute('delay')
      ? Number(this.getAttribute('delay'))
      : 3000
  }
  get _duration() {
    return this.getAttribute('duration') || '500ms'
  }
  get _timingFuntion() {
    return this.getAttribute('timing-function') || 'ease-out'
  }
  get _continuous() {
    return this.hasAttribute('continuous') && this._length > 2
  }
  get _prevIndex() {
    if (this._currentIndex > 0) {
      return this._currentIndex - 1
    } else if (this._continuous) {
      return this._length - 1
    } else {
      return carouselEdge
    }
  }
  get _nextIndex() {
    if (this._currentIndex < this._length - 1) {
      return this._currentIndex + 1
    } else if (this._continuous) {
      return 0
    } else {
      return carouselEdge
    }
  }
  get _currentIndex() {
    return this._cIndex
  }
  set _currentIndex(index) {
    if (this._items[this._currentIndex]) {
      Reflect.deleteProperty(this._items[this._currentIndex].dataset, 'current')
    }
    if (this._items[index]) {
      this._items[index].dataset.current = true
    }
    this._cIndex = index
  }

  // https://github.com/thebird/Carousel/blob/master/carousel.js#L103
  circle(index) {
    return (this._length + (index % this._length)) % this._length
  }

  to() {}

  play() {
    this._rAFId = requestAnimationFrame((time) => {
      if (time - this._timeStamp > this._delay) {
        this.to(this._nextIndex)
        this._timeStamp = time
      }
      this.play()
    })
  }

  stopAutoplay() {
    if (this._rAFId) {
      cancelAnimationFrame(this._rAFId)
      this._rAFId = void 0
    }
  }

  emit(type, index = this._currentIndex) {
    this.dispatchEvent(
      new CustomEvent(type, { detail: { currentIndex: index } })
    )
  }

  connectedCallback() {
    // accessibility
    this.setAttribute('aria-roledescription', 'carousel')
    this.setAttribute('tabIndex', 0)
    this._items.forEach((item) => {
      item.setAttribute('aria-roledescription', 'slide')
      item.setAttribute('role', 'group')
    })
    this._container.setAttribute(
      'aria-live',
      this.hasAttribute('autoplay') ? 'off' : 'polite'
    )

    this._currentIndex = Number(this.getAttribute('current-index')) || 0

    // Events
    this.addEventListener('touchstart', () => {}, false) // fix iOS Safari issue
    this._touch
      .on('touchstart', this.touchstart && this.touchstart.bind(this))
      .on('touchmove', this.touchmove && this.touchmove.bind(this))
      .on('touchend', this.touchend && this.touchend.bind(this))
    this._container.addEventListener('transitionend', (e) => {
      this.transitionend && this.transitionend(e)
    })
    this._slot.addEventListener('slotchange', () => {
      if (this._items.length > 0) {
        this._currentIndex = Number(this.getAttribute('current-index')) || 0
        this.itemUpdated && this.itemUpdated()
        if (this.hasAttribute('autoplay')) {
          this.stopAutoplay()
          this._timeStamp = performance.now()
          this.play()
        }
      }
    })
  }
}

/**
 * Carousel Component
 */
class TheCarousel extends CarouselBase {
  get _offsetLeft() {
    return (
      Number(this.getAttribute('offset-left')) || (this._continuous ? 1 : 0)
    )
  }

  order(index) {
    return (
      (this._continuous
        ? this.circle(index - this._currentIndex + this._offsetLeft)
        : index) + 1
    )
  }

  connectedCallback() {
    super.connectedCallback()
    updateStyle(this._container, {
      display: 'flex',
      flexWrap: 'nowrap',
      marginLeft: this.getAttribute('margin-left') || 0,
      marginRight: this.getAttribute('margin-right') || 0,
    })
  }

  itemUpdated() {
    updateStyle(this._items, { minWidth: '100%' })
    this.updateOrder()
    this.transform('0px')
  }

  touchmove() {
    const { dx, dy } = this._touch
    if (Math.abs(dy) > 50 || this._busy) {
      return
    }
    this.stopAutoplay()
    this.transform(`${dx}px`)
  }

  touchend() {
    const { dx } = this._touch
    if (Math.abs(dx) > 30) {
      if (dx < 0 && this._nextIndex !== carouselEdge) {
        this.to(this._nextIndex)
      } else if (dx > 0 && this._prevIndex !== carouselEdge) {
        this.to(this._prevIndex)
      } else {
        this.to(this._currentIndex)
      }
    } else {
      this.transform('0px')
    }
  }

  transitionend(e) {
    e.stopPropagation()
    this._busy = false
    this.updateOrder()
    this.transform('0px')
    this.transition(false)
    this.emit('transitionend')
  }

  updateOrder() {
    if (this._continuous) {
      this._items.forEach((item, index) => {
        updateStyle(item, { order: this.order(index) })
      })
    }
  }

  transform(dx = '0px') {
    const x = this._continuous
      ? `calc(-${this._offsetLeft * 100}% + ${dx})`
      : `calc(-${this._currentIndex * 100}% + ${dx})`
    updateStyle(this._container, { transform: `translate3d(${x}, 0, 0)` })
  }

  transition(enable) {
    updateStyle(this._container, {
      transition: enable
        ? `transform ${this._duration} ${this._timingFuntion}`
        : 'none',
    })
  }

  to(index) {
    if (this._busy || index === carouselEdge) {
      return
    }
    index = this.circle(index)
    this._busy = true
    this.transition(true)
    this.transform(
      `${(this.order(this._currentIndex) - this.order(index)) * 100}%`
    )
    this._currentIndex = index
  }
}

/**
 * Carousel indicator
 */
const indicatorTmpl = document.createElement('template')
indicatorTmpl.innerHTML = `
  <style>
    :host {
      box-sizing: border-box;
      display: block;
    }
    .indicator {
      display: flex;
      justify-content: center;
      align-content: center;
      align-items: center;
      padding: 0.5em 1em;
      pointer-events: none;
    }
    .indicator span {
      display: inline-block;
      width: 5px;
      height: 5px;
      margin: 0 5px;
      border-radius: 50%;
      background-color: var(--color-5);
      opacity: 0.4;
    }
    .indicator span.in {
      background-color: var(--color-1);
      opacity: 1;
    }
  </style>
`

customElements.define(
  'carousel-indicator',
  class CarouselIndicator extends HTMLElement {
    constructor() {
      super()
      const shadow = this.attachShadow({ mode: 'open' })
      shadow.appendChild(indicatorTmpl.content.cloneNode(true))
      const slot = document.createElement('slot')
      shadow.appendChild(slot)
      shadow.addEventListener('slotchange', () => {
        const [carousel] = slot.assignedElements()
        if (carousel instanceof CarouselBase) {
          const indicator = document.createElement('div')
          const dots = []
          let lastIndex = carousel._currentIndex
          indicator.classList.add('indicator')
          shadow.appendChild(indicator)
          for (let i = 0; i < carousel._items.length; i++) {
            const dot = document.createElement('span')
            indicator.appendChild(dot)
            dots.push(dot)
          }
          dots[carousel._currentIndex].classList.add('in')
          carousel.addEventListener(
            'transitionend',
            ({ detail: { currentIndex } }) => {
              dots[lastIndex].classList.remove('in')
              dots[currentIndex].classList.add('in')
              lastIndex = currentIndex
            }
          )
        }
      })
    }
  }
)

/**
 * Carousel Button
 */
const buttonTmpl = document.createElement('template')
buttonTmpl.innerHTML = `
  <style>
    :host {
      box-sizing: border-box;
      display: block;
      position: relative;
    }
    button {
      position: absolute;
      color: transparent;
      margin: 0;
      padding: 0;
      width: 0;
      height: 0;
      border: 15px solid transparent;
      background-color: transparent;
      top: 50%;
      transform: translateY(-50%);
      overflow: hidden;
    }
    .prev {
      left: 0;
      border-right-color: white;
    }
    .next {
      right: 0;
      border-left-color: white;
    }
  </style>
  <slot></slot>
  <button class="prev">prev</button>
  <button class="next">next</button>
`

customElements.define(
  'carousel-button',
  class CarouselButton extends HTMLElement {
    constructor() {
      super()
      const shadow = this.attachShadow({ mode: 'open' })
      shadow.appendChild(buttonTmpl.content.cloneNode(true))
      const slot = shadow.querySelector('slot')
      const prevBtn = shadow.querySelector('.prev')
      const nextBtn = shadow.querySelector('.next')
      shadow.addEventListener('slotchange', () => {
        const [carousel] = slot.assignedElements()
        if (carousel instanceof CarouselBase) {
          if (carousel.id) {
            prevBtn.setAttribute('aria-controls', carousel.id)
            prevBtn.setAttribute('aria-label', 'Previous Slide')
            nextBtn.setAttribute('aria-controls', carousel.id)
            nextBtn.setAttribute('aria-label', 'Next Slide')
          }
          prevBtn.addEventListener('click', () => {
            carousel.stopAutoplay()
            if (carousel._prevIndex !== carouselEdge) {
              carousel.to(carousel._prevIndex)
            }
          })
          nextBtn.addEventListener('click', () => {
            carousel.stopAutoplay()
            if (carousel._nextIndex !== carouselEdge) {
              carousel.to(carousel._nextIndex)
            }
          })
        }
      })
    }
  }
)

/**
 * Fade style Carousel Component
 */
class CarouselFade extends CarouselBase {
  get _continuous() {
    return true
  }
  get _opacityTransition() {
    return `opacity ${this._duration} ${this._timingFuntion}`
  }
  get _opacityTransformTransition() {
    return `${this._opacityTransition}, transform 200ms linear`
  }

  itemUpdated() {
    updateStyle(this._items, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      opacity: '0',
      transition: this._opacityTransition,
    })
    this.to(this._currentIndex)
    this._busy = false
  }

  touchmove() {
    const { dx, dy } = this._touch
    if (Math.abs(dy) > 50 || this._busy) {
      return
    }
    this.stopAutoplay()
    const transItem = this._items[dx > 0 ? this._prevIndex : this._nextIndex]
    if (transItem !== this._transItem) {
      if (this._transItem) {
        updateStyle(this._transItem, {
          zIndex: '1',
          opacity: '0',
          transform: 'translate3d(0,0,0)',
        })
      }
      this._transItem = transItem
      updateStyle(transItem, {
        zIndex: '3',
        transform: `translate3d(${dx > 0 ? '-' : ''}50%,0,0)`,
        transition: this._opacityTransition,
      })
      setTimeout(() => {
        updateStyle(transItem, {
          opacity: '0.8',
          transform: `translate3d(0,0,0)`,
          transition: this._opacityTransformTransition,
        })
      }, 0)
    }
  }

  touchend() {
    this.stopAutoplay()
    this.to(this._touch.dx > 0 ? this._prevIndex : this._nextIndex)
  }

  transitionend(e) {
    e.stopPropagation()
    if (
      (e.target === this._items[this._currentIndex] && this._busy) ||
      e.target === this._transItem
    ) {
      this.emit('transitionend')
      this._transItem = void 0
      this._busy = false
    }
  }

  to(index) {
    if (this._busy) {
      return
    }
    this._busy = true
    index = this.circle(index)
    if (index !== this._currentIndex) {
      updateStyle(this._items[this._currentIndex], {
        zIndex: '1',
        opacity: '0',
        position: 'absolute',
        transition: this._opacityTransition,
      })
      this._currentIndex = index
    }
    updateStyle(this._items[index], {
      position: 'relative',
      zIndex: '2',
      opacity: '1',
      transition: this._opacityTransition,
    })
  }
}

/**
 * Clip style Carousel Component
 */
class CarouselClip extends CarouselBase {
  get _continuous() {
    return true
  }
  get _clipIn() {
    return this.hasAttribute('clip-in')
      ? Number(this.getAttribute('clip-in'))
      : 50
  }
  get _clipOut() {
    return this.hasAttribute('clip-out')
      ? Number(this.getAttribute('clip-out'))
      : 0
  }
  get _clipPath() {
    return (
      this.getAttribute('clip-path') ||
      `polygon(
        0 0,
        0 var(--clip-x),
        50% var(--clip-x),
        50% 0,
        calc(100% - var(--clip-x)) 0,
        calc(100% - var(--clip-x)) 50%,
        100% 50%,
        100% calc(100% - var(--clip-x)),
        50% calc(100% - var(--clip-x)),
        50% 100%,
        var(--clip-x) 100%,
        var(--clip-x) 50%,
        0 50%,
        0 100%,
        100% 100%,
        100% 0,
        0 0
      )`
    )
  }

  itemUpdated() {
    updateStyle(this._items, {
      position: 'absolute',
      zIndex: '1',
      top: '0',
      left: '0',
      width: '100%',
      webkitClipPath: this._clipPath,
      clipPath: this._clipPath,
      '--clip-x': `${this._clipOut}%`,
    })
    updateStyle(this._items[this._currentIndex], {
      position: 'relative',
      zIndex: '2',
      '--clip-x': `${this._clipIn}%`,
    })
  }

  moveIn(item) {
    updateStyle(item, {
      '--clip-x': `${Math.min(this._clipIn - 1, Math.abs(this._touch.dx))}%`,
    })
  }
  moveOut(item) {
    updateStyle(item, {
      '--clip-x': `${Math.max(1, this._clipIn - Math.abs(this._touch.dx))}%`,
    })
  }

  touchmove() {
    const { dx, dy } = this._touch
    if (Math.abs(dy) > 50 || this._busy) {
      return
    }
    this.stopAutoplay()
    const transItem = this._items[dx > 0 ? this._currentIndex : this._nextIndex]
    if (this._transItem && this._transItem !== transItem) {
      updateStyle(this._transItem, {
        zIndex: '1',
        '--clip-x': `${this._clipOut}%`,
      })
    }
    updateStyle(transItem, { zIndex: '3' })
    if (dx > 0) {
      updateStyle(this._items[this._prevIndex], {
        zIndex: '2',
        '--clip-x': `${this._clipIn}%`,
      })
      this.moveOut(transItem)
    } else {
      this.moveIn(transItem)
    }
    this._transItem = transItem
  }

  touchend() {
    this.stopAutoplay()
    this.to(this._touch.dx > 0 ? this._prevIndex : this._nextIndex)
  }

  transitionend(e) {
    e.stopPropagation()
    if (this._busy) {
      if (this._lastItem) {
        updateStyle(this._lastItem, {
          zIndex: '1',
          position: 'absolute',
          webkitTransition: 'none',
          transition: 'none',
          '--clip-x': `${this._clipOut}%`,
        })
      }
      updateStyle(this._items[this._currentIndex], {
        zIndex: '2',
        position: 'relative',
        webkitTransition: 'none',
        transition: 'none',
      })
      this.emit('transitionend')
      this._transItem = void 0
      this._busy = false
    }
  }

  to(index) {
    if (this._busy) {
      return
    }
    this._busy = true
    index = this.circle(index)
    this._lastItem = this._items[this._currentIndex]
    const clipTrans = `clip-path ${this._duration} ${this._timingFuntion}`
    updateStyle(this._transItem || this._items[index], {
      zIndex: '3',
      webkitTransition: '-webkit-' + clipTrans,
      transition: clipTrans,
      '--clip-x':
        this._transItem === this._items[this._currentIndex]
          ? `${this._clipOut}%`
          : `${this._clipIn}%`,
    })
    this._currentIndex = index
  }
}

/**
 * Circle style Carousel Component
 */
class CarouselCircle extends CarouselClip {
  get _clipIn() {
    return '150'
  }
  get _clipOut() {
    return '0'
  }
  get _clipPath() {
    return 'circle(var(--clip-x) at var(--clip-ox) var(--clip-oy))'
  }

  constructor() {
    super()
    updateStyle(this._container, {
      '--clip-ox': '50%',
      '--clip-oy': '50%',
    })
  }

  touchstart(e) {
    const { width, height, left, top } = this.getBoundingClientRect()
    updateStyle(this._container, {
      '--clip-ox': `${((this._touch.x0 - left) / width) * 100}%`,
      '--clip-oy': `${((this._touch.y0 - top) / height) * 100}%`,
    })
  }
}

customElements.define('the-carousel', TheCarousel)
customElements.define('carousel-fade', CarouselFade)
customElements.define('carousel-clip', CarouselClip)
customElements.define('carousel-circle', CarouselCircle)

window.addEventListener('DOMContentLoaded', () => {
  const carousels = document.querySelectorAll('.item-to-be-appended')
  const items = document.querySelector('#figures').content
  carousels.forEach((carousel) => {
    carousel.appendChild(items.cloneNode(true))
  })
})

/**
 * Clip style demos
 */
{
  const clips = [
    {
      clipIn: 100,
      path: `polygon(
        0 0,
        50% 50%,
        0 var(--clip-x),
        0 100%,
        50% 50%,
        var(--clip-x) 100%,
        100% 100%,
        50% 50%,
        100% calc(100% - var(--clip-x)),
        100% 0,
        50% 50%,
        calc(100% - var(--clip-x)) 0,
        100% 0,
        100% 100%,
        0 100%,
        0 0
      )`,
    },
    {
      clipIn: 50,
      path: `polygon(
        0 0,
        var(--clip-x) 50%,
        0 100%,
        50% calc(100% - var(--clip-x)),
        100% 100%,
        calc(100% - var(--clip-x)) 50%,
        100% 0,
        50% var(--clip-x),
        0 0,
        100% 0,
        100% 100%,
        0 100%,
        0 0
      )`,
    },
    {
      clipIn: 50,
      path: `polygon(
        0 0,
        50% 0,
        var(--clip-x) var(--clip-x),
        0 50%,
        var(--clip-x) calc(100% - var(--clip-x)),
        50% 100%,
        calc(100% - var(--clip-x)) calc(100% - var(--clip-x)),
        100% 50%,
        calc(100% - var(--clip-x)) var(--clip-x),
        50% 0,
        100% 0,
        100% 100%,
        0 100%,
        0 0
      )`,
    },
    {
      clipIn: 25,
      path: `polygon(
        0 0,
        calc(25% - var(--clip-x)) calc(25% + var(--clip-x)),
        50% 50%,
        calc(25% - var(--clip-x)) calc(75% - var(--clip-x)),
        0 100%,
        calc(25% + var(--clip-x)) calc(75% + var(--clip-x)),
        50% 50%,
        calc(75% - var(--clip-x)) calc(75% + var(--clip-x)),
        100% 100%,
        calc(75% + var(--clip-x)) calc(75% - var(--clip-x)),
        50% 50%,
        calc(75% + var(--clip-x)) calc(25% + var(--clip-x)),
        100% 0,
        calc(75% - var(--clip-x)) calc(25% - var(--clip-x)),
        50% 50%,
        calc(25% + var(--clip-x)) calc(25% - var(--clip-x)),
        0 0
      )`,
    },
    {
      clipIn: 25,
      path: `polygon(
        0 0,
        50% 0,
        calc(25% - var(--clip-x)) calc(25% - var(--clip-x)),
        0 50%,
        calc(25% - var(--clip-x)) calc(75% + var(--clip-x)),
        50% 100%,
        calc(75% + var(--clip-x)) calc(75% + var(--clip-x)),
        100% 50%,
        calc(75% + var(--clip-x)) calc(25% - var(--clip-x)),
        50% 0,
        calc(75% - var(--clip-x)) calc(25% + var(--clip-x)),
        100% 50%,
        calc(75% - var(--clip-x)) calc(75% - var(--clip-x)),
        50% 100%,
        calc(25% + var(--clip-x)) calc(75% - var(--clip-x)),
        0 50%,
        calc(25% + var(--clip-x)) calc(25% + var(--clip-x)),
        50% 0,
        0 0
      )`,
    },
    {
      clipIn: 100,
      path: `polygon(
        0 0,
        calc(100% - var(--clip-x)) var(--clip-x),
        0 100%,
        100% 100%,
        var(--clip-x) calc(100% - var(--clip-x)),
        100% 0,
        0 0
      )`,
    },
    {
      clipIn: 100,
      path: `polygon(
        0 0,
        100% 0,
        var(--clip-x) var(--clip-x),
        100% 100%,
        0 100%,
        calc(100% - var(--clip-x)) calc(100% - var(--clip-x)),
        0 0
      )`,
    },
    {
      clipIn: 50,
      path: `polygon(
        calc(50% - var(--clip-x)) 0,
        calc(50% - var(--clip-x)) 100%,
        50% calc(50% + var(--clip-x)),
        calc(50% + var(--clip-x)) 100%,
        calc(50% + var(--clip-x)) 0,
        50% calc(50% - var(--clip-x)),
        calc(50% - var(--clip-x)) 0
      )`,
    },
    {
      clipIn: 100,
      path: `polygon(
        0 0,
        0 var(--clip-x),
        100% 100%,
        100% calc(100% - var(--clip-x)),
        0 0
      )`,
    },
    {
      clipIn: 100,
      path: `polygon(
        0 0,
        calc(100% - var(--clip-x)) 100%,
        var(--clip-x) var(--clip-x),
        100% calc(100% - var(--clip-x)),
        0 0
      )`,
    },
    stripePath(4),
    stripePath(4, true),
    stripePath(15),
    stripePath(15, true),
    stripePath2(),
    stripePath2(10),
  ]

  window.addEventListener('DOMContentLoaded', () => {
    const tmpl = document.querySelector('#figures')
    const section = document.querySelector('#CarouselClip1')
    let i = 0
    for (let { clipIn, clipOut, path } of clips) {
      const carousel = document.createElement('carousel-clip')
      carousel.appendChild(tmpl.content.cloneNode(true))
      carousel.dataset.index = i++
      carousel.classList.add('carousel-clip')
      carousel.setAttribute('autoplay', true)
      if (clipIn) {
        carousel.setAttribute('clip-in', clipIn)
      }
      if (clipOut) {
        carousel.setAttribute('clip-out', clipOut)
      }
      if (path) {
        carousel.setAttribute('clip-path', path.replace(/[\n|\s]+/g, ' '))
      }
      section.appendChild(carousel)
    }
  })

  function stripePath(cols, horizontal = false) {
    cols = Math.max(Number(cols) || 4, 2)
    let path = []
    let rPath = []
    for (let i = 0; i < cols; i += 2) {
      path.push([`${(i / cols) * 100}%`, '0'])
      path.push([`${(i / cols) * 100}%`, 'var(--clip-x)'])
      path.push([`${((i + 1) / cols) * 100}%`, 'var(--clip-x)'])
      path.push([`${((i + 1) / cols) * 100}%`, '0'])
      if (i + 1 < cols) {
        rPath.push([`${((i + 1) / cols) * 100}%`, '100%'])
        rPath.push([`${((i + 1) / cols) * 100}%`, 'calc(100% - var(--clip-x))'])
        rPath.push([`${((i + 2) / cols) * 100}%`, 'calc(100% - var(--clip-x))'])
        rPath.push([`${((i + 2) / cols) * 100}%`, '100%'])
      }
    }
    path.push(['100%', cols % 2 === 0 ? '0' : '100%'])
    path = path.concat(rPath.reverse())
    path = path.concat([
      ['100%', '100%'],
      ['100%', '0'],
      ['0', '0'],
    ])
    if (horizontal) {
      path = path.map((p) => p.reverse())
    }
    return {
      clipIn: 100,
      path: `polygon(${path.map((p) => p.join(' ')).join(',')})`,
    }
  }

  function stripePath2(cols) {
    cols = cols || 5
    let path = ''
    for (let i = 0; i <= cols; i++) {
      let p = (i / cols) * 100
      let x = `calc(${p}% - var(--clip-x))`
      path += `${p}% 0%, ${p}% 100%, ${x} 100%, ${x} 0%, `
    }
    path += '0% 0%'
    path = `polygon(${path})`
    const clipIn = (1 / cols) * 100
    return { clipIn, path }
  }
}
