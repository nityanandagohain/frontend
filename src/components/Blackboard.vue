<template>
  <div id="whiteboard">
    <!-- SNACKBAR -->
    <v-snackbar v-model="snackbar">
      {{ snackbarMessage }}
      <v-btn @click="snackbar = false" color="pink" text>
        CLOSE
      </v-btn>
    </v-snackbar>

    <!-- WHITEBOARD BUTTONS -->
    <BaseAppBar :loading="loading">
      <v-toolbar-items v-if="whiteboardDoc">
        <template v-if="!whiteboardDoc.isAnswered">
          <swatches 
            v-model="color"
            :colors="colors"
            :show-border="true"
            :wrapper-style="{ paddingTop: '0px', paddingBottom: '0px', paddingLeft: '40px', height: '30px' }"
            inline
            background-color="rgba(0, 0, 0, 0)"
            swatch-size="40"
          />
          <!-- <v-btn @click="disableTouch = !disableTouch">
            {{ disableTouch ? "ENABLE TOUCH" : "DISABLE TOUCH"}}
          </v-btn> -->
          <v-btn 
            v-if="!isRecording"
            @click="deleteStrokesSubcollection()"
            color="red darken-2 white--text"
          >
            CLEAR
            <v-icon dark right>clear</v-icon>
          </v-btn>
          <template v-if="!isRecording">
            <v-btn @click="saveDoodle()">
              SAVE 
              <v-icon dark right>save</v-icon>
            </v-btn>
            <v-btn @click="startRecording()" color="pink white--text" dark>
              RECORD
              <v-icon dark right>fiber_manual_record</v-icon>
            </v-btn>
          </template>
          <v-btn v-else @click="stopRecording()" color="pink white--text">
            STOP VIDEO
          </v-btn>
        </template>
        <template v-else>
          <v-btn @click="initReplayLogic()">PREVIEW</v-btn>
          <v-btn @click="retryAnswer()">RETRY</v-btn>
          <v-btn @click="handleSaving('No title yet')" :disabled="!hasUploadedAudio" class="pink white--text">
            SAVE VIDEO
          </v-btn>
        </template>
      </v-toolbar-items>
    </BaseAppBar>

    <v-content>
      <!-- "@start-recording" is necessary because the audio-recorder can't 
      start recording instantaneously - and if we falsely believe it is, then `getAudioTime` will be 
      null-->
      <audio-recorder 
        v-if="whiteboardDoc"
        v-show="false"
        ref="audio-recorder"
        :audioURL="whiteboardDoc.audioURL"
        :audioPath="whiteboardDoc.audioPath"
        @start-recording="isRecording = true"
        @file-uploaded="audio => saveFileReference(audio)"
      />

      <!-- WHITEBOARD -->
      <canvas id="myCanvas" style="background-color: rgb(62, 66, 66)"/>
      <!-- <canvas id="myCanvas" style="height: 90vh; background-color: rgb(62, 66, 66)"/> -->
    </v-content>

  </div>
</template>

<script>
import { mapState } from 'vuex'
import firebase from 'firebase/app'
import 'firebase/functions'
import slugify from 'slugify'
import db from '@/database.js'
import DrawMethods from '@/mixins/DrawMethods.js'
import Swatches from 'vue-swatches'
import 'vue-swatches/dist/vue-swatches.min.css'
import AudioRecorder from '@/components/AudioRecorder.vue'
import BaseAppBar from "@/components/BaseAppBar.vue"

