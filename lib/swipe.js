// @author https://github.com/xuu

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

class Touch {
  constructor(target) {
    this.x0 = 0
    this.y0 = 0
    this.x = 0
    this.y = 0
    this.dx = 0
    this.dy = 0

    target.addEventListener('touchstart', (e) => {
      let {
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
      let {
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

const swipeEdge = Symbol('swipeEdge')

class SwipeBase extends HTMLElement {
  constructor() {
    super()
    let shadow = this.attachShadow({ mode: 'open' })
    let style = document.createElement('style')
    let container = document.createElement('div')
    let slot = document.createElement('slot')

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
      return swipeEdge
    }
  }
  get _nextIndex() {
    if (this._currentIndex < this._length - 1) {
      return this._currentIndex + 1
    } else if (this._continuous) {
      return 0
    } else {
      return swipeEdge
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

  // https://github.com/thebird/Swipe/blob/master/swipe.js#L103
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
    this._currentIndex = Number(this.getAttribute('current-index')) || 0
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

class TheSwipe extends SwipeBase {
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
    let { dx, dy } = this._touch
    if (Math.abs(dy) > 50 || this._busy) {
      return
    }
    this.stopAutoplay()
    this.transform(`${dx}px`)
  }

  touchend() {
    let { dx } = this._touch
    if (Math.abs(dx) > 30) {
      if (dx < 0 && this._nextIndex !== swipeEdge) {
        this.to(this._nextIndex)
      } else if (dx > 0 && this._prevIndex !== swipeEdge) {
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
    let x = this._continuous
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
    if (this._busy || index === swipeEdge) {
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

customElements.define(
  'swipe-indicator',
  class SwipeIndicator extends HTMLElement {
    constructor() {
      super()
      let shadow = this.attachShadow({ mode: 'open' })
      shadow.appendChild(
        document.querySelector('#swipe-indicator-tmpl').content.cloneNode(true)
      )
      let slot = document.createElement('slot')
      shadow.appendChild(slot)
      shadow.addEventListener('slotchange', () => {
        let [swipe] = slot.assignedElements()
        if (swipe instanceof SwipeBase) {
          let indicator = document.createElement('div')
          let dots = []
          let lastIndex = swipe._currentIndex
          indicator.classList.add('indicator')
          shadow.appendChild(indicator)
          for (let i = 0; i < swipe._items.length; i++) {
            let dot = document.createElement('span')
            indicator.appendChild(dot)
            dots.push(dot)
          }
          dots[swipe._currentIndex].classList.add('in')
          swipe.addEventListener(
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

customElements.define(
  'swipe-arrow',
  class SwipeArrow extends HTMLElement {
    constructor() {
      super()
      let shadow = this.attachShadow({ mode: 'open' })
      shadow.appendChild(
        document.querySelector('#swipe-arrow-tmpl').content.cloneNode(true)
      )
      let slot = shadow.querySelector('slot')
      let prevBtn = shadow.querySelector('.prev')
      let nextBtn = shadow.querySelector('.next')
      shadow.addEventListener('slotchange', () => {
        let [swipe] = slot.assignedElements()
        if (swipe instanceof SwipeBase) {
          prevBtn.addEventListener('click', () => {
            swipe.stopAutoplay()
            if (swipe._prevIndex !== swipeEdge) {
              swipe.to(swipe._prevIndex)
            }
          })
          nextBtn.addEventListener('click', () => {
            swipe.stopAutoplay()
            if (swipe._nextIndex !== swipeEdge) {
              swipe.to(swipe._nextIndex)
            }
          })
        }
      })
    }
  }
)

class SwipeFade extends SwipeBase {
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
    let { dx, dy } = this._touch
    if (Math.abs(dy) > 50 || this._busy) {
      return
    }
    this.stopAutoplay()
    let transItem = this._items[dx > 0 ? this._prevIndex : this._nextIndex]
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

class SwipeClip extends SwipeBase {
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
    let { dx, dy } = this._touch
    if (Math.abs(dy) > 50 || this._busy) {
      return
    }
    this.stopAutoplay()
    let transItem = this._items[dx > 0 ? this._currentIndex : this._nextIndex]
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
    let clipTrans = `clip-path ${this._duration} ${this._timingFuntion}`
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

class SwipeCircle extends SwipeClip {
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
    let { width, height, left, top } = this.getBoundingClientRect()
    updateStyle(this._container, {
      '--clip-ox': `${((this._touch.x0 - left) / width) * 100}%`,
      '--clip-oy': `${((this._touch.y0 - top) / height) * 100}%`,
    })
  }
}

customElements.define('the-swipe', TheSwipe)
customElements.define('swipe-fade', SwipeFade)
customElements.define('swipe-clip', SwipeClip)
customElements.define('swipe-circle', SwipeCircle)

window.addEventListener('DOMContentLoaded', () => {
  let swipes = document.querySelectorAll('.item-to-be-appended')
  let items = document.querySelector('#figures').content
  swipes.forEach((swipe) => {
    swipe.appendChild(items.cloneNode(true))
  })
})

{
  let clips = [
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
    let clipIn = (1 / cols) * 100
    return { clipIn, path }
  }

  window.addEventListener('DOMContentLoaded', () => {
    let tmpl = document.querySelector('#figures')
    let section = document.querySelector('#SwipeClip1')
    let i = 0
    for (let { clipIn, clipOut, path } of clips) {
      let swipe = document.createElement('swipe-clip')
      swipe.appendChild(tmpl.content.cloneNode(true))
      swipe.dataset.index = i++
      swipe.classList.add('swipe-clip')
      swipe.setAttribute('autoplay', true)
      if (clipIn) {
        swipe.setAttribute('clip-in', clipIn)
      }
      if (clipOut) {
        swipe.setAttribute('clip-out', clipOut)
      }
      if (path) {
        swipe.setAttribute('clip-path', path.replace(/[\n|\s]+/g, ' '))
      }
      section.appendChild(swipe)
    }
  })
}
