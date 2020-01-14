<template>
  <div id="whiteboard" style="height: 100%">
    <BaseOverlay v-if="isFullscreen" :overlay="overlay" @play-video="startVideo()">
      <canvas
        v-if="isFullscreen"
        :id="`myCanvas-${canvasID}`"
        style="width: 100%; height: 90vh; background-color: rgb(62, 66, 66)"
      >
      </canvas>
    </BaseOverlay>
    <BaseOverlay v-else :overlay="overlay" @play-video="playVideo()">
      <canvas
        :id="`myCanvas-${canvasID}`"
        style="width: 100%; height: 100%; background-color: rgb(62, 66, 66)"
      >
      </canvas>
    </BaseOverlay>
  </div>
</template>

<script>
  import BaseOverlay from "@/components/BaseOverlay.vue"
  import {mapState} from 'vuex'
  import DrawMethods from '@/mixins/DrawMethods'
  import db from '@/database.js'

  export default {
    props: {
      strokes: Array,
      autoplay: Boolean,
      height: String,
      isFullscreen: {
        type: Boolean,
        default: true
      },
      canvasID: {
        type: String,
        default: "1"
      },
      thumbnail: String,
      whiteboardID: String,
    },

    components: {
      BaseOverlay
    },

    mixins: [DrawMethods],

    watch: {
      strokes: {
        handler: 'initData',
        immediate: true,
      },

      allStrokes() {
        if (this.playProgress) {
          clearInterval(this.playProgress);
          this.playProgress = null;
          console.log('terminated playProgress()');
        }
      }
    },

    computed: {
      ...mapState(['user']),
      author() {
        return {
          name: this.user.displayName,
          uid: this.user.uid
        }
      }
    },

    data() {
      return {
        overlay: true,
        playProgress: null,
        isReplaying: false,
        allStrokes: [],
        timer: null,
        currentTime: 0,
        idx: 0,
        index: 0,
        canvas: null,
        ctx: null,
        lastX: -1,
        lastY: -1,
        redrawTimeout: null,
        interval: null
      }
    },

    mounted() {
      this.canvas = document.getElementById(`myCanvas-${this.canvasID}`);
      this.ctx = this.canvas.getContext('2d');

      if (this.autoplay) {
        this.rescaleCanvas(false);
        setTimeout(this.quickplay, 1000);
      } else {
        this.rescaleCanvas(); // should rename to rescale and redraw
      }

      // Rescale canvas on window resize.
      window.addEventListener('resize', this.rescaleCanvas, false);
    },

    beforeDestroy() {
      // clean up everything - needs testing
      if (this.playProgress) {
        clearInterval(this.playProgress);
      }
    },

    methods: {
      startVideo() {
        this.$emit('play-video');
        this.overlay = false;
      },

      async playVideo() {
        this.overlay = false;
        await this.quickplay();
        this.overlay = true;
      },

      async initData() {
        // Do not process unless strokes are loaded.
        if (this.strokes.length === 0) {
          return;
        }

        // Initialize data.
        this.indexOfNextStroke = 0;
        this.allStrokes = this.strokes;

        // Migration for videos without thumbnails.
        // TODO(bobbyluig): Remove this after migration is complete.
        if (!this.thumbnail) {
          this.drawStrokesInstantly();
          const videoThumbnail = this.canvas.toDataURL();
          const videoEntity = await db.collection('whiteboards').doc(this.whiteboardID).get();
          const metadata = videoEntity.data();
          metadata.thumbnail = videoThumbnail;
          await db.collection('whiteboards').doc(this.whiteboardID).update(metadata);
        }

        // Emit event.
        this.$emit('animation-loaded');

        // The context could already be loaded. This can happen during development.
        if (this.ctx) {
          // Wipe previous drawings.
          // this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          // this.rescaleCanvas();
        }
      }
    }
  }
</script>