export default {
  props: {
    whiteboardID: String,
    hideToolbar: Boolean
  },
  components: {
    AudioRecorder,
    Swatches,
    BaseAppBar
  },
  mixins: [DrawMethods],
  computed: {
    ...mapState(['user']),
    author () {
      if (this.user) {
        if (this.user.name) {
          return {
            name: this.user.name,
            uid: this.user.uid
          }
        } else {
          return {
            email: this.user.email,
            uid: this.user.uid
          }
        }
      } else {
        return {
          name: 'Anonymous',
          uid: 'Anonymous'
        }
      }
    }
  },
  data () {
    return {
      loading: true,
      whiteboardDoc: null,
      color: 'white',
      lineWidth: 2,
      colors: ['white', 'orange', '#0AF2F2', 'deeppink', 'rgb(62, 66, 66)'],
      disableTouch: false,
      saveSilently: false,
      saveVideoPopup: false,
      isRecording: false,
      strokesRef: null,
      stylus: false, 
      allStrokes: [],
      currentStroke: [],
      canvas: null,
      ctx: null,
      timer: null,
      getCurrentTime: null,
      currentTime: 0,
      startTime: 0,
      endTime: null,
      touchX: null,
      touchY: null,
      lastX: -1,
      lastY: -1,
      unsubscribe: null,
      redrawTimeout: null, // needed for mixins/DrawMethods.js TODO: consider declaring it in the data () section of DrawMethods.js instead,
      hasUploadedAudio: false,
      mouseX : 0,
      mouseY : 0,
      mousedown : 0,
      clearRectTimeout: null,
      snackbar: false,
      snackbarMessage: ""
    }
  },
  watch: {
    whiteboardID: {
      handler: 'initData',
      immediate: true
    },
    // detects when user switches from the eraser back to drawing (TODO: high surface area for bugs)
    color () {
      if (this.color != 'rgb(62, 66, 66)') { // eraser color stroke width is larger
        this.lineWidth = 2
      } else {
        this.lineWidth = 30
      }
      this.setStyle(this.color, this.lineWidth)
    },
    isRecording () {
      if (this.isRecording) {
        this.startTimer()
      } else {
        this.stopTimer()
      }
    },
    whiteboardDoc (newVal) {
      // TODO: this gets triggered 2x more often than I expect, find out why
      if (newVal) {
        if (!newVal.isAnswered || this.canvas || this.ctx) {
          this.initTouchEvents();
          this.initMouseEvents();
        }
      }
    },
  },
  mounted () {
    // the mounted() hook is never called for subsequent switches between whiteboards
    const whiteboardRef = db.collection('whiteboards').doc(this.whiteboardID)
    this.canvas = document.getElementById('myCanvas')
    this.ctx = this.canvas.getContext('2d')
    // new redraw code
    this.canvas.width = document.documentElement.clientWidth 
    this.canvas.height = 0.9 * document.documentElement.clientHeight
    this.rescaleCanvas(true)
    window.addEventListener('resize', () => { 
      this.canvas.width = document.documentElement.clientWidth 
      this.rescaleCanvas(true)
    }, false)
    this.initTouchEvents()
    this.initMouseEvents()
    this.continuouslySyncBoardWithDB()
    this.$root.$on("side-nav-toggled", sideNavOpened => {
      if (sideNavOpened) {
        this.canvas.width = document.documentElement.clientWidth
      } else {
        this.canvas.width = document.documentElement.clientWidth
      }
      this.rescaleCanvas(true)
    })
  },
  beforeDestroy () {
    this.unsubscribe()
  },
  methods: {
    toggleDrawer () {
      this.$root.$emit("toggle-drawer")
    },
    // takePicture () {
    //   const dataURL = this.canvas.toDataURL()
    // },
    async initData () {
      this.loading = true
      if (!this.whiteboardID) {
        return
      }
      const whiteboardRef = db.collection('whiteboards').doc(this.whiteboardID)
      this.strokesRef = whiteboardRef.collection('strokes')
      // TODO: remove this whiteboard listener 
      await this.$binding('whiteboardDoc', whiteboardRef)
      // visually wipe previous drawings
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      }
      this.allStrokes = [] 
      if (this.unsubscribe) {
        this.unsubscribe() 
      }
      this.continuouslySyncBoardWithDB() 
    },
    continuouslySyncBoardWithDB () {
      this.unsubscribe = this.strokesRef.orderBy('strokeNumber').onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const stroke = change.doc.data()
            // check if local strokes and db strokes are in sync 
            if (this.allStrokes.length < stroke.strokeNumber) {
              this.drawStroke(stroke, null)
              this.allStrokes.push(stroke)
            }
          } 
          else if (change.type === 'removed') {
            // inefficient way to clear canvas for OTHER users (since the current user's UI is already updated)
            clearTimeout(this.clearRectTimeout)
            this.clearRectTimeout = setTimeout(() => this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height), 400)
            this.resetVariables()
          }
        })
        this.loading = false
      })
    },
    resetVariables () {
      this.allStrokes = []
      this.lastX = -1
    },
    sortStrokesByTimestamp () {
      this.allStrokes.sort((a, b) => Number(a.startTime) - Number(b.startTime))
    },
    getHeightToWidthRatio () {
      return this.canvas.scrollHeight / this.canvas.scrollWidth
    },
    startTimer () {
      this.currentTime = 0 
      this.timer = setInterval(() => this.currentTime += 0.1, 100)
    },
    stopTimer () {
      clearInterval(this.timer)
    },
    initReplayLogic () {
      this.quickplay()
    },
    initTouchEvents () {
      this.canvas.addEventListener('touchstart', this.touchStart, false)
      this.canvas.addEventListener('touchend',this.touchEnd, false)
      this.canvas.addEventListener('touchmove', this.touchMove, false)
      this.setStyle(this.color, this.lineWidth)
    },
    removeTouchEvents () {
      this.canvas.removeEventListener('touchstart', this.touchStart, false)
      this.canvas.removeEventListener('touchend', this.touchEnd, false)
      this.canvas.removeEventListener('touchmove', this.touchMove, false)
    },
    initMouseEvents() {
      // TODO: implement mouseUp, mouseDown, mouseMove
      window.addEventListener('mouseup', this.mouseUp, false);
      this.canvas.addEventListener('mousedown', this.mouseDown, false);
      this.canvas.addEventListener('mousemove', this.mouseMove, false);
    },
    removeMouseEvents() {
      window.removeEventListener('mouseup', this.mouseUp, false);
      this.canvas.removeEventListener('mousedown', this.mouseDown, false);
      this.canvas.removeEventListener('mousemove', this.mouseMove, false);
    },
    async deleteStrokesSubcollection () {
      for (let i = 1; i < this.allStrokes.length + 1; i++) {
        this.strokesRef.doc(`${i}`).delete()
      }
      this.allStrokes = [] 
    },
    convertAndSavePoint (x, y) {
      const unitX = parseFloat(x / this.canvas.width).toFixed(4)
      const unitY = parseFloat(y / this.canvas.height).toFixed(4)
      this.currentStroke.push({ unitX, unitY })
      this.drawToPoint(x, y);
    },
    touchStart (e) {
      e.preventDefault()
      if (this.isNotValidTouch(e)) { 
        return 
      }
      if (e.touches[0].touchType == 'stylus') {
        this.disableTouch = true
      } 
      this.drawToPointAndSave(e)
      if (this.isRecording) {
        this.startTime = this.currentTime.toFixed(1) // this.startTime keeps track of current stroke's startTime
      }
   
    },
    touchMove (e) {
      e.preventDefault()
      if (this.isNotValidTouch(e)) { 
        return 
      }
      this.drawToPointAndSave(e)
      event.preventDefault() // this line improves drawing performance for Microsoft Surfaces
    },
    touchEnd (e) {
      e.preventDefault()
      if (this.currentStroke.length == 0) {
        // user is touching the screen despite that touch is disabled
        return 
      }
      const strokeNumber = this.allStrokes.length + 1
      // save
      const stroke = {
        strokeNumber,
        author: this.author || 'anonymous',
        color: this.color,
        lineWidth: this.lineWidth,
        startTime: Number(this.startTime),
        endTime: Number(this.currentTime.toFixed(1)),
        points: this.currentStroke
      }
      this.allStrokes.push(stroke)
      this.strokesRef.doc(`${strokeNumber}`).set(stroke)
      // reset 
      this.currentStroke = []
      this.lastX = -1
    },
    drawToPointAndSave (e) {
      this.getTouchPos(e)
      this.convertAndSavePoint(this.touchX, this.touchY)
      this.drawToPoint(this.touchX, this.touchY)
    },
    getTouchPos (e) {
      const finger1 = e.touches[0] 
      this.touchX = finger1.pageX - this.canvas.getBoundingClientRect().left - window.scrollX
      this.touchY = finger1.pageY - this.canvas.getBoundingClientRect().top - window.scrollY
    },
    isNotValidTouch (e) {
      // multiple fingers not allowed 
      if (e.touches.length != 1) {
        return true
      }
      if (this.isFinger(e) && this.disableTouch) {
        return true
      } else {
        return false 
      }
    },
    isFinger (e) {
      if (e.touches[0].touchType != 'stylus') {
        return true 
      } 
      return false
    },

    // --- Mouse Drawing --- // 
    mouseDown(e) {
      this.mousedown=1;

      // referenced from touchStart
      this.setStyle(this.color, this.lineWidth);
      this.getMousePos(e);
      this.convertAndSavePoint(this.mouseX, this.mouseY);
      this.drawToPoint(this.mouseX, this.mouseY);
      if (this.isRecording) {
        this.startTime = this.currentTime.toFixed(1)
      }
      event.preventDefault();
    },

    mouseUp(e) {
      this.mousedown=0;
      // referenced from touchEnd
      const strokeNumber = this.allStrokes.length + 1
      // save
      const stroke = {
        strokeNumber,
        author: this.author || 'anonymous',
        color: this.color,
        lineWidth: this.lineWidth,
        startTime: Number(this.startTime),
        endTime: Number(this.currentTime.toFixed(1)),
        points: this.currentStroke
      }
      this.allStrokes.push(stroke);
      this.strokesRef.doc(`${strokeNumber}`).set(stroke);
      // reset 
      this.currentStroke = [];
      this.lastX = -1;
    },

    mouseMove(e) { // Update the mouse co-ordinates when moved
      this.getMousePos(e);

      // Draw a pixel if the mouse button is currently being pressed 
      if (this.mousedown == 1) { 
        // referenced from touchMove
        this.getMousePos(e);
        this.convertAndSavePoint(this.mouseX, this.mouseY);
        this.drawToPoint(this.mouseX, this.mouseY);
        event.preventDefault() // this line improves drawing performance for Microsoft Surfaces
      }
    },

    getMousePos(e) { // Get the current mouse position relative to the top-left of the canvas
      if (!e)
        var e = event;

      if (e.offsetX) {
        this.mouseX = e.offsetX - window.scrollX;
        this.mouseY = e.offsetY - window.scrollY;
      }
      else if (e.layerX) {
        this.mouseX = e.layerX - window.scrollX;
        this.mouseY = e.layerY - window.scrollY;
      }
    },
    // --- END Mouse Drawing --- // 

    useEraser () {
      this.color = 'rgb(62, 66, 66)'
      this.lineWidth = 18
    },
    saveDoodle () {
      // this.saveSilently = true
      // this.saveVideoPopup = true 
      this.handleSaving("No title yet")
    },
    startRecording () {
      const audioRecorder = this.$refs['audio-recorder']
      audioRecorder.startRecording()
    },
    stopRecording () {
      this.isRecording = false
      this.removeTouchEvents()
      this.removeMouseEvents();
      const audioRecorder = this.$refs['audio-recorder']
      audioRecorder.stopRecording()
      const ID = this.whiteboardDoc['.key']
      db.collection('whiteboards').doc(ID).update({
        isAnswered: true 
      })
    },
    retryAnswer () {
      this.currentTime = 0 
      this.hasUploadedAudio = false
      const ID = this.whiteboardDoc['.key']
      const whiteboardRef = db.collection('whiteboards').doc(ID)
      whiteboardRef.update({
        isAnswered: false,
        audioURL: '',
        audioPath: ''
      })
    },
    saveFileReference({ url, path }) {
      this.hasUploadedAudio = true
      const ID = this.whiteboardDoc['.key']
      db.collection('whiteboards').doc(ID).update({
        audioURL: url,
        audioPath: path
      })
    },
    async handleSaving (videoTitle) {
      // mark the whiteboard as saved 
      const whiteboardID = this.whiteboardDoc['.key']
      const classID = this.$route.params.class_id

      // take a screenshot of the whiteboard to be used as the "preview" of the video
      // const dataURL = this.canvas.toDataURL()
      const videoThumbnail = this.createThumbnail()

      let metadata = {
        title: videoTitle, 
        fromClass: classID,
        isSaved: true,
        tabNumber: 0,
        thumbnail: videoThumbnail // toDataURL takes a screenshot of a canvas and encodes it as an image URL
      }
      if (this.user) {
        metadata.authorUID = this.user.uid
        metadata.authorEmail = this.user.email
        if (this.user.name) {
          metadata.authorName = this.user.name
        }
      }
      if (this.currentTime) {
        metadata.duration = this.currentTime
      }
      db.collection('whiteboards').doc(whiteboardID).update(metadata)

      // KEEP TRACK OF HOW MANY VIDEOS A CLASS HAS ACCUMULATED 
      const classRef = db.collection("classes").doc(classID)
      classRef.update({
        numOfVideos: firebase.firestore.FieldValue.increment(1)
      })

      // initialize a new whiteboard for the workspace
      const workspaceID = this.$route.params.id
      const newWhiteboardRef = await db.collection('whiteboards').add({ isAnswered: false })
      const workspaceRef = db.collection('classes').doc(classID).collection('workspaces').doc(workspaceID)
      workspaceRef.update({
        whiteboardID: newWhiteboardRef.id
      })
      // let popup show the success state and the shareable URL
      // this.$refs["popup-save"].showSuccessMessage(whiteboardID)
 
      this.hasUploadAudio = false
      this.snackbar = true 
      this.snackbarMessage = 'Successfully saved to the "Videos" section'
    },
    createThumbnail(){
        this.ctx.fillStyle = "rgb(62, 66, 66)";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawStrokesInstantly()
        return this.canvas.toDataURL()
    }
  }
}
</script>
