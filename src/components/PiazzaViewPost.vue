<!-- Given a post, display its text and its blackboard -->
<template>
  <div id="view-post">
    <v-textarea
      class="pa-2"
      readonly
      name="input-7-4"
      :value="post.description"
    />
    <v-container>
        <Tags
            :items="post.postTags"
            :removable="false" 
        >
        </Tags>
    </v-container>
    <RenderlessFetchStrokes :whiteboardID="post.blackboardID" :hasSubcollection="false">
      <template slot-scope="{ strokes }">
        <!-- length check is necessary because a length 0 array does not necessarily === [] (TODO: investigate why) -->
        <DoodleVideo 
          v-if="strokes.length !== 0"
          :strokes="strokes"
          :canvasID="`${postNumber}`"
          :audioURL="post.audioURL"
          :height="`${getFullWidth() * 9/16}`"
          @animation-loaded="hasFetchedVideos = true"
        />
      </template>
    </RenderlessFetchStrokes>
  </div>
</template>

<script>
import DoodleVideo from "@/components/DoodleVideo.vue"
import RenderlessFetchStrokes from "@/components/RenderlessFetchStrokes.vue"
import db from "@/database.js";

export default {
  props: {
    post: Object,
    postNumber: Number,
    postType: String
  },
  components: {
    DoodleVideo,
    RenderlessFetchStrokes
  },
  data () {
    return {
    video: null
    }
  },
  created () {
    // this.fetchVideo();
  },
  methods: {
    getFullWidth () {
      console.log("post: ", this.post)
      // sidenav's width = 200, BaseList's width = 300 
      return window.innerWidth - 500 
    },
    initVideo () {
      
      const doodleVideo = this.$refs.DoodleVideo
      // const animation = doodleVideo.$refs["animation"]
      // animation.drawStrokesInstantly()
      doodleVideo.resizeVideo();
      console.log("inititalized video")
    }
    // async fetchVideo () {
    //   const videoRef = db.collection("whiteboards").doc(this.post.videoID);
    //   let video = await videoRef.get();
    //   this.video = video.data();
    //   console.log("thumbnail: ", this.video.thumbnail)
    // }
    /// we need to figure out how to get thumbnail into this
  }
}
</script>
<style>
.post-title {
    line-height: 1.3;
    font-size: 1.1em;
    font-weight: 500;
    margin-bottom: 15px;
}
.image-container img {
  max-width: 100%
}
.post-footer {
  background: #f9f9f9;
  text-align: right;
}
</style>