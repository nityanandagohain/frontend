<template>
  <div style="height: 100%">
    <BaseOverlay v-if="isFullscreen" :overlay="overlay" @play-video="startVideo()">
      <canvas
        v-if="isFullscreen"
        :id="`myCanvas-${canvasID}`"
        style="width: 100%; height: 90vh; background-color: rgb(62, 66, 66)"
      ></canvas>
    </BaseOverlay>
    <!-- <BaseOverlay v-else :overlay="false" @play-video="playVideo()"> -->
    <canvas
      v-else
      :id="`myCanvas-${canvasID}`"
      style="width: 100%; height: 100%; background-color: rgb(62, 66, 66)"
    ></canvas>
    <!-- </BaseOverlay> -->
  </div>
</template>

<script>
import BaseOverlay from "@/components/BaseOverlay.vue";
import { mapState } from "vuex";
import DrawMethods from "@/mixins/DrawMethods";
import db from "@/database.js";

export default {
  props: {
    strokes: Array,
    autoplay: Boolean,
    height: String,
    // overlay: Boolean,
    isFullscreen: {
      type: Boolean,
      default: true
    },
    canvasID: {
      type: String,
      default: "1"
    }
  },
  components: {
    BaseOverlay
  },
  mixins: [DrawMethods],
  computed: {
    ...mapState(["user"]),
    author() {
      return {
        name: this.user.displayName,
        uid: this.user.uid
      };
    }
  },
  data() {
    return {
      isReplaying: false,
      allStrokes: [],
      overlay: false,
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
    };
  },
  created() {
    this.initData();
  },
  mounted() {
    this.canvas = document.getElementById(`myCanvas-${this.canvasID}`);
    this.ctx = this.canvas.getContext("2d");
    this.canvas.height = this.height;
    this.rescaleCanvas(false);
    if (this.autoplay) setTimeout(this.quickplay, 1000);
    else this.drawStrokesInstantly();
    this.overlay = true;
    window.addEventListener("resize", this.rescaleCanvas, false);
  },
  methods: {
    startVideo() {
      this.$emit("play-video");
      this.overlay = false;
    },
    async quickplayVideo() {
      this.overlay = false;
      await this.quickplay();
      this.overlay = true;
    },
    renderAllStrokes() {
      // TODO: rename "rescaleCanvas"
      this.rescaleCanvas(true);
    },
    async initData() {
      if (!this.strokes) return;
      this.indexOfNextStroke = 0;
      this.allStrokes = this.strokes;
      // if (this.ctx) {
      //   this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      // }
      this.$emit("animation-loaded");
    }
  }
};
</script>


