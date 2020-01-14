export default {
  data() {
    return {
      indexOfNextStroke: 0
    }
  },
  methods: {
    rescaleCanvas(redraw = true) {
      // make the drawing coordinate system 1:1 with the actual size of the canvas ("scrollWidth" is the actual width of the canvas)
      this.canvas.width = this.canvas.scrollWidth
      this.canvas.height = this.canvas.scrollHeight
      this.setStyle(this.color, this.lineWidth) // turns out the above code resets color and lineWidth
      // only redraw when the user has finished resizing the window
      if (redraw) {
        clearTimeout(this.redrawTimeout) // rescaleCanvas() called again during the 400 milliseconds, so cancel
        let canvas = this;

        this.redrawTimeout = setTimeout(() => {
          // Add thumbnail if one exists.
          // TODO(bobbyluig): Remove test after migration is complete.
          if (this.thumbnail && this.indexOfNextStroke === 0) {
            let thumbnail = new Image();
            thumbnail.onload = function () {
              canvas.ctx.drawImage(thumbnail, 0, 0, canvas.canvas.width, canvas.canvas.height);
            };
            thumbnail.src = this.thumbnail;
          } else {
            this.drawStrokesInstantly();
          }
        }, 200) // resizing the canvas causes all drawings to be lost
      }
    },
    async startSync(getTimeInSeconds) {
      if (!this.allStrokes || this.allStrokes.length == 0) {
        return
      }
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height) // clear the initial preview
      this.playProgress = setInterval(() => this.syncVisualWithAudio(getTimeInSeconds), 100)
    },
    // TODO: optimize the drawing
    syncVisualWithAudio(getTimeInSeconds) {
      const n = this.allStrokes.length
      const currentTime = getTimeInSeconds()
      if (this.nextStrokeStartTime() <= currentTime) {
        // catch up the visual to the audio 
        for (let i = this.indexOfNextStroke; i < n; i++) {
          const stroke = this.allStrokes[i]
          if (stroke.startTime > currentTime) {
            this.indexOfNextStroke = i
            break
          } else {
            this.renderStroke(stroke, this.getPointPeriod(stroke))
            if (this.indexOfNextStroke == n - 1) {
              this.indexOfNextStroke += 1 // edge case: without this, "this.allStrokes[this.indexOfNextStroke - 1] will no longer be the most recently drawn stroke 
            }
          }
        }
      } else if (this.indexOfNextStroke == 0) {
        // do nothing
      } else if (this.allStrokes[this.indexOfNextStroke - 1].startTime > currentTime) {
        // it's indexOfNextStroke - 1 because that is the index of current stroke!
        // most recent i.e. current stroke on canvas no longer belongs
        // however doesn't apply if there are no strokes at all on the page
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.indexOfNextStroke = 0
        this.allStrokes.forEach(stroke => {
          if (stroke.startTime <= currentTime) {
            this.renderStroke(stroke, null)
            this.indexOfNextStroke += 1
          }
        })
      } else {
        // do nothing 
      }
    },
    nextStrokeStartTime() {
      if (this.indexOfNextStroke == this.allStrokes.length) {
        // handle edge case of last index
        return 999999999999
      } else {
        // gracefully handles first index
        return this.allStrokes[this.indexOfNextStroke].startTime
      }
    },
    getPointPeriod(stroke) {
      const strokePeriod = (stroke.endTime - stroke.startTime) * 1000
      return strokePeriod / stroke.points.length
    },
    async quickplay() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      for (const stroke of this.allStrokes) {
        await this.drawStroke(stroke)
      }
    },
    drawStrokesInstantly() {
      for (const stroke of this.allStrokes) {
        this.drawStroke(stroke, null)
      }
    },
    // null is instant, 0 is quickplay, otherwise it's a realtime replay
    drawStroke({ points, color, lineWidth, isErasing }, pointPeriod = 0) {
      return new Promise(async resolve => {
        let newLineWidth = lineWidth * (this.canvas.width / 1000)
        this.setStyle(color, newLineWidth)
        for (let i = 1; i < points.length; i++) {
          const prevPoint = points[i - 1]
          const prevX = prevPoint.unitX * this.canvas.width
          const prevY = prevPoint.unitY * this.canvas.height

          const curPoint = points[i]
          const curX = curPoint.unitX * this.canvas.width
          const curY = curPoint.unitY * this.canvas.height
          this.ctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over'
          this.ctx.beginPath()
          this.ctx.moveTo(prevX, prevY)
          this.ctx.lineTo(curX, curY)
          this.ctx.stroke()

          if (pointPeriod != null) {
            await new Promise(resolve => setTimeout(resolve, pointPeriod))
          }
        }
        resolve()
      })
    },
    // "render" are for videos vs "draw" are for blackboards:
    renderStroke({ points, color, lineWidth, isErasing }, pointPeriod = 0) {
      return new Promise(async resolve => {
        for (let i = 1; i < points.length; i++) {
          const prevPoint = points[i - 1]
          const prevX = prevPoint.unitX * this.canvas.width
          const prevY = prevPoint.unitY * this.canvas.height

          const curPoint = points[i]
          const curX = curPoint.unitX * this.canvas.width
          const curY = curPoint.unitY * this.canvas.height

          // for rendering videos, it's necessary to reset style for every segment between points
          // because of simultaneous drawing / video seeking
          this.setStyle(color, lineWidth)
          this.ctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over'

          this.ctx.beginPath()
          this.ctx.moveTo(prevX, prevY)
          this.ctx.lineTo(curX, curY)
          this.ctx.stroke()

          if (pointPeriod != null) {
            await new Promise(resolve => setTimeout(resolve, pointPeriod))
          }
        }
        resolve()
      })
    },
    drawToPoint(x, y) {
      if (this.lastX == -1) {
        this.lastX = x
        this.lastY = y
        return
      }
      this.traceLineTo(x, y)
      this.ctx.stroke()
      // update position
      this.lastX = x
      this.lastY = y
    },
    setStyle(color = 'yellow', lineWidth = 2) {
      this.ctx.strokeStyle = color
      this.ctx.lineCap = 'round' // lines at different angles can join into each other
      this.ctx.lineWidth = lineWidth
    },
    traceLineTo(x, y) {
      this.ctx.beginPath()
      this.ctx.moveTo(this.lastX, this.lastY)
      this.ctx.lineTo(x, y)
    }
  }
}
